import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";
import {
  createProviderOrder,
  getProviderServiceRate,
} from "../../../lib/providers/onespin";

type CreateOrderBody = {
  serviceId?: string;
  link?: string;
  quantity?: number | string;
  quality?: string;
  speed?: string;
};

type WalletField = "wallet";

function getWalletInformation(
  userData: Record<string, unknown>
): {
  field: WalletField;
  balance: number;
} {
  const wallet = userData.wallet;

  if (typeof wallet === "number" && Number.isFinite(wallet)) {
    return {
      field: "wallet",
      balance: wallet,
    };
  }

  return {
    field: "wallet",
    balance: 0,
  };
}

function roundMoney(value: number): number {
  return Number(value.toFixed(4));
}

function roundRate(value: number): number {
  return Number(value.toFixed(6));
}

const MINIMUM_PROFIT_PERCENT = 10;

function getSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Order create nahi ho saka.";
  }

  const message = error.message.trim();

  if (!message) {
    return "Order create nahi ho saka.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  let reservedOrderId: string | null = null;
  let reservedUserId: string | null = null;
  let reservedCharge = 0;
  let reservedWalletField: WalletField | null = null;

  try {
    /*
     * 1. Firebase authorization token check
     */
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          message: "Login authorization token missing hai.",
          code: "AUTH_TOKEN_MISSING",
        },
        { status: 401 }
      );
    }

    const idToken = authorization.slice(7).trim();

    if (!idToken) {
      return NextResponse.json(
        {
          message: "Invalid authorization token.",
          code: "INVALID_AUTH_TOKEN",
        },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    /*
     * 2. Request body read aur validate
     */
    const body = (await request.json()) as CreateOrderBody;

    const serviceId = String(body.serviceId ?? "").trim();
    const link = String(body.link ?? "").trim();
    const quantity = Number(body.quantity);
    const quality = String(body.quality ?? "Standard").trim();
    const speed = String(body.speed ?? "Normal").trim();

    if (!serviceId) {
      return NextResponse.json(
        {
          message: "Service select karein.",
          code: "SERVICE_ID_MISSING",
        },
        { status: 400 }
      );
    }

    if (!link) {
      return NextResponse.json(
        {
          message: "Order link enter karein.",
          code: "LINK_MISSING",
        },
        { status: 400 }
      );
    }

    if (link.length > 2000) {
      return NextResponse.json(
        {
          message: "Order link bohat lamba hai.",
          code: "LINK_TOO_LONG",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        {
          message: "Valid quantity enter karein.",
          code: "INVALID_QUANTITY",
        },
        { status: 400 }
      );
    }

    /*
     * 3. Firestore se service read
     */
    const serviceReference = adminDb
      .collection("services")
      .doc(serviceId);

    const serviceSnapshot = await serviceReference.get();

    if (!serviceSnapshot.exists) {
      return NextResponse.json(
        {
          message: "Selected service nahi mili.",
          code: "SERVICE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const service = serviceSnapshot.data() ?? {};

    if (service.active === false) {
      return NextResponse.json(
        {
          message: "Selected service filhal inactive hai.",
          code: "SERVICE_INACTIVE",
        },
        { status: 400 }
      );
    }

    const serviceName = String(service.name ?? "").trim();
    const platform = String(service.platform ?? "Other").trim();
    const category = String(service.category ?? "").trim();

    const minimumQuantity = Number(service.minQuantity);
    const maximumQuantity = Number(service.maxQuantity);
    const sellingRatePer1000 = Number(service.ratePer1000);

    const providerId = String(service.providerId ?? "").trim();
    const providerServiceId = String(
      service.providerServiceId ?? ""
    ).trim();

    const providerRatePer1000 = Number(
      service.providerRatePer1000 ?? 0
    );

    const currency = String(service.currency ?? "USD")
      .trim()
      .toUpperCase();

    if (!serviceName) {
      return NextResponse.json(
        {
          message: "Service ka name missing hai.",
          code: "INVALID_SERVICE_DATA",
        },
        { status: 500 }
      );
    }

    if (
      !Number.isFinite(minimumQuantity) ||
      !Number.isFinite(maximumQuantity) ||
      minimumQuantity < 1 ||
      maximumQuantity < minimumQuantity
    ) {
      return NextResponse.json(
        {
          message: "Service quantity settings invalid hain.",
          code: "INVALID_SERVICE_LIMITS",
        },
        { status: 500 }
      );
    }

    if (quantity < minimumQuantity) {
      return NextResponse.json(
        {
          message: `Minimum quantity ${minimumQuantity} hai.`,
          code: "QUANTITY_BELOW_MINIMUM",
          minimumQuantity,
        },
        { status: 400 }
      );
    }

    if (quantity > maximumQuantity) {
      return NextResponse.json(
        {
          message: `Maximum quantity ${maximumQuantity} hai.`,
          code: "QUANTITY_ABOVE_MAXIMUM",
          maximumQuantity,
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(sellingRatePer1000) ||
      sellingRatePer1000 < 0
    ) {
      return NextResponse.json(
        {
          message: "Service selling rate invalid hai.",
          code: "INVALID_SERVICE_RATE",
        },
        { status: 500 }
      );
    }

    if (!providerId || !providerServiceId) {
      return NextResponse.json(
        {
          message: "Service ke provider details missing hain.",
          code: "PROVIDER_DETAILS_MISSING",
        },
        { status: 500 }
      );
    }

    /*
     * 4. Provider document read
     */
    const providerReference = adminDb
      .collection("providers")
      .doc(providerId);

    const providerSnapshot = await providerReference.get();

    if (!providerSnapshot.exists) {
      return NextResponse.json(
        {
          message: "Service provider nahi mila.",
          code: "PROVIDER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const provider = providerSnapshot.data() ?? {};

    if (provider.active === false) {
      return NextResponse.json(
        {
          message: "Service provider filhal inactive hai.",
          code: "PROVIDER_INACTIVE",
        },
        { status: 400 }
      );
    }

    const providerName = String(
      provider.name ?? "Provider"
    ).trim();

    const apiUrl = String(provider.apiUrl ?? "").trim();
    const apiKeyEnvName = String(
      provider.apiKeyEnvName ?? ""
    ).trim();

    if (!apiUrl || !apiKeyEnvName) {
      return NextResponse.json(
        {
          message: "Provider API configuration incomplete hai.",
          code: "PROVIDER_CONFIG_MISSING",
        },
        { status: 500 }
      );
    }

    const apiKey = process.env[apiKeyEnvName];

    if (!apiKey) {
      console.error(
        `Provider API key environment variable missing: ${apiKeyEnvName}`
      );

      return NextResponse.json(
        {
          message: "Provider API key server par configure nahi hai.",
          code: "PROVIDER_API_KEY_MISSING",
        },
        { status: 500 }
      );
    }

    /*
     * 5. Provider se latest service rate check
     *
     * Firestore ka purana rate trust nahi kiya ja raha.
     * Provider ka configured markup use hoga, lekin minimum 10% rahega.
     */
    const configuredProfitPercent = Number(
      provider.defaultProfitPercent ?? MINIMUM_PROFIT_PERCENT
    );

    const appliedProfitPercent =
      Number.isFinite(configuredProfitPercent) &&
      configuredProfitPercent >= MINIMUM_PROFIT_PERCENT
        ? configuredProfitPercent
        : MINIMUM_PROFIT_PERCENT;

    let latestProviderRatePer1000: number;

    try {
      const latestProviderService =
        await getProviderServiceRate({
          apiUrl,
          apiKey,
          service: providerServiceId,
        });

      latestProviderRatePer1000 =
        latestProviderService.ratePer1000;
    } catch (rateError) {
      console.error(
        "Latest provider service rate check error:",
        rateError
      );

      return NextResponse.json(
        {
          message:
            "Provider ka latest rate check nahi ho saka. Thori dair baad dobara try karein.",
          code: "PROVIDER_RATE_CHECK_FAILED",
        },
        { status: 503 }
      );
    }

    const latestSellingRatePer1000 = roundRate(
      latestProviderRatePer1000 *
        (1 + appliedProfitPercent / 100)
    );

    const latestCharge = roundMoney(
      (latestSellingRatePer1000 * quantity) / 1000
    );

    const latestProviderCost = roundMoney(
      (latestProviderRatePer1000 * quantity) / 1000
    );

    const latestProfit = roundMoney(
      latestCharge - latestProviderCost
    );

    if (
      !Number.isFinite(latestCharge) ||
      latestCharge < 0 ||
      !Number.isFinite(latestProviderCost) ||
      latestProviderCost < 0
    ) {
      return NextResponse.json(
        {
          message: "Latest order price calculate nahi ho saka.",
          code: "INVALID_LATEST_ORDER_PRICE",
        },
        { status: 500 }
      );
    }

    const savedRateChanged =
      Math.abs(
        latestSellingRatePer1000 - sellingRatePer1000
      ) > 0.0000005 ||
      Math.abs(
        latestProviderRatePer1000 - providerRatePer1000
      ) > 0.0000005;

    if (savedRateChanged) {
      await serviceReference.update({
        providerRatePer1000: roundRate(
          latestProviderRatePer1000
        ),
        ratePer1000: latestSellingRatePer1000,
        profitPercent: appliedProfitPercent,
        latestRateCheckedAt:
          FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          message:
            "Service ki price update ho gayi hai. Page refresh karke naya price check karein, phir order dobara submit karein.",
          code: "SERVICE_PRICE_UPDATED",
          oldRatePer1000: sellingRatePer1000,
          newRatePer1000: latestSellingRatePer1000,
          newCharge: latestCharge,
          currency,
          profitPercent: appliedProfitPercent,
        },
        { status: 409 }
      );
    }

    const charge = latestCharge;
    const providerCost = latestProviderCost;
    const profit = latestProfit;

    /*
     * 6. Internal order reference pehle create
     */
    const orderReference = adminDb.collection("orders").doc();

    reservedOrderId = orderReference.id;
    reservedUserId = userId;
    reservedCharge = charge;

    const userReference = adminDb.collection("users").doc(userId);

    /*
     * 7. Firestore transaction:
     * USD wallet check, amount reserve aur internal order create
     */
    await adminDb.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userReference);

      if (!userSnapshot.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const userData = userSnapshot.data() ?? {};
      const walletInformation = getWalletInformation(userData);

      reservedWalletField = walletInformation.field;

      const walletBefore = walletInformation.balance;
      const walletAfter = roundMoney(walletBefore - charge);

      if (!Number.isFinite(walletBefore)) {
        throw new Error("INVALID_WALLET_BALANCE");
      }

      if (walletBefore < charge) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      transaction.update(userReference, {
        [walletInformation.field]: walletAfter,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(orderReference, {
        userId,
        userEmail:
          decodedToken.email ??
          String(userData.email ?? "").trim(),

        serviceId,
        service: serviceName,
        platform,
        category,

        providerId,
        providerName,
        providerServiceId,
        providerOrderId: null,

        link,
        quantity,

        ratePer1000: latestSellingRatePer1000,
        providerRatePer1000: roundRate(
          latestProviderRatePer1000
        ),
        profitPercent: appliedProfitPercent,
        charge,
        providerCost,
        profit,
        currency,

        quality,
        speed,
        guarantee: String(
          service.refill ?? "No Refill"
        ),

        status: "Pending Submission",
        providerStatus: "Waiting",
        paymentStatus: "Paid",
        submissionAttempts: 0,
        lastSubmissionError: null,

        walletField: walletInformation.field,
        walletBefore,
        walletAfter,

        failureReason: null,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    /*
     * 8. OneSpinPanel ko actual order send
     *
     * Provider fail ho to user ka wallet refund nahi hoga.
     * Order Pending Submission mein safe rahega.
     */
    let providerOrderId: string;

    try {
      const providerResult = await createProviderOrder({
        apiUrl,
        apiKey,
        service: providerServiceId,
        link,
        quantity,
      });

      providerOrderId = providerResult.providerOrderId;
    } catch (providerError) {
      const providerErrorMessage =
        getSafeErrorMessage(providerError);

      await orderReference.update({
        status: "Pending Submission",
        providerStatus: "Waiting",
        paymentStatus: "Paid",
        submissionAttempts: FieldValue.increment(1),
        lastSubmissionError: providerErrorMessage,
        lastSubmissionAttemptAt:
          FieldValue.serverTimestamp(),
        failureReason: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      reservedCharge = 0;

      return NextResponse.json(
        {
          message:
            "Order receive ho gaya hai aur processing queue mein hai.",
          code: "ORDER_QUEUED_FOR_PROVIDER",
          orderId: orderReference.id,
          providerOrderId: null,
          status: "Pending Submission",
          charge,
          currency,
        },
        { status: 201 }
      );
    }

    /*
     * 9. Provider success:
     * Provider Order ID aur final status save
     */
    await orderReference.update({
      providerOrderId,
      status: "Processing",
      providerStatus: "Pending",
      paymentStatus: "Paid",
      submissionAttempts: FieldValue.increment(1),
      lastSubmissionError: null,
      lastSubmissionAttemptAt: FieldValue.serverTimestamp(),
      submittedToProviderAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    reservedCharge = 0;

    return NextResponse.json(
      {
        message: "Order successfully place ho gaya.",
        orderId: orderReference.id,
        providerOrderId,
        status: "Processing",
        charge,
        currency,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create automatic order error:", error);

    const errorMessage = getSafeErrorMessage(error);

    if (errorMessage === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          message: "Aapke wallet mein balance kam hai. Pehle funds add karein.",
          code: "INSUFFICIENT_BALANCE",
        },
        { status: 400 }
      );
    }

    if (errorMessage === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          message: "User account nahi mila.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (errorMessage === "INVALID_WALLET_BALANCE") {
      return NextResponse.json(
        {
          message: "Wallet balance invalid hai.",
          code: "INVALID_WALLET_BALANCE",
        },
        { status: 500 }
      );
    }

    /*
     * Safety logging:
     * Agar wallet reserve hone ke baad unexpected error aaye.
     */
    if (
      reservedOrderId &&
      reservedUserId &&
      reservedCharge > 0
    ) {
      console.error("Order needs manual review:", {
        orderId: reservedOrderId,
        userId: reservedUserId,
        charge: reservedCharge,
        walletField: reservedWalletField,
      });
    }

    return NextResponse.json(
      {
        message:
          "Order process karte waqt server error aa gaya.",
        code: "ORDER_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}