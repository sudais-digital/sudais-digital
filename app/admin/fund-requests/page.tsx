"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "../../lib/firebase";
import toast from "react-hot-toast";

type FundRequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

type FundRequest = {
  id: string;
  userId: string;
  userEmail: string;
  method: string;
  amount: number;
  currency: string;
  transactionId: string;
  senderName: string;
  senderAccount: string;
  notes: string;
  status: FundRequestStatus;
  createdAt: Timestamp | null;
  approvedAt?: Timestamp | null;
  rejectedAt?: Timestamp | null;
  creditedUSD?: number;
};

const currencyRatesPerUSD: Record<string, number> = {
  USD: 1,
  USDT: 1,
  PKR: 280,
  INR: 86,
  GBP: 0.77,
  EUR: 0.85,
  AED: 3.67,
  SAR: 3.75,
  BDT: 122,
  TRY: 40,
  CAD: 1.37,
  AUD: 1.53,
};

function convertToUSD(
  amount: number,
  currency: string
): number {
  const rate = currencyRatesPerUSD[currency] ?? 1;

  if (rate <= 0) {
    return amount;
  }

  return amount / rate;
}

function formatRequestAmount(
  amount: number,
  currency: string
): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) {
    return "Not available";
  }

  return timestamp.toDate().toLocaleString();
}

export default function AdminFundRequestsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] =
    useState<User | null>(null);

  const [checkingAdmin, setCheckingAdmin] =
    useState(true);

  const [loadingRequests, setLoadingRequests] =
    useState(true);

  const [requests, setRequests] = useState<
    FundRequest[]
  >([]);

  const [creditAmounts, setCreditAmounts] = useState<
    Record<string, string>
  >({});

  const [processingId, setProcessingId] =
    useState("");

  
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        try {
          const adminDocumentReference = doc(
            db,
            "users",
            currentUser.uid
          );

          const adminSnapshot = await runTransaction(
            db,
            async (transaction) => {
              return transaction.get(
                adminDocumentReference
              );
            }
          );

          const role = String(
            adminSnapshot.data()?.role ?? ""
          ).toLowerCase();

          if (
            !adminSnapshot.exists() ||
            role !== "admin"
          ) {
            router.replace("/dashboard");
            return;
          }

          setAdminUser(currentUser);
          setCheckingAdmin(false);
        } catch (error) {
          console.error(
            "Admin verification error:",
            error
          );

          router.replace("/dashboard");
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!adminUser) {
      return;
    }

    const requestsQuery = query(
      collection(db, "fundRequests"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const loadedRequests: FundRequest[] =
          snapshot.docs.map((requestDocument) => {
            const data = requestDocument.data();

            return {
              id: requestDocument.id,
              userId: String(data.userId ?? ""),
              userEmail: String(
                data.userEmail ?? ""
              ),
              method: String(data.method ?? ""),
              amount: Number(data.amount ?? 0),
              currency: String(
                data.currency ?? "USD"
              ),
              transactionId: String(
                data.transactionId ?? ""
              ),
              senderName: String(
                data.senderName ?? ""
              ),
              senderAccount: String(
                data.senderAccount ?? ""
              ),
              notes: String(data.notes ?? ""),
              status: String(
                data.status ?? "Pending"
              ) as FundRequestStatus,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
              approvedAt:
                data.approvedAt instanceof Timestamp
                  ? data.approvedAt
                  : null,
              rejectedAt:
                data.rejectedAt instanceof Timestamp
                  ? data.rejectedAt
                  : null,
              creditedUSD: Number(
                data.creditedUSD ?? 0
              ),
            };
          });

        setRequests(loadedRequests);

        setCreditAmounts((currentAmounts) => {
          const updatedAmounts = {
            ...currentAmounts,
          };

          loadedRequests.forEach((request) => {
            if (
              updatedAmounts[request.id] ===
              undefined
            ) {
              updatedAmounts[request.id] =
                convertToUSD(
                  request.amount,
                  request.currency
                ).toFixed(4);
            }
          });

          return updatedAmounts;
        });

        setLoadingRequests(false);
      },
      (error) => {
        console.error(
          "Fund requests load error:",
          error
        );

        toast.error("Fund requests load nahi ho sakin. Firebase rules check karein.");
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, [adminUser]);

  const pendingCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "Pending"
    ).length;
  }, [requests]);

  const approvedCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "Approved"
    ).length;
  }, [requests]);

  const rejectedCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "Rejected"
    ).length;
  }, [requests]);

  async function approveRequest(
    request: FundRequest
  ) {
    const creditUSD = Number(
      creditAmounts[request.id]
    );

    if (
      !Number.isFinite(creditUSD) ||
      creditUSD <= 0
    ) {
      toast.error("Wallet mein add hone wali valid USD amount enter karein.");
      return;
    }

    const confirmed = window.confirm(
      `${request.userEmail} ke wallet mein $${creditUSD.toFixed(
        4
      )} add karna hai?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(request.id);
      

      await runTransaction(
        db,
        async (transaction) => {
          const requestReference = doc(
            db,
            "fundRequests",
            request.id
          );

          const userReference = doc(
            db,
            "users",
            request.userId
          );

          const requestSnapshot =
            await transaction.get(
              requestReference
            );

          if (!requestSnapshot.exists()) {
            throw new Error(
              "Fund request does not exist."
            );
          }

          const latestRequestData =
            requestSnapshot.data();

          if (
            latestRequestData.status !== "Pending"
          ) {
            throw new Error(
              "This request has already been processed."
            );
          }

          const userSnapshot =
            await transaction.get(userReference);

          if (!userSnapshot.exists()) {
            throw new Error(
              "User document does not exist."
            );
          }

          const currentWallet = Number(
            userSnapshot.data().wallet ?? 0
          );

          const creditedAmountUSD = Number(
            creditUSD.toFixed(4)
          );

          const updatedWallet = Number(
            (currentWallet + creditedAmountUSD).toFixed(4)
          );

          const processedAt = Timestamp.now();

          const walletTransactionReference = doc(
            collection(db, "walletTransactions")
          );

          const notificationReference = doc(
            collection(db, "notifications")
          );

          transaction.update(userReference, {
            wallet: updatedWallet,
            updatedAt: processedAt,
          });

          transaction.set(walletTransactionReference, {
            userId: request.userId,
            userEmail: request.userEmail,

            type: "Credit",
            category: "Deposit",
            status: "Completed",

            amountUSD: creditedAmountUSD,
            balanceBeforeUSD: Number(
              currentWallet.toFixed(4)
            ),
            balanceAfterUSD: updatedWallet,

            originalAmount: request.amount,
            originalCurrency: request.currency,
            paymentMethod: request.method,
            paymentTransactionId:
              request.transactionId,
            fundRequestId: request.id,

            description: `Deposit approved via ${request.method}`,

            createdAt: processedAt,
            createdBy: adminUser?.uid ?? "",
            createdByEmail:
              adminUser?.email ?? "",
          });

          transaction.update(requestReference, {
            status: "Approved",
            creditedUSD: creditedAmountUSD,
            walletTransactionId:
              walletTransactionReference.id,
            approvedAt: processedAt,
            approvedBy: adminUser?.uid ?? "",
            approvedByEmail:
              adminUser?.email ?? "",
          });

          transaction.set(notificationReference, {
            userId: request.userId,
            title: "Deposit Approved",
            message: `$${creditedAmountUSD.toFixed(
              4
            )} USD aapke wallet mein add kar diye gaye hain.`,
            type: "deposit",
            link: "/add-funds",
            read: false,
            fundRequestId: request.id,
            status: "Approved",
            createdAt: processedAt,
          });
        }
      );

      toast.success("Fund request approve ho gayi, wallet update ho gaya aur user ko notification bhej di gayi.");
    } catch (error) {
      console.error(
        "Fund request approval error:",
        error
      );

      toast.error(error instanceof Error ? error.message : "Fund request approve nahi ho saki.");
    } finally {
      setProcessingId("");
    }
  }

  async function rejectRequest(
    request: FundRequest
  ) {
    const confirmed = window.confirm(
      `${request.userEmail} ki fund request reject karni hai?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(request.id);
      

      await runTransaction(
        db,
        async (transaction) => {
          const requestReference = doc(
            db,
            "fundRequests",
            request.id
          );

          const requestSnapshot =
            await transaction.get(
              requestReference
            );

          if (!requestSnapshot.exists()) {
            throw new Error(
              "Fund request does not exist."
            );
          }

          if (
            requestSnapshot.data().status !==
            "Pending"
          ) {
            throw new Error(
              "This request has already been processed."
            );
          }

          const processedAt = Timestamp.now();

          const notificationReference = doc(
            collection(db, "notifications")
          );

          transaction.update(requestReference, {
            status: "Rejected",
            rejectedAt: processedAt,
            rejectedBy: adminUser?.uid ?? "",
            rejectedByEmail:
              adminUser?.email ?? "",
          });

          transaction.set(notificationReference, {
            userId: request.userId,
            title: "Deposit Rejected",
            message: `Aapki ${request.currency} ${request.amount.toLocaleString()} deposit request reject kar di gayi hai. Payment details dobara check karein.`,
            type: "deposit",
            link: "/add-funds",
            read: false,
            fundRequestId: request.id,
            status: "Rejected",
            createdAt: processedAt,
          });
        }
      );

      toast.success("Fund request reject kar di gayi aur user ko notification bhej di gayi.");
    } catch (error) {
      console.error(
        "Fund request rejection error:",
        error
      );

      toast.error(error instanceof Error ? error.message : "Fund request reject nahi ho saki.");
    } finally {
      setProcessingId("");
    }
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          Admin access check ho raha hai...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Fund Requests
            </h1>

            <p className="mt-2 text-gray-600">
              User payments verify karke wallet
              balance update karein.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
          >
            Back to Admin
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Approved
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {loadingRequests ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
              Fund requests load ho rahi hain...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm">
              Abhi koi fund request nahi hai.
            </div>
          ) : (
            requests.map((request) => {
              const isPending =
                request.status === "Pending";

              const isProcessing =
                processingId === request.id;

              return (
                <article
                  key={request.id}
                  className="rounded-2xl bg-white p-5 shadow-sm md:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">
                          {request.userEmail ||
                            "Unknown user"}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            request.status ===
                            "Approved"
                              ? "bg-green-100 text-green-700"
                              : request.status ===
                                  "Rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        Submitted:{" "}
                        {formatDate(
                          request.createdAt
                        )}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-sm text-gray-500">
                        Payment Amount
                      </p>

                      <p className="mt-1 text-2xl font-bold text-blue-700">
                        {formatRequestAmount(
                          request.amount,
                          request.currency
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Payment Method
                      </p>

                      <p className="mt-2 break-words font-medium text-gray-900">
                        {request.method ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Sender Name
                      </p>

                      <p className="mt-2 break-words font-medium text-gray-900">
                        {request.senderName ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Sender Account
                      </p>

                      <p className="mt-2 break-words font-medium text-gray-900">
                        {request.senderAccount ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Transaction ID
                      </p>

                      <p className="mt-2 break-all font-medium text-gray-900">
                        {request.transactionId ||
                          "Not available"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Notes
                      </p>

                      <p className="mt-2 break-words font-medium text-gray-900">
                        {request.notes ||
                          "No notes"}
                      </p>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <label
                        htmlFor={`credit-${request.id}`}
                        className="block font-semibold text-gray-900"
                      >
                        Wallet mein kitne USD add
                        karne hain?
                      </label>

                      <p className="mt-1 text-sm text-gray-600">
                        System ne estimated USD amount
                        fill ki hai. Payment verify
                        karke zarurat par amount correct
                        kar sakte hain.
                      </p>

                      <input
                        id={`credit-${request.id}`}
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={
                          creditAmounts[request.id] ??
                          ""
                        }
                        onChange={(event) =>
                          setCreditAmounts(
                            (currentAmounts) => ({
                              ...currentAmounts,
                              [request.id]:
                                event.target.value,
                            })
                          )
                        }
                        className="mt-4 w-full rounded-lg border border-blue-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-700 sm:max-w-xs"
                      />

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            approveRequest(request)
                          }
                          disabled={isProcessing}
                          className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Approve & Add Wallet"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            rejectRequest(request)
                          }
                          disabled={isProcessing}
                          className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl bg-gray-50 p-4">
                      {request.status ===
                        "Approved" && (
                        <p className="font-medium text-green-700">
                          Wallet credit: $
                          {Number(
                            request.creditedUSD ?? 0
                          ).toFixed(4)}{" "}
                          USD
                        </p>
                      )}

                      {request.status ===
                        "Rejected" && (
                        <p className="font-medium text-red-700">
                          Ye request reject ho chuki
                          hai.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}