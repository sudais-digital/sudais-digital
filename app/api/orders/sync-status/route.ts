import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import { processReferralReward } from "../../../lib/processReferralReward";
import { getProviderOrderStatus } from "../../../lib/providers/onespin";

type ProviderConfig = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
};

const FINAL_STATUSES = new Set([
  "completed",
  "partial",
  "cancelled",
  "canceled",
  "refunded",
]);

function normalizeStatus(providerStatus: string): string {
  const cleanStatus = providerStatus.trim().toLowerCase();

  if (cleanStatus === "completed") return "Completed";
  if (cleanStatus === "partial") return "Partial";
  if (cleanStatus === "cancelled" || cleanStatus === "canceled") {
    return "Cancelled";
  }
  if (cleanStatus === "processing") return "Processing";
  if (cleanStatus === "in progress" || cleanStatus === "in_progress") {
    return "Processing";
  }
  if (cleanStatus === "pending") return "Pending";
  if (cleanStatus === "refunded") return "Refunded";

  return providerStatus.trim() || "Pending";
}

async function loadProviderFromDocument(
  providerId: string
): Promise<ProviderConfig | null> {
  const snapshot = await adminDb
    .collection("providers")
    .doc(providerId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  const apiUrl = String(data?.apiUrl ?? "").trim();
  const apiKeyEnvName = String(data?.apiKeyEnvName ?? "").trim();
  const apiKey = process.env[apiKeyEnvName];

  if (!apiUrl || !apiKeyEnvName || !apiKey) {
    return null;
  }

  return {
    id: snapshot.id,
    name: String(data?.name ?? "Provider"),
    apiUrl,
    apiKey,
  };
}

async function resolveProvider(
  orderData: FirebaseFirestore.DocumentData
): Promise<ProviderConfig | null> {
  const providerId = String(orderData.providerId ?? "").trim();

  if (providerId) {
    const provider = await loadProviderFromDocument(providerId);

    if (provider) {
      return provider;
    }
  }

  const providerName = String(orderData.providerName ?? "").trim();

  if (providerName) {
    const matchingProviders = await adminDb
      .collection("providers")
      .where("name", "==", providerName)
      .limit(1)
      .get();

    if (!matchingProviders.empty) {
      const provider = await loadProviderFromDocument(
        matchingProviders.docs[0].id
      );

      if (provider) {
        return provider;
      }
    }
  }

  const activeProviders = await adminDb
    .collection("providers")
    .where("active", "==", true)
    .limit(10)
    .get();

  for (const providerDocument of activeProviders.docs) {
    const provider = await loadProviderFromDocument(providerDocument.id);

    if (provider) {
      return provider;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization");

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin login token nahi mila.",
        },
        { status: 401 }
      );
    }

    const idToken = authorizationHeader
      .replace("Bearer ", "")
      .trim();

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const adminDocument = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (
      !adminDocument.exists ||
      adminDocument.data()?.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Sirf admin orders sync kar sakta hai.",
        },
        { status: 403 }
      );
    }

    const ordersSnapshot = await adminDb
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const ordersToSync = ordersSnapshot.docs.filter((orderDocument) => {
      const data = orderDocument.data();
      const providerOrderId = String(
        data.providerOrderId ?? ""
      ).trim();
      const currentStatus = String(data.status ?? "Pending")
        .trim()
        .toLowerCase();

      return (
        providerOrderId !== "" &&
        !FINAL_STATUSES.has(currentStatus)
      );
    });

    let checked = 0;
    let updated = 0;
    let failed = 0;
    let referralRewards = 0;
    const errors: Array<{ orderId: string; message: string }> = [];

    for (const orderDocument of ordersToSync) {
      checked += 1;

      try {
        const orderData = orderDocument.data();
        const providerOrderId = String(
          orderData.providerOrderId
        ).trim();

        const provider = await resolveProvider(orderData);

        if (!provider) {
          throw new Error(
            "Is order ke liye active provider configuration nahi mili."
          );
        }

        const providerResult = await getProviderOrderStatus({
          apiUrl: provider.apiUrl,
          apiKey: provider.apiKey,
          providerOrderId,
        });

        const normalizedStatus = normalizeStatus(
          providerResult.status
        );

        const updateData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> =
          {
            status: normalizedStatus,
            providerStatus: providerResult.status,
            providerId: provider.id,
            providerName: provider.name,
            providerLastSyncedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

        if (providerResult.startCount !== null) {
          updateData.startCount = providerResult.startCount;
        }

        if (providerResult.remains !== null) {
          updateData.remains = providerResult.remains;
        }

        if (providerResult.charge !== null) {
          updateData.providerCharge = providerResult.charge;
        }

        if (providerResult.currency) {
          updateData.providerCurrency = providerResult.currency;
        }

        await orderDocument.ref.update(updateData);

        if (normalizedStatus === "Completed") {
          const rewardResult = await processReferralReward(
            orderDocument.id
          );

          if (rewardResult.rewarded) {
            referralRewards += 1;
          }
        }

        updated += 1;
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : "Unknown sync error";

        errors.push({
          orderId: orderDocument.id,
          message,
        });

        await orderDocument.ref.update({
          providerSyncError: message,
          providerLastSyncFailedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message:
        ordersToSync.length === 0
          ? "Sync ke liye koi active provider order nahi mila."
          : `${checked} orders check hue, ${updated} update hue, ${failed} fail hue aur ${referralRewards} referral rewards add hue.`,
      checked,
      updated,
      failed,
      referralRewards,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error("Order status sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Orders sync nahi ho sake.",
      },
      { status: 500 }
    );
  }
}