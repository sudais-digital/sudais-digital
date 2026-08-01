"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import { useCurrency } from "../components/CurrencyProvider";
import {
  useLanguage,
  type Language,
} from "../components/LanguageProvider";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";

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

type FundRequestHistoryItem = {
  id: string;
  method: string;
  amount: number;
  currency: string;
  transactionId: string;
  status: string;
  createdAt: Timestamp | null;
  creditedUSD?: number;
};

type WalletTransactionItem = {
  id: string;
  type: string;
  category: string;
  status: string;
  amountUSD: number;
  description: string;
  originalAmount?: number;
  originalCurrency?: string;
  paymentMethod?: string;
  createdAt: Timestamp | null;
};

type PageTranslations = {
  pageDescription: string;
  currentWallet: string;
  submitPayment: string;
  enterAmount: string;
  senderNamePlaceholder: string;
  senderAccountPlaceholder: string;
  transactionPlaceholder: string;
  optionalDetails: string;
  checkDetailsWarning: string;
  manualVerificationNotice: string;
  loginRequired: string;
  invalidAmount: string;
  transactionRequired: string;
  senderNameRequired: string;
  successMessage: string;
  errorMessage: string;
};

const paymentMethods: PaymentMethod[] = [
  "JazzCash",
  "EasyPaisa",
  "Allied Bank Transfer",
  "Binance USDT",
  "Payoneer",
  "International Bank Transfer",
];

const pageTranslations: Partial<Record<Language, PageTranslations>> = {
  en: {
    pageDescription:
      "Complete your payment and submit a fund request for verification.",
    currentWallet: "Current Wallet",
    submitPayment: "Submit Payment",
    enterAmount: "Enter amount in",
    senderNamePlaceholder: "Enter the payment sender's name",
    senderAccountPlaceholder: "Mobile number, email or wallet address",
    transactionPlaceholder: "Enter transaction ID or reference",
    optionalDetails: "Optional details",
    checkDetailsWarning:
      "Before sending payment, check the account number, IBAN, wallet address and network again. Payments sent to incorrect details cannot be recovered.",
    manualVerificationNotice:
      "The admin will manually verify your fund request. After verification, the amount will be added to your wallet. Do not submit the same pending request again.",
    loginRequired: "Please log in first.",
    invalidAmount: "Please enter a valid payment amount.",
    transactionRequired:
      "Please enter the transaction ID or reference number.",
    senderNameRequired: "Please enter the sender's name.",
    successMessage:
      "Fund request submitted successfully. Your wallet will be updated after admin verification.",
    errorMessage:
      "The fund request could not be submitted. Please check the Firebase rules.",
  },

  romanUrdu: {
    pageDescription:
      "Payment bhejne ke baad verification ke liye fund request submit karein.",
    currentWallet: "Current Wallet",
    submitPayment: "Payment Submit Karein",
    enterAmount: "Amount enter karein",
    senderNamePlaceholder: "Payment bhejne wale ka naam",
    senderAccountPlaceholder: "Mobile number, email ya wallet address",
    transactionPlaceholder: "Transaction ID ya reference enter karein",
    optionalDetails: "Optional details",
    checkDetailsWarning:
      "Payment bhejne se pehle account number, IBAN, wallet address aur network dobara check karein. Ghalat details par bheji gayi payment recover nahi ho sakti.",
    manualVerificationNotice:
      "Fund request admin manually verify karega. Verification ke baad amount wallet mein add hoga. Pending request ko dobara submit na karein.",
    loginRequired: "Pehle login karein.",
    invalidAmount: "Valid payment amount enter karein.",
    transactionRequired:
      "Transaction ID ya reference number enter karein.",
    senderNameRequired: "Sender ka naam enter karein.",
    successMessage:
      "Fund request successfully submit ho gayi. Admin verification ke baad wallet update hoga.",
    errorMessage:
      "Fund request submit nahi ho saki. Firebase Rules check karein.",
  },
};

const englishFallback = pageTranslations.en as PageTranslations;

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
    : "Enter the sender's name and account details correctly.";

  const details: Record<PaymentMethod, PaymentDetails> = {
    JazzCash: {
      title: romanUrdu ? "JazzCash Payment" : "JazzCash Payment",
      instructions: [
        "Account Name: Hamza Javed",
        "JazzCash Number: 0323 8000700",
        commonTransactionInstruction,
        commonSenderInstruction,
      ],
    },

    EasyPaisa: {
      title: romanUrdu ? "EasyPaisa Payment" : "EasyPaisa Payment",
      instructions: [
        "Account Name: Hamza Javed",
        "EasyPaisa Number: 0323 8000700",
        commonTransactionInstruction,
        commonSenderInstruction,
      ],
    },

    "Allied Bank Transfer": {
      title: romanUrdu
        ? "Allied Bank Transfer"
        : "Allied Bank Transfer",
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
      title: romanUrdu
        ? "Binance USDT Payment"
        : "Binance USDT Payment",
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
      title: romanUrdu ? "Payoneer Payment" : "Payoneer Payment",
      instructions: [
        "Payoneer Email: jhinterprises18@gmail.com",
        "Account Holder / Business: J H Enterprises",
        romanUrdu
          ? "Payment reference mein apna registered website email likhein."
          : "Write your registered website email in the payment reference.",
        commonTransactionInstruction,
        romanUrdu
          ? "Payment bhejne se pehle Payoneer transfer availability confirm karein."
          : "Confirm Payoneer transfer availability before sending payment.",
      ],
    },

    "International Bank Transfer": {
      title: romanUrdu
        ? "International Bank Transfer"
        : "International Bank Transfer",
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

function timestampToMillis(value: Timestamp | null): number {
  return value?.toMillis() ?? 0;
}

function formatHistoryDate(value: Timestamp | null): string {
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

function formatOriginalAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;
}

function statusBadgeClass(status: string): string {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "approved" || normalizedStatus === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (normalizedStatus === "rejected" || normalizedStatus === "failed") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export default function AddFundsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { formatFromUSD } = useCurrency();

  const pageText =
    pageTranslations[language] ?? englishFallback;

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [walletBalance, setWalletBalance] = useState(0);
  const [method, setMethod] =
    useState<PaymentMethod>("JazzCash");
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [fundRequests, setFundRequests] = useState<FundRequestHistoryItem[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionItem[]>([]);
  const [loadingFundRequests, setLoadingFundRequests] = useState(true);
  const [loadingWalletTransactions, setLoadingWalletTransactions] = useState(true);


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
          const userDocument = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (userDocument.exists()) {
            const userData = userDocument.data();

            setWalletBalance(
              Number(
                userData.wallet ??
                  userData.walletBalance ??
                  userData.walletUSD ??
                  userData.balance ??
                  0
              )
            );
          }
        } catch (error) {
          console.error("Wallet load error:", error);
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

    setLoadingFundRequests(true);

    const fundRequestsQuery = query(
      collection(db, "fundRequests"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      fundRequestsQuery,
      (snapshot) => {
        const loadedRequests = snapshot.docs
          .map((requestDocument) => {
            const data = requestDocument.data();

            return {
              id: requestDocument.id,
              method: String(data.method ?? ""),
              amount: Number(data.amount ?? 0),
              currency: String(data.currency ?? "USD"),
              transactionId: String(data.transactionId ?? ""),
              status: String(data.status ?? "Pending"),
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
              creditedUSD:
                data.creditedUSD === undefined
                  ? undefined
                  : Number(data.creditedUSD),
            } satisfies FundRequestHistoryItem;
          })
          .sort(
            (first, second) =>
              timestampToMillis(second.createdAt) -
              timestampToMillis(first.createdAt)
          );

        setFundRequests(loadedRequests);
        setLoadingFundRequests(false);
      },
      (error) => {
        console.error("Fund request history load error:", error);
        setLoadingFundRequests(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoadingWalletTransactions(true);

    const walletTransactionsQuery = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      walletTransactionsQuery,
      (snapshot) => {
        const loadedTransactions = snapshot.docs
          .map((transactionDocument) => {
            const data = transactionDocument.data();

            return {
              id: transactionDocument.id,
              type: String(data.type ?? "Credit"),
              category: String(data.category ?? "Wallet"),
              status: String(data.status ?? "Completed"),
              amountUSD: Number(data.amountUSD ?? data.amount ?? 0),
              description: String(data.description ?? "Wallet transaction"),
              originalAmount:
                data.originalAmount === undefined
                  ? undefined
                  : Number(data.originalAmount),
              originalCurrency:
                data.originalCurrency === undefined
                  ? undefined
                  : String(data.originalCurrency),
              paymentMethod:
                data.paymentMethod === undefined
                  ? undefined
                  : String(data.paymentMethod),
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
            } satisfies WalletTransactionItem;
          })
          .sort(
            (first, second) =>
              timestampToMillis(second.createdAt) -
              timestampToMillis(first.createdAt)
          );

        setWalletTransactions(loadedTransactions);
        setLoadingWalletTransactions(false);
      },
      (error) => {
        console.error("Wallet transaction history load error:", error);
        setLoadingWalletTransactions(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const selectedPaymentDetails = useMemo(() => {
    return getPaymentDetails(method, language);
  }, [method, language]);

  const currency = useMemo(() => {
    if (
      method === "JazzCash" ||
      method === "EasyPaisa" ||
      method === "Allied Bank Transfer"
    ) {
      return "PKR";
    }

    if (method === "Binance USDT") {
      return "USDT";
    }

    return "USD";
  }, [method]);

  function handleMethodChange(value: string) {
    setMethod(value as PaymentMethod);
    setAmount("");
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
      toast.error(pageText.loginRequired);
      return;
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.error(pageText.invalidAmount);
      return;
    }

    if (!transactionId.trim()) {
      toast.error(pageText.transactionRequired);
      return;
    }

    if (!senderName.trim()) {
      toast.error(pageText.senderNameRequired);
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, "fundRequests"), {
        userId: user.uid,
        userEmail: user.email,

        method,
        amount: numericAmount,
        currency,

        transactionId: transactionId.trim(),
        senderName: senderName.trim(),
        senderAccount: senderAccount.trim(),
        notes: notes.trim(),

        status: "Pending",
        createdAt: serverTimestamp(),
      });

      toast.success(pageText.successMessage);

      setAmount("");
      setTransactionId("");
      setSenderName("");
      setSenderAccount("");
      setNotes("");
    } catch (error) {
      console.error("Fund request error:", error);
      toast.error(pageText.errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          {t("loading")}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("addFundsTitle")}
              </h1>

              <p className="mt-2 text-gray-600">
                {pageText.pageDescription}
              </p>
            </div>

            <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-gray-500">
                {pageText.currentWallet}
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {formatFromUSD(walletBalance)}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900">
                {pageText.submitPayment}
              </h2>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {t("paymentMethod")}
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
                  {t("amount")} ({currency})
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder={`${pageText.enterAmount} ${currency}`}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {t("senderName")}
                </label>

                <input
                  value={senderName}
                  onChange={(event) =>
                    setSenderName(event.target.value)
                  }
                  placeholder={
                    pageText.senderNamePlaceholder
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {t("senderAccount")}
                </label>

                <input
                  value={senderAccount}
                  onChange={(event) =>
                    setSenderAccount(event.target.value)
                  }
                  placeholder={
                    pageText.senderAccountPlaceholder
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {t("transactionReference")}
                </label>

                <input
                  value={transactionId}
                  onChange={(event) =>
                    setTransactionId(event.target.value)
                  }
                  placeholder={
                    pageText.transactionPlaceholder
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  {t("additionalNotes")}
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder={pageText.optionalDetails}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? t("submittingRequest")
                  : t("submitFundRequest")}
              </button>
            </form>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedPaymentDetails.title}
              </h2>

              <div className="mt-5 space-y-3">
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
                  {pageText.checkDetailsWarning}
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm leading-6 text-blue-900">
                  {pageText.manualVerificationNotice}
                </p>
              </div>
            </div>
          </div>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Fund Request History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Aapki deposit requests aur unka current status.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              {loadingFundRequests ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
                  Fund request history load ho rahi hai...
                </div>
              ) : fundRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  Abhi tak koi fund request submit nahi ki gayi.
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Method</th>
                      <th className="px-3 py-3 font-semibold">Amount</th>
                      <th className="px-3 py-3 font-semibold">Transaction ID</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundRequests.map((request) => (
                      <tr key={request.id} className="border-b last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                          {formatHistoryDate(request.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 font-medium text-gray-800">
                          {request.method}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-gray-800">
                          {formatOriginalAmount(request.amount, request.currency)}
                          {request.status.toLowerCase() === "approved" &&
                            request.creditedUSD !== undefined && (
                              <span className="mt-1 block text-xs text-green-700">
                                Wallet credit: {formatFromUSD(request.creditedUSD)}
                              </span>
                            )}
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

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Wallet Transaction History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Wallet mein add ya deduct hone wali tamam recorded transactions.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              {loadingWalletTransactions ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
                  Wallet history load ho rahi hai...
                </div>
              ) : walletTransactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  Abhi tak koi wallet transaction record nahi hai.
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Details</th>
                      <th className="px-3 py-3 font-semibold">Amount</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletTransactions.map((transaction) => {
                      const isDebit = transaction.type.toLowerCase() === "debit";

                      return (
                        <tr key={transaction.id} className="border-b last:border-b-0">
                          <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                            {formatHistoryDate(transaction.createdAt)}
                          </td>
                          <td className="px-3 py-4">
                            <p className="font-medium text-gray-800">
                              {transaction.description}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {transaction.category}
                              {transaction.paymentMethod
                                ? ` • ${transaction.paymentMethod}`
                                : ""}
                            </p>
                            {transaction.originalAmount !== undefined &&
                              transaction.originalCurrency && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Original payment: {formatOriginalAmount(
                                    transaction.originalAmount,
                                    transaction.originalCurrency
                                  )}
                                </p>
                              )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-3 py-4 font-bold ${
                              isDebit ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {isDebit ? "−" : "+"}
                            {formatFromUSD(Math.abs(transaction.amountUSD))}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>
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
    </div>
  );
}