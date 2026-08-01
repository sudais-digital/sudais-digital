import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "../../../../lib/firebaseAdmin";
import { processReferralReward } from "../../../../lib/processReferralReward";

const ALLOWED_STATUSES = new Set([
  "Pending Submission",
  "Pending",
  "Processing",
  "Completed",
  "Partial",
  "Cancelled",
  "Refunded",
]);

type RequestBody = {
  orderId?: unknown;
  status?: unknown;
};

type OrderStatusNotification = {
  title: string;
  message: string;
  type: "order";
  link: string;
};

function unauthorizedResponse(message: string) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 401 }
  );
}

function getOrderStatusNotification(
  status: string,
  orderId: string
): OrderStatusNotification {
  const shortOrderId =
    orderId.length > 12
      ? `${orderId.slice(0, 12)}...`
      : orderId;

  switch (status) {
    case "Pending Submission":
      return {
        title: "Order Pending Submission",
        message: `Aapka order #${shortOrderId} provider ko submit hone ka wait kar raha hai.`,
        type: "order",
        link: "/my-orders",
      };

    case "Pending":
      return {
        title: "Order Pending",
        message: `Aapka order #${shortOrderId} pending status mein hai.`,
        type: "order",
        link: "/my-orders",
      };

    case "Processing":
      return {
        title: "Order Processing",
        message: `Aapke order #${shortOrderId} par kaam shuru ho gaya hai.`,
        type: "order",
        link: "/my-orders",
      };

    case "Completed":
      return {
        title: "Order Completed",
        message: `Aapka order #${shortOrderId} successfully complete ho gaya hai.`,
        type: "order",
        link: "/my-orders",
      };

    case "Partial":
      return {
        title: "Order Partially Completed",
        message: `Aapka order #${shortOrderId} partial complete hua hai. Details My Orders mein check karein.`,
        type: "order",
        link: "/my-orders",
      };

    case "Cancelled":
      return {
        title: "Order Cancelled",
        message: `Aapka order #${shortOrderId} cancel kar diya gaya hai.`,
        type: "order",
        link: "/my-orders",
      };

    case "Refunded":
      return {
        title: "Order Refunded",
        message: `Aapke order #${shortOrderId} ka refund process kar diya gaya hai.`,
        type: "order",
        link: "/my-orders",
      };

    default:
      return {
        title: "Order Updated",
        message: `Aapke order #${shortOrderId} ka status update hua hai.`,
        type: "order",
        link: "/my-orders",
      };
  }
}

export async function POST(request: Request) {
  try {
    const authorizationHeader =
      request.headers.get("authorization");

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return unauthorizedResponse(
        "Admin login token nahi mila."
      );
    }

    const idToken = authorizationHeader
      .slice("Bearer ".length)
      .trim();

    if (!idToken) {
      return unauthorizedResponse(
        "Admin login token valid nahi hai."
      );
    }

    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(
        idToken,
        true
      );
    } catch (error) {
      console.error(
        "Admin order token verification error:",
        error
      );

      return unauthorizedResponse(
        "Login session expire ya invalid ho chuki hai. Dobara login karein."
      );
    }

    const adminDocument = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    const adminData = adminDocument.data();

    if (
      !adminDocument.exists ||
      adminData?.role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sirf admin order status update kar sakta hai.",
        },
        { status: 403 }
      );
    }

    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Request data valid JSON nahi hai.",
        },
        { status: 400 }
      );
    }

    const orderId = String(body.orderId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (
      !orderId ||
      orderId.length > 200 ||
      orderId.includes("/")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID valid nahi hai.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Order status valid nahi hai.",
        },
        { status: 400 }
      );
    }

    const orderRef = adminDb
      .collection("orders")
      .doc(orderId);

    const transactionResult =
      await adminDb.runTransaction(
        async (transaction) => {
          const orderSnapshot =
            await transaction.get(orderRef);

          if (!orderSnapshot.exists) {
            return {
              found: false as const,
              previousStatus: "",
              statusChanged: false,
            };
          }

          const orderData = orderSnapshot.data();

          const previousStatus = String(
            orderData?.status ?? ""
          ).trim();

          const userId = String(
            orderData?.userId ?? ""
          ).trim();

          const statusChanged =
            previousStatus !== status;

          transaction.update(orderRef, {
            status,
            statusUpdatedBy: decodedToken.uid,
            statusUpdatedByEmail:
              decodedToken.email ??
              adminData?.email ??
              null,
            statusUpdatedAt:
              FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          if (statusChanged && userId) {
            const notification =
              getOrderStatusNotification(
                status,
                orderId
              );

            const notificationRef = adminDb
              .collection("notifications")
              .doc();

            transaction.set(notificationRef, {
              userId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              link: notification.link,
              read: false,
              orderId,
              status,
              createdAt:
                FieldValue.serverTimestamp(),
            });
          }

          return {
            found: true as const,
            previousStatus,
            statusChanged,
          };
        }
      );

    if (!transactionResult.found) {
      return NextResponse.json(
        {
          success: false,
          message: "Order nahi mila.",
        },
        { status: 404 }
      );
    }

    let rewardMessage = "";

    if (
      status === "Completed" &&
      transactionResult.previousStatus !==
        "Completed"
    ) {
      try {
        const rewardResult =
          await processReferralReward(orderId);

        if (rewardResult.rewarded) {
          rewardMessage =
            ` Referral commission $${rewardResult.commission.toFixed(
              4
            )} add ho gayi.`;
        } else if (
          rewardResult.reason === "no-referral"
        ) {
          rewardMessage =
            " Is user ka koi referrer nahi tha.";
        } else if (
          rewardResult.reason ===
          "already-processed"
        ) {
          rewardMessage =
            " Referral commission pehle process ho chuki hai.";
        }
      } catch (rewardError) {
        console.error(
          "Referral reward processing error:",
          rewardError
        );

        rewardMessage =
          " Order complete ho gaya, lekin referral reward process nahi ho saka.";
      }
    }

    const notificationMessage =
      transactionResult.statusChanged
        ? " User ko notification bhi bhej di gayi."
        : " Status pehle se yehi tha, isliye duplicate notification nahi bheji gayi.";

    return NextResponse.json({
      success: true,
      message:
        `Order status "${status}" kar diya gaya.` +
        notificationMessage +
        rewardMessage,
    });
  } catch (error) {
    console.error(
      "Admin order status update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Order status update nahi ho saka. Dobara try karein.",
      },
      { status: 500 }
    );
  }
}