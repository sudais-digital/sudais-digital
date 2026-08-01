"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "../../lib/firebase";

type RequestStatus = "Pending" | "Approved" | "Rejected";

type PremiumRequest = {
  id: string;
  userId: string;
  userEmail: string;
  plan: "Pro" | "Business";
  amountUSD: number;
  durationDays: number;
  paymentMethod: string;
  transactionId: string;
  senderName: string;
  senderAccount: string;
  notes: string;
  status: RequestStatus;
  createdAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  adminId: string | null;
  rejectionReason: string;
};

function formatDate(value: Timestamp | null): string {
  if (!value) {
    return "Processing...";
  }

  return value.toDate().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "rejected") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

function normalizeStatus(value: unknown): RequestStatus {
  const status = String(value ?? "Pending");

  if (status === "Approved" || status === "Rejected") {
    return status;
  }

  return "Pending";
}

function addDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

export default function AdminPremiumRequestsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<"All" | RequestStatus>("Pending");
  const [search, setSearch] = useState("");

  const [processingId, setProcessingId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          const role = userSnapshot.exists()
            ? String(userSnapshot.data().role ?? "user")
            : "user";

          if (role !== "admin") {
            router.replace("/dashboard");
            return;
          }

          setAdminUser(currentUser);
          setCheckingAccess(false);
        } catch (error) {
          console.error("Admin access check error:", error);
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

    setLoadingRequests(true);

    const requestsQuery = query(
      collection(db, "premiumRequests"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const loadedRequests = snapshot.docs.map((requestDocument) => {
          const data = requestDocument.data();

          return {
            id: requestDocument.id,
            userId: String(data.userId ?? ""),
            userEmail: String(data.userEmail ?? ""),
            plan:
              String(data.plan) === "Business"
                ? "Business"
                : "Pro",
            amountUSD: Number(data.amountUSD ?? 0),
            durationDays: Number(data.durationDays ?? 30),
            paymentMethod: String(data.paymentMethod ?? ""),
            transactionId: String(data.transactionId ?? ""),
            senderName: String(data.senderName ?? ""),
            senderAccount: String(data.senderAccount ?? ""),
            notes: String(data.notes ?? ""),
            status: normalizeStatus(data.status),
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt
                : null,
            reviewedAt:
              data.reviewedAt instanceof Timestamp
                ? data.reviewedAt
                : null,
            adminId:
              data.adminId === null ||
              data.adminId === undefined
                ? null
                : String(data.adminId),
            rejectionReason: String(
              data.rejectionReason ?? ""
            ),
          } satisfies PremiumRequest;
        });

        setRequests(loadedRequests);
        setLoadingRequests(false);
      },
      (error) => {
        console.error("Premium requests load error:", error);
        setMessage(
          "Premium requests load nahi ho sakin. Firebase Rules aur index check karein."
        );
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, [adminUser]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(
        (request) => request.status === "Pending"
      ).length,
      approved: requests.filter(
        (request) => request.status === "Approved"
      ).length,
      rejected: requests.filter(
        (request) => request.status === "Rejected"
      ).length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "All" ||
        request.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        request.userEmail
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.userId
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.transactionId
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.senderName
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.paymentMethod
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.plan
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  async function approveRequest(request: PremiumRequest) {
    if (!adminUser || request.status !== "Pending") {
      return;
    }

    const confirmed = window.confirm(
      `${request.userEmail || request.userId} ke liye ${request.plan} membership approve karni hai?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(request.id);
      setMessage("");

      const userReference = doc(
        db,
        "users",
        request.userId
      );
      const requestReference = doc(
        db,
        "premiumRequests",
        request.id
      );

      const userSnapshot = await getDoc(userReference);

      if (!userSnapshot.exists()) {
        setMessage(
          "User document nahi mila. Request approve nahi hui."
        );
        return;
      }

      const userData = userSnapshot.data();
      const now = new Date();

      const currentExpiry =
        userData.membershipExpiryDate instanceof Timestamp
          ? userData.membershipExpiryDate.toDate()
          : null;

      /*
        Renewal rule:
        Agar existing paid membership abhi active hai,
        to 30 days current expiry ke baad add honge.
        Warna membership aaj se start hogi.
      */
      const startBase =
        currentExpiry && currentExpiry > now
          ? currentExpiry
          : now;

      const expiryDate = addDays(
        startBase,
        request.durationDays || 30
      );

      const batch = writeBatch(db);

      batch.update(userReference, {
        membership: request.plan,
        premium: true,
        premiumPlan: request.plan,
        subscriptionStatus: "Active",
        membershipStartDate: Timestamp.fromDate(now),
        membershipExpiryDate:
          Timestamp.fromDate(expiryDate),
        subscriptionUpdatedAt: serverTimestamp(),
      });

      batch.update(requestReference, {
        status: "Approved",
        reviewedAt: serverTimestamp(),
        adminId: adminUser.uid,
        rejectionReason: "",
        membershipStartDate: Timestamp.fromDate(now),
        membershipExpiryDate:
          Timestamp.fromDate(expiryDate),
      });

      await batch.commit();

      setMessage(
        `${request.plan} membership successfully approve ho gayi. Expiry: ${expiryDate.toLocaleDateString(
          "en-US"
        )}`
      );
    } catch (error) {
      console.error("Premium approval error:", error);
      setMessage(
        "Request approve nahi ho saki. Firebase Rules check karein."
      );
    } finally {
      setProcessingId("");
    }
  }

  async function rejectRequest(request: PremiumRequest) {
    if (!adminUser || request.status !== "Pending") {
      return;
    }

    const reason = window.prompt(
      "Reject karne ki wajah likhein (optional):",
      ""
    );

    if (reason === null) {
      return;
    }

    const confirmed = window.confirm(
      `${request.userEmail || request.userId} ki ${request.plan} request reject karni hai?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(request.id);
      setMessage("");

      await updateDoc(
        doc(db, "premiumRequests", request.id),
        {
          status: "Rejected",
          reviewedAt: serverTimestamp(),
          adminId: adminUser.uid,
          rejectionReason: reason.trim(),
        }
      );

      setMessage("Premium request reject ho gayi.");
    } catch (error) {
      console.error("Premium rejection error:", error);
      setMessage(
        "Request reject nahi ho saki. Firebase Rules check karein."
      );
    } finally {
      setProcessingId("");
    }
  }

  if (checkingAccess) {
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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Premium Requests
            </h1>
            <p className="mt-2 text-gray-600">
              Premium payments verify karke membership
              approve ya reject karein.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Admin Dashboard
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Requests
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {counts.all}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending
            </p>
            <p className="mt-1 text-3xl font-bold text-yellow-600">
              {counts.pending}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Approved
            </p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {counts.approved}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Rejected
            </p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {counts.rejected}
            </p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Email, transaction ID, sender ya method search karein"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "All"
                    | RequestStatus
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            >
              <option value="All">All Requests</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {message && (
            <p className="mt-4 rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-800">
              {message}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            {loadingRequests ? (
              <div className="p-8 text-center text-gray-600">
                Premium requests load ho rahi hain...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                Is filter mein koi premium request nahi hai.
              </div>
            ) : (
              <table className="min-w-[1250px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-3 py-3 font-semibold">
                      Date
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      User
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Plan
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Amount
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Payment
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Sender
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Transaction ID
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-3 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => {
                    const isProcessing =
                      processingId === request.id;

                    return (
                      <tr
                        key={request.id}
                        className="border-b align-top last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                          {formatDate(request.createdAt)}
                        </td>

                        <td className="px-3 py-4">
                          <p className="font-medium text-gray-900">
                            {request.userEmail || "No email"}
                          </p>
                          <p className="mt-1 max-w-[180px] break-all text-xs text-gray-500">
                            {request.userId}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {request.plan}
                          </span>
                          <p className="mt-2 text-xs text-gray-500">
                            {request.durationDays} days
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 font-bold text-gray-900">
                          ${request.amountUSD.toFixed(2)}
                        </td>

                        <td className="px-3 py-4">
                          <p className="font-medium text-gray-800">
                            {request.paymentMethod}
                          </p>
                          {request.senderAccount && (
                            <p className="mt-1 max-w-[180px] break-all text-xs text-gray-500">
                              {request.senderAccount}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <p className="font-medium text-gray-800">
                            {request.senderName || "—"}
                          </p>
                        </td>

                        <td className="max-w-[220px] break-all px-3 py-4 text-gray-700">
                          {request.transactionId || "—"}
                          {request.notes && (
                            <p className="mt-2 text-xs text-gray-500">
                              Notes: {request.notes}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>

                          {request.reviewedAt && (
                            <p className="mt-2 text-xs text-gray-500">
                              {formatDate(request.reviewedAt)}
                            </p>
                          )}

                          {request.rejectionReason && (
                            <p className="mt-2 max-w-[180px] text-xs text-red-600">
                              {request.rejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {request.status === "Pending" ? (
                            <div className="flex min-w-[170px] flex-col gap-2">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  approveRequest(request)
                                }
                                className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Approve"}
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  rejectRequest(request)
                                }
                                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Action completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}