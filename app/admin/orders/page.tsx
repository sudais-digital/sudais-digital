"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth, db } from "../../lib/firebase";
import toast from "react-hot-toast";

type Order = {
  id: string;
  userId: string;
  userEmail: string;
  platform: string;
  service: string;
  quality: string;
  guarantee: string;
  speed: string;
  link: string;
  quantity: number;
  charge: number;
  currency: string;
  status: string;
  providerOrderId: string;
  providerStatus: string;
  startCount: number | null;
  remains: number | null;
  providerSyncError: string;
  lastSubmissionError: string;
  submissionAttempts: number;
  createdAt?: Timestamp;
  providerLastSyncedAt?: Timestamp;
};

type SyncResponse = {
  success?: boolean;
  message?: string;
  checked?: number;
  updated?: number;
  failed?: number;
};

type SubmitPendingResponse = {
  success?: boolean;
  message?: string;
  checked?: number;
  submitted?: number;
  failed?: number;
  skipped?: number;
};

const orderStatuses = [
  "Pending Submission",
  "Pending",
  "Processing",
  "Completed",
  "Partial",
  "Cancelled",
  "Refunded",
];

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [submittingPending, setSubmittingPending] = useState(false);
  

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        try {
          const adminDocument = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (
            !adminDocument.exists() ||
            adminDocument.data().role !== "admin"
          ) {
            router.replace("/dashboard");
            return;
          }

          setCheckingAccess(false);

          const ordersQuery = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc")
          );

          unsubscribeOrders = onSnapshot(
            ordersQuery,
            (snapshot) => {
              const allOrders: Order[] = snapshot.docs.map(
                (orderDocument) => {
                  const data = orderDocument.data();

                  return {
                    id: orderDocument.id,
                    userId: String(data.userId ?? ""),
                    userEmail: String(
                      data.userEmail ?? "Unknown user"
                    ),
                    platform: String(data.platform ?? ""),
                    service: String(data.service ?? ""),
                    quality: String(data.quality ?? "Standard"),
                    guarantee: String(
                      data.guarantee ?? "No Refill"
                    ),
                    speed: String(data.speed ?? "Normal"),
                    link: String(data.link ?? ""),
                    quantity: Number(data.quantity ?? 0),
                    charge: Number(data.charge ?? 0),
                    currency: String(data.currency ?? "USD"),
                    status: String(data.status ?? "Pending"),
                    providerOrderId: String(
                      data.providerOrderId ?? ""
                    ),
                    providerStatus: String(
                      data.providerStatus ?? ""
                    ),
                    startCount:
                      data.startCount === null ||
                      data.startCount === undefined
                        ? null
                        : Number(data.startCount),
                    remains:
                      data.remains === null ||
                      data.remains === undefined
                        ? null
                        : Number(data.remains),
                    providerSyncError: String(
                      data.providerSyncError ?? ""
                    ),
                    lastSubmissionError: String(
                      data.lastSubmissionError ?? ""
                    ),
                    submissionAttempts: Number(
                      data.submissionAttempts ?? 0
                    ),
                    createdAt: data.createdAt,
                    providerLastSyncedAt:
                      data.providerLastSyncedAt,
                  };
                }
              );

              setOrders(allOrders);
              setLoadingOrders(false);
            },
            (error) => {
              console.error("Admin orders load error:", error);
              setLoadingOrders(false);
              toast.error("Orders load nahi ho sake.");
            }
          );
        } catch (error) {
          console.error("Admin verification error:", error);
          router.replace("/dashboard");
        }
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeOrders?.();
    };
  }, [router]);

  async function handleSubmitPendingOrders() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error("Admin login dobara karein.");
      return;
    }

    try {
      setSubmittingPending(true);
      

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/orders/submit-pending", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const result =
        (await response.json()) as SubmitPendingResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Pending orders submit nahi ho sake."
        );
      }

      toast.success(result.message ?? "Pending orders provider ko submit ho gaye.");
    } catch (error) {
      console.error("Submit pending orders error:", error);
      toast.error(error instanceof Error ? error.message : "Pending orders submit nahi ho sake.");
    } finally {
      setSubmittingPending(false);
    }
  }

  async function handleSyncOrders() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error("Admin login dobara karein.");
      return;
    }

    try {
      setSyncing(true);
      

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/orders/sync-status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const result = (await response.json()) as SyncResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Orders sync nahi ho sake."
        );
      }

      toast.success(result.message ?? "Orders sync ho gaye.");
    } catch (error) {
      console.error("Sync orders error:", error);
      toast.error(error instanceof Error ? error.message : "Orders sync nahi ho sake.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleStatusChange(
    orderId: string,
    newStatus: string
  ) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      toast.error("Admin login dobara karein.");
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ?? "Order status update nahi ho saka."
        );
      }

      toast.success(result.message ?? `Order status "${newStatus}" kar diya gaya.`);
    } catch (error) {
      console.error("Status update error:", error);
      toast.error(error instanceof Error ? error.message : "Order status update nahi ho saka.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  function formatOrderDate(timestamp?: Timestamp) {
    if (!timestamp) {
      return "Just now";
    }

    return timestamp.toDate().toLocaleString("en-US");
  }

  function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "processing":
      case "in progress":
        return "bg-blue-100 text-blue-700";
      case "submitting to provider":
        return "bg-cyan-100 text-cyan-700";
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-purple-100 text-purple-700";
      case "partial":
        return "bg-orange-100 text-orange-700";
      case "pending submission":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  const pendingSubmissionCount = orders.filter(
    (order) =>
      order.status.toLowerCase() === "pending submission" &&
      !order.providerOrderId
  ).length;

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          Checking admin access...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Orders
            </h1>
            <p className="mt-2 text-gray-600">
              Pending orders provider ko submit karein aur
              OneSpinPanel se latest status sync karein.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSubmitPendingOrders}
              disabled={submittingPending || syncing}
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingPending
                ? "Submitting..."
                : `Submit Pending Orders (${pendingSubmissionCount})`}
            </button>

            <button
              type="button"
              onClick={handleSyncOrders}
              disabled={syncing || submittingPending}
              className="rounded-lg bg-emerald-600 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? "Syncing..." : "Sync All Statuses"}
            </button>

            <Link
              href="/admin"
              className="rounded-lg bg-gray-900 px-5 py-3 text-center font-semibold text-white hover:bg-gray-800"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">
              Pending Submission: {pendingSubmissionCount}
            </p>
            <p className="mt-1">
              Submit Pending Orders button un orders ko provider
              par bhejega jin ka Provider Order ID abhi nahi bana.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Sync All Statuses sirf un orders ko check karega jin
            mein Provider Order ID mojood hai aur status abhi final
            nahi hua.
          </div>
        </div>

        {loadingOrders ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">Orders loading...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              Abhi koi order nahi hai
            </h2>
            <p className="mt-2 text-gray-600">
              User order submit karega to yahan show hoga.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="px-5 py-4 font-semibold">
                      Customer
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Service
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Provider
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Quantity
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Charge
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Current Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Manual Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="text-sm text-gray-700"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold text-gray-900">
                          {order.userEmail}
                        </p>
                        <p className="mt-1 max-w-40 truncate text-xs text-gray-500">
                          {order.userId}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-semibold text-gray-900">
                          {order.platform} — {order.service}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.quality} · {order.guarantee} ·{" "}
                          {order.speed}
                        </p>

                        {order.link && (
                          <a
                            href={order.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Open order link
                          </a>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        {order.providerOrderId ? (
                          <>
                            <p className="font-semibold text-gray-900">
                              #{order.providerOrderId}
                            </p>

                            {order.providerStatus && (
                              <p className="mt-1 text-xs text-gray-500">
                                Provider: {order.providerStatus}
                              </p>
                            )}

                            {order.startCount !== null && (
                              <p className="mt-1 text-xs text-gray-500">
                                Start:{" "}
                                {order.startCount.toLocaleString(
                                  "en-US"
                                )}
                              </p>
                            )}

                            {order.remains !== null && (
                              <p className="mt-1 text-xs text-gray-500">
                                Remains:{" "}
                                {order.remains.toLocaleString(
                                  "en-US"
                                )}
                              </p>
                            )}

                            {order.providerSyncError && (
                              <p className="mt-2 max-w-56 text-xs text-red-600">
                                {order.providerSyncError}
                              </p>
                            )}
                          </>
                        ) : order.status.toLowerCase() ===
                          "pending submission" ? (
                          <>
                            <span className="text-xs font-semibold text-amber-700">
                              Waiting for provider
                            </span>

                            {order.submissionAttempts > 0 && (
                              <p className="mt-1 text-xs text-gray-500">
                                Attempts: {order.submissionAttempts}
                              </p>
                            )}

                            {order.lastSubmissionError && (
                              <p className="mt-2 max-w-56 text-xs text-red-600">
                                {order.lastSubmissionError}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Provider ID not available
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {order.quantity.toLocaleString("en-US")}
                      </td>

                      <td className="px-5 py-5 font-semibold text-gray-900">
                        {order.currency} {order.charge.toFixed(4)}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <select
                          value={order.status}
                          onChange={(event) =>
                            handleStatusChange(
                              order.id,
                              event.target.value
                            )
                          }
                          disabled={
                            updatingOrderId === order.id ||
                            syncing ||
                            submittingPending
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {orderStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingOrderId === order.id && (
                          <p className="mt-2 text-xs text-blue-700">
                            Updating...
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 text-gray-500">
                        {formatOrderDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}