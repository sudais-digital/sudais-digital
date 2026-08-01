import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "./firebaseAdmin";

export const REFERRAL_COMMISSION_RATE = 0.05;

export type ReferralRewardResult = {
  rewarded: boolean;
  reason:
    | "rewarded"
    | "already-processed"
    | "order-not-completed"
    | "no-referral"
    | "invalid-order"
    | "invalid-referrer";
  commission: number;
  referrerId?: string;
};

function asNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

/**
 * Gives a one-time referral reward for the referred user's first
 * successfully completed order.
 *
 * Duplicate protection:
 * - orders/{orderId}.referralCommissionProcessed
 * - referrals/{referredUserId}.status === "completed"
 * - deterministic wallet transaction id: referral_{orderId}
 *
 * This function is safe to call repeatedly.
 */
export async function processReferralReward(
  orderId: string
): Promise<ReferralRewardResult> {
  const cleanOrderId = orderId.trim();

  if (!cleanOrderId) {
    return {
      rewarded: false,
      reason: "invalid-order",
      commission: 0,
    };
  }

  return adminDb.runTransaction(async (transaction) => {
    const orderRef = adminDb.collection("orders").doc(cleanOrderId);
    const orderSnapshot = await transaction.get(orderRef);

    if (!orderSnapshot.exists) {
      return {
        rewarded: false,
        reason: "invalid-order",
        commission: 0,
      };
    }

    const orderData = orderSnapshot.data() ?? {};
    const orderStatus = String(orderData.status ?? "")
      .trim()
      .toLowerCase();

    if (orderStatus !== "completed") {
      return {
        rewarded: false,
        reason: "order-not-completed",
        commission: 0,
      };
    }

    if (orderData.referralCommissionProcessed === true) {
      return {
        rewarded: false,
        reason: "already-processed",
        commission: asNumber(orderData.referralCommissionAmount),
        referrerId: String(orderData.referralCommissionReferrerId ?? ""),
      };
    }

    const referredUserId = String(orderData.userId ?? "").trim();
    const orderCharge = asNumber(orderData.charge);

    if (!referredUserId || orderCharge <= 0) {
      transaction.update(orderRef, {
        referralCommissionProcessed: true,
        referralCommissionAmount: 0,
        referralCommissionReason: "invalid-order",
        referralCommissionProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        rewarded: false,
        reason: "invalid-order",
        commission: 0,
      };
    }

    const referralRef = adminDb
      .collection("referrals")
      .doc(referredUserId);

    const referralSnapshot = await transaction.get(referralRef);

    if (!referralSnapshot.exists) {
      transaction.update(orderRef, {
        referralCommissionProcessed: true,
        referralCommissionAmount: 0,
        referralCommissionReason: "no-referral",
        referralCommissionProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        rewarded: false,
        reason: "no-referral",
        commission: 0,
      };
    }

    const referralData = referralSnapshot.data() ?? {};
    const referralStatus = String(referralData.status ?? "pending")
      .trim()
      .toLowerCase();

    const referrerId = String(
      referralData.referrerId ?? ""
    ).trim();

    if (!referrerId || referrerId === referredUserId) {
      transaction.update(orderRef, {
        referralCommissionProcessed: true,
        referralCommissionAmount: 0,
        referralCommissionReason: "invalid-referrer",
        referralCommissionProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        rewarded: false,
        reason: "invalid-referrer",
        commission: 0,
      };
    }

    // Only the first completed order earns commission.
    if (referralStatus === "completed") {
      transaction.update(orderRef, {
        referralCommissionProcessed: true,
        referralCommissionAmount: 0,
        referralCommissionReason: "already-processed",
        referralCommissionProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        rewarded: false,
        reason: "already-processed",
        commission: 0,
        referrerId,
      };
    }

    const referrerRef = adminDb
      .collection("users")
      .doc(referrerId);

    const referrerSnapshot = await transaction.get(referrerRef);

    if (!referrerSnapshot.exists) {
      transaction.update(orderRef, {
        referralCommissionProcessed: true,
        referralCommissionAmount: 0,
        referralCommissionReason: "invalid-referrer",
        referralCommissionProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        rewarded: false,
        reason: "invalid-referrer",
        commission: 0,
        referrerId,
      };
    }

    const referrerData = referrerSnapshot.data() ?? {};
    const commission = Number(
      (orderCharge * REFERRAL_COMMISSION_RATE).toFixed(6)
    );

    const currentWallet = asNumber(
      referrerData.wallet ??
        referrerData.walletBalance ??
        referrerData.balance
    );

    const currentReferralEarnings = asNumber(
      referrerData.referralEarnings ??
        referrerData.referralBalance
    );

    const transactionRef = adminDb
      .collection("walletTransactions")
      .doc(`referral_${cleanOrderId}`);

    transaction.update(referrerRef, {
      wallet: currentWallet + commission,
      walletBalance: currentWallet + commission,
      referralBalance: currentReferralEarnings + commission,
      referralEarnings: currentReferralEarnings + commission,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(referralRef, {
      status: "completed",
      totalEarned: commission,
      pendingCommission: 0,
      rewardedOrderId: cleanOrderId,
      commissionRate: REFERRAL_COMMISSION_RATE,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(transactionRef, {
      id: transactionRef.id,
      userId: referrerId,
      type: "referral_commission",
      direction: "credit",
      amount: commission,
      currency: String(orderData.currency ?? "USD"),
      status: "Completed",
      description: `Referral commission from order ${cleanOrderId}`,
      orderId: cleanOrderId,
      referredUserId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(orderRef, {
      referralCommissionProcessed: true,
      referralCommissionAmount: commission,
      referralCommissionRate: REFERRAL_COMMISSION_RATE,
      referralCommissionReferrerId: referrerId,
      referralCommissionReason: "rewarded",
      referralCommissionProcessedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      rewarded: true,
      reason: "rewarded",
      commission,
      referrerId,
    };
  });
}