"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardSidebar from "../../components/DashboardSidebar";
import { useCurrency } from "../../components/CurrencyProvider";
import {
  useLanguage,
  type Language,
} from "../../components/LanguageProvider";
import { auth, db } from "../../lib/firebase";

type PremiumPlan = "Pro" | "Business";

type PaymentMethod =
  | "JazzCash"
  | "EasyPaisa"
  | "Allied Bank Transfer"
  | "Binance USDT"
  | "Payoneer"
  | "International Bank Transfer";

type PaymentDetails = {
  title: string;
  instructions: string[];
};

type PremiumRequestItem = {
  id: string;
  plan: string;
  amountUSD: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  createdAt: Timestamp | null;
};

type MembershipData = {
  membership: string;
  membershipStartDate: Timestamp | null;
  membershipExpiryDate: Timestamp | null;
};

type PageText = {
  title: string;
  description: string;
  selectedPlan: string;
  planPrice: string;
  currentMembership: string;
  paymentMethod: string;
  senderName: string;
  senderAccount: string;
  transactionReference: string;
  notes: string;
  submit: string;
  submitting: string;
  paymentInstructions: string;
  requestHistory: string;
  noRequests: string;
  loadingHistory: string;
  loginRequired: string;
  invalidPlan: string;
  transactionRequired: string;
  senderNameRequired: string;
  duplicatePending: string;
  alreadyActive: string;
  success: string;
  error: string;
  pendingNotice: string;
};

const plans: Record<
  PremiumPlan,
  {
    name: PremiumPlan;
    amountUSD: number;
    description: string;
  }
> = {
  Pro: {
    name: "Pro",
    amountUSD: 9.99,
    description: "Advanced tools aur premium benefits ke liye.",
  },
  Business: {
    name: "Business",
    amountUSD: 24.99,
    description: "Businesses aur high-volume users ke liye.",
  },
};

const paymentMethods: PaymentMethod[] = [
  "JazzCash",
  "EasyPaisa",
  "Allied Bank Transfer",
  "Binance USDT",
  "Payoneer",
  "International Bank Transfer",
];

const translations: Partial<Record<Language, PageText>> = {
  en: {
    title: "Premium Upgrade Request",
    description:
      "Choose your plan, complete the payment and submit your transaction details for admin verification.",
    selectedPlan: "Selected Plan",
    planPrice: "Plan Price",
    currentMembership: "Current Membership",
    paymentMethod: "Payment Method",
    senderName: "Sender Name",
    senderAccount: "Sender Account",
    transactionReference: "Transaction ID / Reference",
    notes: "Additional Notes",
    submit: "Submit Premium Request",
    submitting: "Submitting...",
    paymentInstructions: "Payment Instructions",
    requestHistory: "Premium Request History",
    noRequests: "No premium request has been submitted yet.",
    loadingHistory: "Premium request history is loading...",
    loginRequired: "Please log in first.",
    invalidPlan: "Please select a valid premium plan.",
    transactionRequired: "Please enter the transaction ID or reference.",
    senderNameRequired: "Please enter the sender name.",
    duplicatePending:
      "You already have a pending premium request. Please wait for admin review.",
    alreadyActive:
      "This membership is already active on your account.",
    success:
      "Premium request submitted successfully. Admin will verify your payment.",
    error:
      "Premium request could not be submitted. Please check Firebase Rules.",
    pendingNotice:
      "Admin will manually verify the payment. Do not submit the same pending request again.",
  },
  romanUrdu: {
    title: "Premium Upgrade Request",
    description:
      "Plan select karein, payment complete karein aur admin verification ke liye transaction details submit karein.",
    selectedPlan: "Selected Plan",
    planPrice: "Plan Price",
    currentMembership: "Current Membership",
    paymentMethod: "Payment Method",
    senderName: "Sender Name",
    senderAccount: "Sender Account",
    transactionReference: "Transaction ID / Reference",
    notes: "Additional Notes",
    submit: "Premium Request Submit Karein",
    submitting: "Submit ho rahi hai...",
    paymentInstructions: "Payment Instructions",
    requestHistory: "Premium Request History",
    noRequests: "Abhi tak koi premium request submit nahi ki gayi.",
    loadingHistory: "Premium request history load ho rahi hai...",
    loginRequired: "Pehle login karein.",
    invalidPlan: "Valid premium plan select karein.",
    transactionRequired:
      "Transaction ID ya reference number enter karein.",
    senderNameRequired: "Sender ka naam enter karein.",
    duplicatePending:
      "Aapki ek premium request pehle se pending hai. Admin review ka wait karein.",
    alreadyActive:
      "Ye membership aapke account par pehle se active hai.",
    success:
      "Premium request successfully submit ho gayi. Admin payment verify karega.",
    error:
      "Premium request submit nahi ho saki. Firebase Rules check karein.",
    pendingNotice:
      "Admin payment manually verify karega. Same pending request dobara submit na karein.",
  },
};

const englishFallback = translations.en as PageText;

function getPaymentDetails(
  method: PaymentMethod,
  language: Language
): PaymentDetails {
  const romanUrdu = language === "romanUrdu";

  const commonTransactionInstruction = romanUrdu
    ? "Payment bhejne ke baad transaction ID ya reference enter karein."
    : "After sending the payment, enter the transaction ID or reference.";

  const commonSenderInstruction = romanUrdu
    ? "Sender ka naam aur sender account details sahi enter karein."
    : "Enter the sender name and sender account details correctly.";

  const details: Record<PaymentMethod, PaymentDetails> = {
    JazzCash: {
      title: "JazzCash Payment",
      instructions: [
        "Account Name: Hamza Javed",
        "JazzCash Number: 0323 8000700",
        commonTransactionInstruction,
        commonSenderInstruction,
      ],
    },
    EasyPaisa: {
      title: "EasyPaisa Payment",
      instructions: [
        "Account Name: Hamza Javed",
        "EasyPaisa Number: 0323 8000700",
        commonTransactionInstruction,
        commonSenderInstruction,
      ],
    },
    "Allied Bank Transfer": {
      title: "Allied Bank Transfer",
      instructions: [
        "Account Title: Hamza Javed",
        "Bank Name: Allied Bank",
        "Account Number: 04020010147762670010",
        "IBAN: PK27ABPA0010147762670010",
        "SWIFT Code: ABPAPKKAXXX",
        romanUrdu
          ? "Transfer ke baad transaction ya reference ID enter karein."
          : "After the transfer, enter the transaction or reference ID.",
      ],
    },
    "Binance USDT": {
      title: "Binance USDT Payment",
      instructions: [
        "Currency: USDT",
        "Network: TRON (TRC20)",
        "Deposit Address: TKk1bsDqGAw3jTCRDQCYmvVQRBi5C2QsyG",
        romanUrdu
          ? "Sirf TRON (TRC20) network use karein."
          : "Only use the TRON (TRC20) network.",
        romanUrdu
          ? "Ghalat network par bheji gayi payment recover nahi ho sakti."
          : "Payments sent through the wrong network cannot be recovered.",
        romanUrdu
          ? "Payment ke baad transaction hash enter karein."
          : "After payment, enter the transaction hash.",
      ],
    },
    Payoneer: {
      title: "Payoneer Payment",
      instructions: [
        "Payoneer Email: jhinterprises18@gmail.com",
        "Account Holder / Business: J H Enterprises",
        romanUrdu
          ? "Payment reference mein apna registered website email likhein."
          : "Write your registered website email in the payment reference.",
        commonTransactionInstruction,
      ],
    },
    "International Bank Transfer": {
      title: "International Bank Transfer",
      instructions: [
        "Beneficiary Name: Hamza Javed",
        "Bank Name: Allied Bank",
        "IBAN: PK27ABPA0010147762670010",
        "Account Number: 04020010147762670010",
        "SWIFT Code: ABPAPKKAXXX",
        romanUrdu
          ? "International transfer charges customer pay karega."
          : "The customer is responsible for international transfer charges.",
        romanUrdu
          ? "Transfer ke baad bank reference number enter karein."
          : "After the transfer, enter the bank reference number.",
      ],
    },
  };

  return details[method];
}

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

function timestampToMillis(value: Timestamp | null): number {
  return value?.toMillis() ?? 0;
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "approved" || normalized === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "rejected" || normalized === "failed") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

function PremiumRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { formatFromUSD } = useCurrency();

  const pageText = translations[language] ?? englishFallback;

  const planFromUrl = searchParams.get("plan");
  const initialPlan: PremiumPlan =
    planFromUrl === "Business" || planFromUrl?.toLowerCase() === "business"
      ? "Business"
      : "Pro";

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [plan, setPlan] = useState<PremiumPlan>(initialPlan);
  const [method, setMethod] =
    useState<PaymentMethod>("JazzCash");
  const [transactionId, setTransactionId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [notes, setNotes] = useState("");

  const [membershipData, setMembershipData] =
    useState<MembershipData>({
      membership: "Free",
      membershipStartDate: null,
      membershipExpiryDate: null,
    });

  const [requests, setRequests] = useState<PremiumRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans[plan];

  const selectedPaymentDetails = useMemo(
    () => getPaymentDetails(method, language),
    [method, language]
  );

  useEffect(() => {
    if (
      planFromUrl === "Business" ||
      planFromUrl?.toLowerCase() === "business"
    ) {
      setPlan("Business");
    } else if (
      planFromUrl === "Pro" ||
      planFromUrl?.toLowerCase() === "pro"
    ) {
      setPlan("Pro");
    }
  }, [planFromUrl]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (userSnapshot.exists()) {
            const data = userSnapshot.data();

            setMembershipData({
              membership: String(data.membership ?? "Free"),
              membershipStartDate:
                data.membershipStartDate instanceof Timestamp
                  ? data.membershipStartDate
                  : null,
              membershipExpiryDate:
                data.membershipExpiryDate instanceof Timestamp
                  ? data.membershipExpiryDate
                  : null,
            });
          }
        } catch (error) {
          console.error("Membership load error:", error);
        } finally {
          setCheckingAuth(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoadingRequests(true);

    const premiumRequestsQuery = query(
      collection(db, "premiumRequests"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      premiumRequestsQuery,
      (snapshot) => {
        const loadedRequests = snapshot.docs
          .map((requestDocument) => {
            const data = requestDocument.data();

            return {
              id: requestDocument.id,
              plan: String(data.plan ?? ""),
              amountUSD: Number(data.amountUSD ?? 0),
              paymentMethod: String(data.paymentMethod ?? ""),
              transactionId: String(data.transactionId ?? ""),
              status: String(data.status ?? "Pending"),
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
            } satisfies PremiumRequestItem;
          })
          .sort(
            (first, second) =>
              timestampToMillis(second.createdAt) -
              timestampToMillis(first.createdAt)
          );

        setRequests(loadedRequests);
        setHasPendingRequest(
          loadedRequests.some(
            (request) =>
              request.status.toLowerCase() === "pending"
          )
        );
        setLoadingRequests(false);
      },
      (error) => {
        console.error("Premium request history error:", error);
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  function handleMethodChange(value: string) {
    setMethod(value as PaymentMethod);
    setTransactionId("");
    setSenderName("");
    setSenderAccount("");
    setNotes("");
    setMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    if (!user) {
      setMessage(pageText.loginRequired);
      return;
    }

    if (!plans[plan]) {
      setMessage(pageText.invalidPlan);
      return;
    }

    if (hasPendingRequest) {
      setMessage(pageText.duplicatePending);
      return;
    }

    if (
      membershipData.membership.toLowerCase() ===
      plan.toLowerCase()
    ) {
      setMessage(pageText.alreadyActive);
      return;
    }

    if (!senderName.trim()) {
      setMessage(pageText.senderNameRequired);
      return;
    }

    if (!transactionId.trim()) {
      setMessage(pageText.transactionRequired);
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "premiumRequests"), {
        userId: user.uid,
        userEmail: user.email,

        plan,
        amountUSD: selectedPlan.amountUSD,
        durationDays: 30,

        paymentMethod: method,
        transactionId: transactionId.trim(),
        senderName: senderName.trim(),
        senderAccount: senderAccount.trim(),
        notes: notes.trim(),

        status: "Pending",
        createdAt: serverTimestamp(),
        reviewedAt: null,
        adminId: null,
        rejectionReason: "",
      });

      setMessage(pageText.success);
      setTransactionId("");
      setSenderName("");
      setSenderAccount("");
      setNotes("");
    } catch (error) {
      console.error("Premium request submit error:", error);
      setMessage(pageText.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {pageText.title}
            </h1>
            <p className="mt-2 text-gray-600">
              {pageText.description}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                {pageText.currentMembership}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {membershipData.membership}
              </p>
              {membershipData.membershipExpiryDate && (
                <p className="mt-2 text-xs text-gray-500">
                  Expiry:{" "}
                  {formatDate(
                    membershipData.membershipExpiryDate
                  )}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                {pageText.selectedPlan}
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {selectedPlan.name}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {selectedPlan.description}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                {pageText.planPrice}
              </p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {formatFromUSD(selectedPlan.amountUSD)}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                30 days membership
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
            >
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.selectedPlan}
                </label>
                <select
                  value={plan}
                  onChange={(event) => {
                    setPlan(event.target.value as PremiumPlan);
                    setMessage("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                >
                  <option value="Pro">
                    Pro — $9.99 / 30 days
                  </option>
                  <option value="Business">
                    Business — $24.99 / 30 days
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.paymentMethod}
                </label>
                <select
                  value={method}
                  onChange={(event) =>
                    handleMethodChange(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                >
                  {paymentMethods.map((paymentMethod) => (
                    <option
                      key={paymentMethod}
                      value={paymentMethod}
                    >
                      {paymentMethod}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.senderName}
                </label>
                <input
                  value={senderName}
                  onChange={(event) =>
                    setSenderName(event.target.value)
                  }
                  placeholder="Payment bhejne wale ka naam"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.senderAccount}
                </label>
                <input
                  value={senderAccount}
                  onChange={(event) =>
                    setSenderAccount(event.target.value)
                  }
                  placeholder="Mobile number, email ya wallet address"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.transactionReference}
                </label>
                <input
                  value={transactionId}
                  onChange={(event) =>
                    setTransactionId(event.target.value)
                  }
                  placeholder="Transaction ID ya reference enter karein"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {pageText.notes}
                </label>
                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Optional details"
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || hasPendingRequest}
                className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? pageText.submitting
                  : pageText.submit}
              </button>

              {hasPendingRequest && (
                <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center text-sm text-yellow-800">
                  {pageText.duplicatePending}
                </p>
              )}

              {message && (
                <p className="rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-800">
                  {message}
                </p>
              )}
            </form>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedPaymentDetails.title}
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    Plan:{" "}
                    <span className="font-bold">
                      {selectedPlan.name}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-blue-900">
                    Amount:{" "}
                    <span className="font-bold">
                      ${selectedPlan.amountUSD.toFixed(2)}
                    </span>
                  </p>
                </div>

                {selectedPaymentDetails.instructions.map(
                  (instruction, index) => (
                    <div
                      key={`${instruction}-${index}`}
                      className="break-words rounded-lg bg-gray-50 p-4 text-sm text-gray-700"
                    >
                      {instruction}
                    </div>
                  )
                )}
              </div>

              <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm leading-6 text-yellow-900">
                  Payment bhejne se pehle account number,
                  IBAN, wallet address aur network dobara
                  check karein. Ghalat details par bheji gayi
                  payment recover nahi ho sakti.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm leading-6 text-blue-900">
                  {pageText.pendingNotice}
                </p>
              </div>
            </div>
          </div>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {pageText.requestHistory}
            </h2>

            <div className="mt-5 overflow-x-auto">
              {loadingRequests ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
                  {pageText.loadingHistory}
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  {pageText.noRequests}
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="px-3 py-3 font-semibold">
                        Date
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Plan
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Amount
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Method
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Transaction ID
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-medium text-gray-800">
                          {request.plan}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-gray-800">
                          ${request.amountUSD.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-gray-700">
                          {request.paymentMethod}
                        </td>
                        <td className="max-w-[220px] break-all px-3 py-4 text-gray-600">
                          {request.transactionId || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function PremiumRequestPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading...</p>
      </main>
    }>
      <PremiumRequestContent />
    </Suspense>
  );
}