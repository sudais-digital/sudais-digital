import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  type DocumentData,
} from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import { createProviderOrder } from "../../../lib/providers/onespin";

type ProviderConfig = {
  apiUrl: string;
  apiKey: string;
};

function getSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Provider ko order submit nahi ho saka.";
  }

  return (
    error.message.trim() ||
    "Provider ko order submit nahi ho saka."
  );
}

async function verifyAdmin(request: NextRequest): Promise<void> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  const idToken = authorization.slice(7).trim();

  if (!idToken) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  const decodedToken = await adminAuth.verifyIdToken(idToken);

  const adminSnapshot = await adminDb
    .collection("users")
    .doc(decodedToken.uid)
    .get();

  if (
    !adminSnapshot.exists ||
    adminSnapshot.data()?.role !== "admin"
  ) {
    throw new Error("ADMIN_ACCESS_REQUIRED");
  }
}

async function loadProvider(
  providerId: string
): Promise<ProviderConfig> {
  const providerSnapshot = await adminDb
    .collection("providers")
    .doc(providerId)
    .get();

  if (!providerSnapshot.exists) {
    throw new Error("Provider nahi mila.");
  }

  const provider = providerSnapshot.data() ?? {};

  if (provider.active === false) {
    throw new Error("Provider inactive hai.");
  }

  const apiUrl = String(provider.apiUrl ?? "").trim();

  const apiKeyEnvName = String(
    provider.apiKeyEnvName ?? ""
  ).trim();

  const apiKey = process.env[apiKeyEnvName];

  if (!apiUrl || !apiKeyEnvName || !apiKey) {
    throw new Error(
      "Provider API configuration incomplete hai."
    );
  }

  return {
    apiUrl,
    apiKey,
  };
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    /*
     * Ek click mein maximum 50 pending orders
     * process kiye jayenge.
     */
    const pendingSnapshot = await adminDb
      .collection("orders")
      .where("status", "==", "Pending Submission")
      .limit(50)
      .get();

    if (pendingSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "Koi pending submission order nahi mila.",
        checked: 0,
        submitted: 0,
        failed: 0,
        skipped: 0,
      });
    }

    let checked = 0;
    let submitted = 0;
    let failed = 0;
    let skipped = 0;

    /*
     * Orders sequentially process honge.
     * Is se duplicate submissions aur provider
     * rate-limit ka risk kam hota hai.
     */
    for (const pendingDocument of pendingSnapshot.docs) {
      checked += 1;

      const orderReference = pendingDocument.ref;

      try {
        /*
         * Transaction order ko claim karti hai.
         *
         * Agar order valid queue order hai to uska
         * latest data return hota hai.
         *
         * Agar kisi aur request ne order claim kar liya
         * ho to null return hota hai.
         */
        const claimedOrder =
          await adminDb.runTransaction<DocumentData | null>(
            async (transaction) => {
              const latestSnapshot =
                await transaction.get(orderReference);

              if (!latestSnapshot.exists) {
                return null;
              }

              const latestOrder =
                latestSnapshot.data() ?? {};

              const status = String(
                latestOrder.status ?? ""
              );

              const providerOrderId = String(
                latestOrder.providerOrderId ?? ""
              ).trim();

              const paymentStatus = String(
                latestOrder.paymentStatus ?? "Paid"
              );

              if (
                status !== "Pending Submission" ||
                providerOrderId ||
                paymentStatus !== "Paid"
              ) {
                return null;
              }

              transaction.update(orderReference, {
                status: "Submitting to Provider",
                providerStatus: "Submitting",
                submissionAttempts:
                  FieldValue.increment(1),
                lastSubmissionAttemptAt:
                  FieldValue.serverTimestamp(),
                lastSubmissionError: null,
                updatedAt:
                  FieldValue.serverTimestamp(),
              });

              return latestOrder;
            }
          );

        /*
         * Order valid nahi tha ya kisi aur request ne
         * pehle claim kar liya.
         */
        if (!claimedOrder) {
          skipped += 1;
          continue;
        }

        const providerId = String(
          claimedOrder.providerId ?? ""
        ).trim();

        const providerServiceId = String(
          claimedOrder.providerServiceId ?? ""
        ).trim();

        const link = String(
          claimedOrder.link ?? ""
        ).trim();

        const quantity = Number(
          claimedOrder.quantity
        );

        if (
          !providerId ||
          !providerServiceId ||
          !link ||
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            "Order ki provider details incomplete hain."
          );
        }

        const provider = await loadProvider(providerId);

        const providerResult =
          await createProviderOrder({
            apiUrl: provider.apiUrl,
            apiKey: provider.apiKey,
            service: providerServiceId,
            link,
            quantity,
          });

        await orderReference.update({
          providerOrderId:
            providerResult.providerOrderId,

          status: "Processing",
          providerStatus: "Pending",
          paymentStatus: "Paid",

          lastSubmissionError: null,
          failureReason: null,

          submittedToProviderAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),
        });

        submitted += 1;
      } catch (error) {
        failed += 1;

        const errorMessage =
          getSafeErrorMessage(error);

        console.error(
          `Pending order ${pendingDocument.id} submit error:`,
          error
        );

        /*
         * Provider fail hone par:
         *
         * - Order queue mein wapas rahega
         * - Wallet refund nahi hoga
         * - Admin baad mein dobara submit kar sakega
         */
        try {
          await orderReference.update({
            status: "Pending Submission",
            providerStatus: "Waiting",
            paymentStatus: "Paid",
            lastSubmissionError: errorMessage,
            failureReason: errorMessage,
            updatedAt:
              FieldValue.serverTimestamp(),
          });
        } catch (updateError) {
          console.error(
            `Pending order ${pendingDocument.id} queue restore error:`,
            updateError
          );
        }
      }
    }

    return NextResponse.json({
      success: true,

      message:
        `${submitted} order provider ko submit hue, ` +
        `${failed} queue mein rahe, aur ` +
        `${skipped} skip hue.`,

      checked,
      submitted,
      failed,
      skipped,
    });
  } catch (error) {
    const errorMessage =
      getSafeErrorMessage(error);

    if (errorMessage === "AUTH_TOKEN_MISSING") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin login token nahi mila.",
        },
        { status: 401 }
      );
    }

    if (errorMessage === "ADMIN_ACCESS_REQUIRED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sirf admin pending orders submit kar sakta hai.",
        },
        { status: 403 }
      );
    }

    console.error(
      "Submit pending orders route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Pending orders process karte waqt server error aa gaya.",
      },
      { status: 500 }
    );
  }
}