"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import { useCurrency } from "../components/CurrencyProvider";
import { useLanguage } from "../components/LanguageProvider";
import { auth, db } from "../lib/firebase";

type ReferralItem = {
  id: string;
  referredUserName: string;
  status: string;
  totalEarned: number;
  pendingCommission: number;
  createdAt?: Timestamp;
};

type ReferralText = {
  title: string;
  description: string;
  referralLink: string;
  referralCode: string;
  copy: string;
  copied: string;
  totalReferrals: string;
  totalEarnings: string;
  pendingCommission: string;
  history: string;
  referredUser: string;
  joined: string;
  status: string;
  earned: string;
  pending: string;
  noReferrals: string;
  loading: string;
  loadError: string;
  active: string;
  completed: string;
};

const translations: Record<string, ReferralText> = {
  en: {
    title: "Referrals",
    description:
      "Invite your friends and earn commission from their orders.",
    referralLink: "Your Referral Link",
    referralCode: "Your Referral Code",
    copy: "Copy",
    copied: "Copied!",
    totalReferrals: "Total Referrals",
    totalEarnings: "Total Earnings",
    pendingCommission: "Pending Commission",
    history: "Referral History",
    referredUser: "Referred User",
    joined: "Joined",
    status: "Status",
    earned: "Earned",
    pending: "Pending",
    noReferrals: "No referrals yet.",
    loading: "Referral information is loading...",
    loadError: "Referral information could not be loaded.",
    active: "Active",
    completed: "Completed",
  },

  romanUrdu: {
    title: "Referrals",
    description:
      "Apne doston ko invite karein aur unke orders se commission earn karein.",
    referralLink: "Aapka Referral Link",
    referralCode: "Aapka Referral Code",
    copy: "Copy Karein",
    copied: "Copy Ho Gaya!",
    totalReferrals: "Total Referrals",
    totalEarnings: "Total Earnings",
    pendingCommission: "Pending Commission",
    history: "Referral History",
    referredUser: "Referred User",
    joined: "Join Date",
    status: "Status",
    earned: "Earned",
    pending: "Pending",
    noReferrals: "Abhi koi referral nahi hai.",
    loading: "Referral information load ho rahi hai...",
    loadError: "Referral information load nahi ho saki.",
    active: "Active",
    completed: "Completed",
  },

  ur: {
    title: "ریفرلز",
    description:
      "اپنے دوستوں کو مدعو کریں اور ان کے آرڈرز سے کمیشن حاصل کریں۔",
    referralLink: "آپ کا ریفرل لنک",
    referralCode: "آپ کا ریفرل کوڈ",
    copy: "کاپی کریں",
    copied: "کاپی ہو گیا!",
    totalReferrals: "کل ریفرلز",
    totalEarnings: "کل آمدنی",
    pendingCommission: "زیر التوا کمیشن",
    history: "ریفرل ہسٹری",
    referredUser: "ریفر کیا گیا صارف",
    joined: "شمولیت",
    status: "حالت",
    earned: "آمدنی",
    pending: "زیر التوا",
    noReferrals: "ابھی کوئی ریفرل موجود نہیں۔",
    loading: "ریفرل معلومات لوڈ ہو رہی ہیں...",
    loadError: "ریفرل معلومات لوڈ نہیں ہو سکیں۔",
    active: "فعال",
    completed: "مکمل",
  },

  ar: {
    title: "الإحالات",
    description:
      "ادعُ أصدقاءك واكسب عمولة من طلباتهم.",
    referralLink: "رابط الإحالة الخاص بك",
    referralCode: "رمز الإحالة الخاص بك",
    copy: "نسخ",
    copied: "تم النسخ!",
    totalReferrals: "إجمالي الإحالات",
    totalEarnings: "إجمالي الأرباح",
    pendingCommission: "العمولة المعلقة",
    history: "سجل الإحالات",
    referredUser: "المستخدم المُحال",
    joined: "تاريخ الانضمام",
    status: "الحالة",
    earned: "الأرباح",
    pending: "معلق",
    noReferrals: "لا توجد إحالات حتى الآن.",
    loading: "جارٍ تحميل معلومات الإحالة...",
    loadError: "تعذر تحميل معلومات الإحالة.",
    active: "نشط",
    completed: "مكتمل",
  },
};

function formatDate(timestamp?: Timestamp) {
  if (!timestamp) {
    return "—";
  }

  return timestamp.toDate().toLocaleDateString("en-US");
}

export default function ReferralsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { formatFromUSD } = useCurrency();

  const pageText =
    translations[String(language)] ?? translations.en;

  const [userId, setUserId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralEarnings, setReferralEarnings] =
    useState(0);
  const [userPendingCommission, setUserPendingCommission] =
    useState(0);
  const [referrals, setReferrals] = useState<
    ReferralItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeReferrals: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUserId(currentUser.uid);

        unsubscribeUser = onSnapshot(
          doc(db, "users", currentUser.uid),
          (snapshot) => {
            const data = snapshot.data();

            setReferralCode(
              String(data?.referralCode ?? "")
            );
            setReferralEarnings(
              Number(
                data?.referralEarnings ??
                  data?.referralBalance ??
                  0
              )
            );
            setUserPendingCommission(
              Number(data?.pendingCommission ?? 0)
            );
          },
          (error) => {
            console.error("Referral user load error:", error);
            setMessage(pageText.loadError);
            setLoading(false);
          }
        );

        const referralsQuery = query(
          collection(db, "referrals"),
          where("referrerId", "==", currentUser.uid)
        );

        unsubscribeReferrals = onSnapshot(
          referralsQuery,
          (snapshot) => {
            const allReferrals: ReferralItem[] =
              snapshot.docs.map((referralDocument) => {
                const data = referralDocument.data();

                return {
                  id: referralDocument.id,
                  referredUserName: String(
                    data.referredUserName ??
                      "Unknown User"
                  ),
                  status: String(
                    data.status ?? "pending"
                  ).toLowerCase(),
                  totalEarned: Number(
                    data.totalEarned ?? 0
                  ),
                  pendingCommission: Number(
                    data.pendingCommission ?? 0
                  ),
                  createdAt: data.createdAt,
                };
              });

            allReferrals.sort((first, second) => {
              const firstTime =
                first.createdAt?.toMillis() ?? 0;
              const secondTime =
                second.createdAt?.toMillis() ?? 0;

              return secondTime - firstTime;
            });

            setReferrals(allReferrals);
            setLoading(false);
          },
          (error) => {
            console.error("Referrals load error:", error);
            setMessage(pageText.loadError);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeUser?.();
      unsubscribeReferrals?.();
    };
  }, [router, pageText.loadError]);

  const referralLink = useMemo(() => {
    if (!referralCode) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/register?ref=${encodeURIComponent(
        referralCode
      )}`;
    }

    return `${window.location.origin}/register?ref=${encodeURIComponent(
      referralCode
    )}`;
  }, [referralCode]);

  const calculatedTotalEarnings = useMemo(() => {
    const referralRowsTotal = referrals.reduce(
      (total, referral) =>
        total + referral.totalEarned,
      0
    );

    return Math.max(
      referralEarnings,
      referralRowsTotal
    );
  }, [referralEarnings, referrals]);

  const calculatedPendingCommission = useMemo(() => {
    const referralRowsPending = referrals.reduce(
      (total, referral) =>
        total + referral.pendingCommission,
      0
    );

    return Math.max(
      userPendingCommission,
      referralRowsPending
    );
  }, [referrals, userPendingCommission]);

  async function handleCopy() {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-gray-900">
            {pageText.title}
          </h1>

          <p className="mt-2 text-gray-600">
            {pageText.description}
          </p>

          {message && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-gray-600">
                {pageText.loading}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm md:p-8">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {pageText.referralLink}
                    </h2>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        readOnly
                        value={referralLink}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 text-gray-900"
                      />

                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!referralLink}
                        className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {copied
                          ? pageText.copied
                          : pageText.copy}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-5 py-4">
                    <p className="text-sm text-gray-500">
                      {pageText.referralCode}
                    </p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {referralCode || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  <div className="rounded-xl bg-blue-50 p-6 text-center">
                    <h3 className="text-gray-600">
                      {pageText.totalReferrals}
                    </h3>

                    <p className="mt-3 text-3xl font-bold text-gray-900">
                      {referrals.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-6 text-center">
                    <h3 className="text-gray-600">
                      {pageText.totalEarnings}
                    </h3>

                    <p className="mt-3 text-3xl font-bold text-gray-900">
                      {formatFromUSD(
                        calculatedTotalEarnings
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-yellow-50 p-6 text-center">
                    <h3 className="text-gray-600">
                      {pageText.pendingCommission}
                    </h3>

                    <p className="mt-3 text-3xl font-bold text-gray-900">
                      {formatFromUSD(
                        calculatedPendingCommission
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-5">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {pageText.history}
                  </h2>
                </div>

                {referrals.length === 0 ? (
                  <div className="p-10 text-center text-gray-600">
                    {pageText.noReferrals}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-sm text-gray-600">
                          <th className="px-6 py-4 font-semibold">
                            {pageText.referredUser}
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            {pageText.joined}
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            {pageText.status}
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            {pageText.earned}
                          </th>
                          <th className="px-6 py-4 font-semibold">
                            {pageText.pending}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {referrals.map((referral) => (
                          <tr
                            key={referral.id}
                            className="text-sm text-gray-700"
                          >
                            <td className="px-6 py-5 font-semibold text-gray-900">
                              {referral.referredUserName}
                            </td>

                            <td className="px-6 py-5 text-gray-500">
                              {formatDate(
                                referral.createdAt
                              )}
                            </td>

                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  referral.status ===
                                  "completed"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {referral.status ===
                                "completed"
                                  ? pageText.completed
                                  : pageText.active}
                              </span>
                            </td>

                            <td className="px-6 py-5 font-semibold text-green-700">
                              {formatFromUSD(
                                referral.totalEarned
                              )}
                            </td>

                            <td className="px-6 py-5 font-semibold text-yellow-700">
                              {formatFromUSD(
                                referral.pendingCommission
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}