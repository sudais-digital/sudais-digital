"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLanguage } from "../components/LanguageProvider";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";

type MembershipPlan = "Free" | "Pro" | "Business";
type AnalyticsRange = 7 | 30;

type AdminStats = {
  totalOrders: number;
  totalUsers: number;
  totalOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  totalDeposits: number;
  approvedDepositAmount: number;
  pendingDeposits: number;
  pendingDepositAmount: number;
  freeMembers: number;
  proMembers: number;
  businessMembers: number;
  premiumMembers: number;
  pendingPremiumRequests: number;
};

type RecentOrder = {
  id: string;
  userEmail: string;
  serviceName: string;
  status: string;
  charge: number;
  createdAt: Date | null;
};

type RecentDeposit = {
  id: string;
  userEmail: string;
  method: string;
  status: string;
  amount: number;
  createdAt: Date | null;
};


type AnalyticsOrder = {
  id: string;
  serviceName: string;
  status: string;
  charge: number;
  createdAt: Date | null;
};

type AnalyticsDeposit = {
  id: string;
  method: string;
  status: string;
  amount: number;
  createdAt: Date | null;
};

type ChartPoint = {
  label: string;
  value: number;
};

type RecentUser = {
  id: string;
  email: string;
  fullName: string;
  membership: MembershipPlan;
  createdAt: Date | null;
};

type AdminText = {
  checkingAccess: string;
  title: string;
  welcome: string;
  overview: string;
  quickActions: string;
  recentOrders: string;
  recentDeposits: string;
  newestUsers: string;
  viewAll: string;
  noData: string;
  backToDashboard: string;
  totalOrders: string;
  totalUsers: string;
  totalOrderValue: string;
  pendingOrders: string;
  completedOrders: string;
  approvedDeposits: string;
  pendingDeposits: string;
  premiumMembers: string;
  proMembers: string;
  businessMembers: string;
  freeMembers: string;
  pendingPremiumRequests: string;
  manageOrders: string;
  manageUsers: string;
  manageServices: string;
  manageProviders: string;
  fundRequests: string;
  premiumRequests: string;
  usersError: string;
  ordersError: string;
  depositsError: string;
  premiumError: string;
  accessError: string;
};

const translations: Record<string, AdminText> = {
  en: {
    checkingAccess: "Checking admin access...",
    title: "Sudais Digital Admin Panel",
    welcome: "Welcome Admin 👑",
    overview: "Business Overview",
    quickActions: "Quick Actions",
    recentOrders: "Recent Orders",
    recentDeposits: "Recent Deposits",
    newestUsers: "Newest Users",
    viewAll: "View All",
    noData: "No data available.",
    backToDashboard: "User Dashboard",
    totalOrders: "Total Orders",
    totalUsers: "Total Users",
    totalOrderValue: "Total Order Value",
    pendingOrders: "Pending Orders",
    completedOrders: "Completed Orders",
    approvedDeposits: "Approved Deposits",
    pendingDeposits: "Pending Deposits",
    premiumMembers: "Premium Members",
    proMembers: "Pro Members",
    businessMembers: "Business Members",
    freeMembers: "Free Members",
    pendingPremiumRequests: "Pending Premium Requests",
    manageOrders: "Manage Orders",
    manageUsers: "Manage Users",
    manageServices: "Manage Services",
    manageProviders: "Manage Providers",
    fundRequests: "Fund Requests",
    premiumRequests: "Premium Requests",
    usersError: "User statistics could not be loaded.",
    ordersError: "Order statistics could not be loaded.",
    depositsError: "Deposit statistics could not be loaded.",
    premiumError: "Premium request statistics could not be loaded.",
    accessError: "Admin access could not be verified.",
  },
  romanUrdu: {
    checkingAccess: "Admin access check ho raha hai...",
    title: "Sudais Digital Admin Panel",
    welcome: "Khush Amdeed Admin 👑",
    overview: "Business Overview",
    quickActions: "Quick Actions",
    recentOrders: "Recent Orders",
    recentDeposits: "Recent Deposits",
    newestUsers: "Naye Users",
    viewAll: "Sab Dekhein",
    noData: "Abhi koi data available nahi.",
    backToDashboard: "User Dashboard",
    totalOrders: "Total Orders",
    totalUsers: "Total Users",
    totalOrderValue: "Total Order Value",
    pendingOrders: "Pending Orders",
    completedOrders: "Completed Orders",
    approvedDeposits: "Approved Deposits",
    pendingDeposits: "Pending Deposits",
    premiumMembers: "Premium Members",
    proMembers: "Pro Members",
    businessMembers: "Business Members",
    freeMembers: "Free Members",
    pendingPremiumRequests: "Pending Premium Requests",
    manageOrders: "Orders Manage Karein",
    manageUsers: "Users Manage Karein",
    manageServices: "Services Manage Karein",
    manageProviders: "Providers Manage Karein",
    fundRequests: "Fund Requests",
    premiumRequests: "Premium Requests",
    usersError: "Users ki statistics load nahi ho sakin.",
    ordersError: "Orders ki statistics load nahi ho sakin.",
    depositsError: "Deposits ki statistics load nahi ho sakin.",
    premiumError: "Premium requests load nahi ho sakin.",
    accessError: "Admin access verify nahi ho saka.",
  },
  ur: {
    checkingAccess: "ایڈمن رسائی چیک کی جا رہی ہے...",
    title: "سدیس ڈیجیٹل ایڈمن پینل",
    welcome: "خوش آمدید ایڈمن 👑",
    overview: "کاروباری جائزہ",
    quickActions: "فوری اقدامات",
    recentOrders: "حالیہ آرڈرز",
    recentDeposits: "حالیہ ڈپازٹس",
    newestUsers: "نئے صارفین",
    viewAll: "سب دیکھیں",
    noData: "کوئی ڈیٹا دستیاب نہیں۔",
    backToDashboard: "یوزر ڈیش بورڈ",
    totalOrders: "کل آرڈرز",
    totalUsers: "کل صارفین",
    totalOrderValue: "آرڈرز کی کل مالیت",
    pendingOrders: "زیر التوا آرڈرز",
    completedOrders: "مکمل آرڈرز",
    approvedDeposits: "منظور شدہ ڈپازٹس",
    pendingDeposits: "زیر التوا ڈپازٹس",
    premiumMembers: "پریمیم ممبرز",
    proMembers: "پرو ممبرز",
    businessMembers: "بزنس ممبرز",
    freeMembers: "فری ممبرز",
    pendingPremiumRequests: "زیر التوا پریمیم درخواستیں",
    manageOrders: "آرڈرز مینیج کریں",
    manageUsers: "صارفین مینیج کریں",
    manageServices: "سروسز مینیج کریں",
    manageProviders: "پرووائیڈرز مینیج کریں",
    fundRequests: "فنڈ درخواستیں",
    premiumRequests: "پریمیم درخواستیں",
    usersError: "صارفین کے اعداد و شمار لوڈ نہیں ہو سکے۔",
    ordersError: "آرڈرز کے اعداد و شمار لوڈ نہیں ہو سکے۔",
    depositsError: "ڈپازٹس کے اعداد و شمار لوڈ نہیں ہو سکے۔",
    premiumError: "پریمیم درخواستیں لوڈ نہیں ہو سکیں۔",
    accessError: "ایڈمن رسائی کی تصدیق نہیں ہو سکی۔",
  },
};

function normalizeMembership(value: unknown): MembershipPlan {
  const plan = String(value ?? "Free").trim().toLowerCase();

  if (plan === "business") return "Business";
  if (plan === "pro" || plan === "premium") return "Pro";
  return "Free";
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";

  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function statusClasses(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (["completed", "complete", "approved"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    [
      "pending",
      "processing",
      "pending submission",
      "submitting to provider",
    ].includes(normalized)
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (["rejected", "cancelled", "canceled", "failed"].includes(normalized)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

function membershipClasses(plan: MembershipPlan): string {
  if (plan === "Business") return "bg-purple-100 text-purple-700";
  if (plan === "Pro") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function sortByCreatedAt<T extends { createdAt: Date | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "complete"].includes(status.trim().toLowerCase());
}

function buildDailyRevenue(
  orders: AnalyticsOrder[],
  days: number
): ChartPoint[] {
  const today = startOfDay(new Date());
  const points: ChartPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);

    const value = orders.reduce((total, order) => {
      if (!order.createdAt || !isCompletedStatus(order.status)) return total;
      return isSameDay(order.createdAt, day) ? total + order.charge : total;
    }, 0);

    points.push({
      label: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value,
    });
  }

  return points;
}

export default function AdminPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const pageText = translations[String(language)] ?? translations.en;

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    totalUsers: 0,
    totalOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalDeposits: 0,
    approvedDepositAmount: 0,
    pendingDeposits: 0,
    pendingDepositAmount: 0,
    freeMembers: 0,
    proMembers: 0,
    businessMembers: 0,
    premiumMembers: 0,
    pendingPremiumRequests: 0,
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [analyticsOrders, setAnalyticsOrders] = useState<AnalyticsOrder[]>([]);
  const [analyticsDeposits, setAnalyticsDeposits] = useState<AnalyticsDeposit[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>(7);

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeDeposits: (() => void) | undefined;
    let unsubscribePremiumRequests: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const userDocument = await getDoc(doc(db, "users", currentUser.uid));

        if (!userDocument.exists() || userDocument.data().role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setCheckingAccess(false);

        unsubscribeUsers = onSnapshot(
          collection(db, "users"),
          (snapshot) => {
            let freeMembers = 0;
            let proMembers = 0;
            let businessMembers = 0;

            const users: RecentUser[] = snapshot.docs.map((userDocument) => {
              const data = userDocument.data();
              const membership = normalizeMembership(
                data.membership ?? data.premiumPlan
              );

              if (membership === "Business") businessMembers += 1;
              else if (membership === "Pro") proMembers += 1;
              else freeMembers += 1;

              return {
                id: userDocument.id,
                email: String(data.email ?? "No email"),
                fullName: String(data.fullName ?? data.name ?? "Unnamed User"),
                membership,
                createdAt: toDate(data.createdAt ?? data.registeredAt),
              };
            });

            setRecentUsers(sortByCreatedAt(users).slice(0, 5));

            setStats((currentStats) => ({
              ...currentStats,
              totalUsers: snapshot.size,
              freeMembers,
              proMembers,
              businessMembers,
              premiumMembers: proMembers + businessMembers,
            }));
          },
          (error) => {
            console.error("Users statistics error:", error);
            toast.error(pageText.usersError);
          }
        );

        unsubscribeOrders = onSnapshot(
          collection(db, "orders"),
          (snapshot) => {
            let totalOrderValue = 0;
            let pendingOrders = 0;
            let completedOrders = 0;

            const orders: RecentOrder[] = snapshot.docs.map(
              (orderDocument: QueryDocumentSnapshot<DocumentData>) => {
                const data = orderDocument.data();
                const charge = Number(
                  data.charge ?? data.totalCharge ?? data.amount ?? 0
                );
                const status = String(data.status ?? "Pending");
                const normalizedStatus = status.trim().toLowerCase();

                if (Number.isFinite(charge)) totalOrderValue += charge;

                if (
                  [
                    "pending",
                    "processing",
                    "pending submission",
                    "submitting to provider",
                  ].includes(normalizedStatus)
                ) {
                  pendingOrders += 1;
                }

                if (["completed", "complete"].includes(normalizedStatus)) {
                  completedOrders += 1;
                }

                return {
                  id: orderDocument.id,
                  userEmail: String(
                    data.userEmail ?? data.email ?? data.userId ?? "Unknown User"
                  ),
                  serviceName: String(
                    data.serviceName ?? data.service ?? data.serviceId ?? "Service"
                  ),
                  status,
                  charge: Number.isFinite(charge) ? charge : 0,
                  createdAt: toDate(data.createdAt ?? data.orderDate),
                };
              }
            );

            setRecentOrders(sortByCreatedAt(orders).slice(0, 5));
            setAnalyticsOrders(
              orders.map((order) => ({
                id: order.id,
                serviceName: order.serviceName,
                status: order.status,
                charge: order.charge,
                createdAt: order.createdAt,
              }))
            );

            setStats((currentStats) => ({
              ...currentStats,
              totalOrders: snapshot.size,
              totalOrderValue,
              pendingOrders,
              completedOrders,
            }));

            setLoadingStats(false);
          },
          (error) => {
            console.error("Orders statistics error:", error);
            setLoadingStats(false);
            toast.error(pageText.ordersError);
          }
        );

        unsubscribeDeposits = onSnapshot(
          collection(db, "fundRequests"),
          (snapshot) => {
            let approvedDepositAmount = 0;
            let pendingDepositAmount = 0;
            let pendingDeposits = 0;

            const deposits: RecentDeposit[] = snapshot.docs.map(
              (depositDocument) => {
                const data = depositDocument.data();
                const status = String(data.status ?? "Pending");
                const normalizedStatus = status.trim().toLowerCase();

                const originalAmount = Number(
                  data.amount ?? data.depositAmount ?? 0
                );

                const currency = String(
                  data.currency ?? data.originalCurrency ?? "USD"
                ).toUpperCase();

                const approvedAmountUSD = Number(
                  data.creditedUSD ?? data.amountUSD ?? 0
                );

                const pendingAmountUSD =
                  currency === "USD" || currency === "USDT"
                    ? originalAmount
                    : 0;

                if (
                  normalizedStatus === "approved" &&
                  Number.isFinite(approvedAmountUSD)
                ) {
                  approvedDepositAmount += approvedAmountUSD;
                }

                if (normalizedStatus === "pending") {
                  pendingDeposits += 1;

                  if (Number.isFinite(pendingAmountUSD)) {
                    pendingDepositAmount += pendingAmountUSD;
                  }
                }

                const displayAmount =
                  normalizedStatus === "approved"
                    ? approvedAmountUSD
                    : pendingAmountUSD;

                return {
                  id: depositDocument.id,
                  userEmail: String(
                    data.userEmail ?? data.email ?? data.userId ?? "Unknown User"
                  ),
                  method: String(
                    data.paymentMethod ?? data.method ?? "Payment Method"
                  ),
                  status,
                  amount: Number.isFinite(displayAmount) ? displayAmount : 0,
                  createdAt: toDate(data.createdAt ?? data.requestedAt),
                };
              }
            );

            setRecentDeposits(sortByCreatedAt(deposits).slice(0, 5));
            setAnalyticsDeposits(
              deposits.map((deposit) => ({
                id: deposit.id,
                method: deposit.method,
                status: deposit.status,
                amount: deposit.amount,
                createdAt: deposit.createdAt,
              }))
            );

            setStats((currentStats) => ({
              ...currentStats,
              totalDeposits: snapshot.size,
              approvedDepositAmount,
              pendingDeposits,
              pendingDepositAmount,
            }));
          },
          (error) => {
            console.error("Deposit statistics error:", error);
            toast.error(pageText.depositsError);
          }
        );

        unsubscribePremiumRequests = onSnapshot(
          collection(db, "premiumRequests"),
          (snapshot) => {
            const pendingPremiumRequests = snapshot.docs.filter((request) => {
              const status = String(request.data().status ?? "Pending")
                .trim()
                .toLowerCase();
              return status === "pending";
            }).length;

            setStats((currentStats) => ({
              ...currentStats,
              pendingPremiumRequests,
            }));
          },
          (error) => {
            console.error("Premium statistics error:", error);
            toast.error(pageText.premiumError);
          }
        );
      } catch (error) {
        console.error("Admin access error:", error);
        toast.error(pageText.accessError);
        router.replace("/dashboard");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsers?.();
      unsubscribeOrders?.();
      unsubscribeDeposits?.();
      unsubscribePremiumRequests?.();
    };
  }, [
    router,
    pageText.accessError,
    pageText.depositsError,
    pageText.ordersError,
    pageText.premiumError,
    pageText.usersError,
  ]);

  const orderCompletionRate = useMemo(() => {
    if (stats.totalOrders === 0) return 0;
    return Math.min(
      100,
      Math.round((stats.completedOrders / stats.totalOrders) * 100)
    );
  }, [stats.completedOrders, stats.totalOrders]);

  const premiumShare = useMemo(() => {
    if (stats.totalUsers === 0) return 0;
    return Math.min(
      100,
      Math.round((stats.premiumMembers / stats.totalUsers) * 100)
    );
  }, [stats.premiumMembers, stats.totalUsers]);

  const revenueAnalytics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const completedOrders = analyticsOrders.filter((order) =>
      isCompletedStatus(order.status)
    );

    const sumFrom = (start: Date, end?: Date) =>
      completedOrders.reduce((total, order) => {
        if (!order.createdAt || order.createdAt < start) return total;
        if (end && order.createdAt > end) return total;
        return total + order.charge;
      }, 0);

    const todayRevenue = sumFrom(todayStart);
    const weekRevenue = sumFrom(weekStart);
    const monthRevenue = sumFrom(monthStart);
    const previousMonthRevenue = sumFrom(previousMonthStart, previousMonthEnd);
    const totalRevenue = completedOrders.reduce(
      (total, order) => total + order.charge,
      0
    );

    const todayOrders = completedOrders.filter(
      (order) => order.createdAt && isSameDay(order.createdAt, now)
    ).length;

    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const growth =
      previousMonthRevenue > 0
        ? ((monthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : monthRevenue > 0
          ? 100
          : 0;

    const serviceTotals = new Map<string, { revenue: number; orders: number }>();
    completedOrders.forEach((order) => {
      const current = serviceTotals.get(order.serviceName) ?? {
        revenue: 0,
        orders: 0,
      };
      current.revenue += order.charge;
      current.orders += 1;
      serviceTotals.set(order.serviceName, current);
    });

    const topServices = Array.from(serviceTotals.entries())
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentMethods = new Map<string, number>();
    analyticsDeposits.forEach((deposit) => {
      if (deposit.status.trim().toLowerCase() !== "approved") return;
      paymentMethods.set(
        deposit.method,
        (paymentMethods.get(deposit.method) ?? 0) + deposit.amount
      );
    });

    const depositMethods = Array.from(paymentMethods.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalRevenue,
      todayOrders,
      averageOrderValue,
      growth,
      topServices,
      depositMethods,
      chartData: buildDailyRevenue(completedOrders, analyticsRange),
    };
  }, [analyticsDeposits, analyticsOrders, analyticsRange]);

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-center text-lg font-medium text-gray-600">
            {pageText.checkingAccess}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Admin Control Center
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
              {pageText.title}
            </h1>
            <p className="mt-3 text-gray-600">{pageText.welcome}</p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {pageText.backToDashboard}
          </Link>
        </div>

        <section className="mt-8 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-medium text-blue-200">
                {pageText.overview}
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                Sudais Digital Performance
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Orders, users, deposits aur memberships ki latest real-time
                statistics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniHeroStat
                label="Order Completion"
                value={`${orderCompletionRate}%`}
              />
              <MiniHeroStat label="Premium Share" value={`${premiumShare}%`} />
              <MiniHeroStat
                label="Pending Reviews"
                value={String(
                  stats.pendingDeposits + stats.pendingPremiumRequests
                )}
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900">
            {pageText.quickActions}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <QuickAction href="/admin/orders" icon="📦" label={pageText.manageOrders} />
            <QuickAction href="/admin/users" icon="👥" label={pageText.manageUsers} />
            <QuickAction href="/admin/services" icon="⭐" label={pageText.manageServices} />
            <QuickAction href="/admin/providers" icon="🔌" label={pageText.manageProviders} />
            <QuickAction href="/admin/fund-requests" icon="💳" label={pageText.fundRequests} />
            <QuickAction href="/admin/premium-requests" icon="💎" label={pageText.premiumRequests} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900">{pageText.overview}</h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={pageText.totalUsers}
              value={loadingStats ? "..." : String(stats.totalUsers)}
              icon="👥"
              accent="blue"
              description={`${stats.freeMembers} free users`}
            />
            <StatCard
              title={pageText.totalOrders}
              value={loadingStats ? "..." : String(stats.totalOrders)}
              icon="📦"
              accent="indigo"
              description={`${stats.completedOrders} completed`}
            />
            <StatCard
              title={pageText.totalOrderValue}
              value={loadingStats ? "..." : formatMoney(stats.totalOrderValue)}
              icon="💰"
              accent="purple"
              description="Submitted order value"
            />
            <StatCard
              title={pageText.approvedDeposits}
              value={formatMoney(stats.approvedDepositAmount)}
              icon="✅"
              accent="emerald"
              description={`${stats.totalDeposits} total requests`}
            />
            <StatCard
              title={pageText.pendingOrders}
              value={String(stats.pendingOrders)}
              icon="⏳"
              accent="amber"
              description="Waiting or processing"
            />
            <StatCard
              title={pageText.pendingDeposits}
              value={String(stats.pendingDeposits)}
              icon="💳"
              accent="orange"
              description={formatMoney(stats.pendingDepositAmount)}
            />
            <StatCard
              title={pageText.premiumMembers}
              value={String(stats.premiumMembers)}
              icon="💎"
              accent="cyan"
              description={`${stats.proMembers} Pro · ${stats.businessMembers} Business`}
            />
            <StatCard
              title={pageText.pendingPremiumRequests}
              value={String(stats.pendingPremiumRequests)}
              icon="👑"
              accent="rose"
              description="Waiting for admin review"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
              <p className="mt-1 text-sm text-gray-500">
                Completed orders ki real-time USD revenue performance.
              </p>
            </div>

            <select
              value={analyticsRange}
              onChange={(event) =>
                setAnalyticsRange(Number(event.target.value) as AnalyticsRange)
              }
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Today's Revenue"
              value={formatMoney(revenueAnalytics.todayRevenue)}
              icon="☀️"
              accent="emerald"
              description={`${revenueAnalytics.todayOrders} completed orders today`}
            />
            <StatCard
              title="Last 7 Days Revenue"
              value={formatMoney(revenueAnalytics.weekRevenue)}
              icon="📅"
              accent="blue"
              description="Rolling 7-day completed revenue"
            />
            <StatCard
              title="This Month Revenue"
              value={formatMoney(revenueAnalytics.monthRevenue)}
              icon="📆"
              accent="purple"
              description={`${revenueAnalytics.growth >= 0 ? "+" : ""}${revenueAnalytics.growth.toFixed(1)}% vs previous month`}
            />
            <StatCard
              title="Average Order Value"
              value={formatMoney(revenueAnalytics.averageOrderValue)}
              icon="🧾"
              accent="cyan"
              description={`${stats.completedOrders} completed orders`}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
            <RevenueChart
              title={`Revenue Trend — ${analyticsRange} Days`}
              data={revenueAnalytics.chartData}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Completed Revenue</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">
                {formatMoney(revenueAnalytics.totalRevenue)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Sirf completed orders se calculate ki gayi hai.
              </p>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className="text-sm font-bold text-gray-900">Top Services</p>
                <div className="mt-3 space-y-3">
                  {revenueAnalytics.topServices.length === 0 ? (
                    <p className="text-sm text-gray-500">Abhi completed order data nahi.</p>
                  ) : (
                    revenueAnalytics.topServices.map((service, index) => (
                      <div key={service.name} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {index + 1}. {service.name}
                          </p>
                          <p className="text-xs text-gray-500">{service.orders} orders</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-gray-900">
                          {formatMoney(service.revenue)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Approved Deposits by Method</h3>
            <p className="mt-1 text-sm text-gray-500">USD credited amount ke mutabiq.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {revenueAnalytics.depositMethods.length === 0 ? (
                <p className="text-sm text-gray-500">Abhi approved deposits nahi hain.</p>
              ) : (
                revenueAnalytics.depositMethods.map((method) => (
                  <div key={method.name} className="rounded-xl bg-gray-50 p-4">
                    <p className="truncate text-sm font-semibold text-gray-700">{method.name}</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">
                      {formatMoney(method.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ProgressCard
            title="Order Performance"
            description={`${stats.completedOrders} completed out of ${stats.totalOrders} orders`}
            percentage={orderCompletionRate}
            footer={`${stats.pendingOrders} orders abhi pending ya processing mein hain.`}
          />
          <ProgressCard
            title="Membership Growth"
            description={`${stats.premiumMembers} premium users out of ${stats.totalUsers}`}
            percentage={premiumShare}
            footer={`${stats.proMembers} Pro, ${stats.businessMembers} Business aur ${stats.freeMembers} Free members.`}
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <DataPanel
            title={pageText.recentOrders}
            viewAllHref="/admin/orders"
            viewAllText={pageText.viewAll}
          >
            {recentOrders.length === 0 ? (
              <EmptyState text={pageText.noData} />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {order.serviceName}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {order.userEmail}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatMoney(order.charge)}
                      </span>
                      <span className="text-gray-500">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataPanel>

          <DataPanel
            title={pageText.recentDeposits}
            viewAllHref="/admin/fund-requests"
            viewAllText={pageText.viewAll}
          >
            {recentDeposits.length === 0 ? (
              <EmptyState text={pageText.noData} />
            ) : (
              <div className="space-y-3">
                {recentDeposits.map((deposit) => (
                  <div key={deposit.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {deposit.method}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {deposit.userEmail}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(deposit.status)}`}>
                        {deposit.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatMoney(deposit.amount)}
                      </span>
                      <span className="text-gray-500">{formatDate(deposit.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataPanel>

          <DataPanel
            title={pageText.newestUsers}
            viewAllHref="/admin/users"
            viewAllText={pageText.viewAll}
          >
            {recentUsers.length === 0 ? (
              <EmptyState text={pageText.noData} />
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">
                          {user.fullName}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {user.email}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${membershipClasses(user.membership)}`}>
                        {user.membership}
                      </span>
                    </div>
                    <p className="mt-3 text-right text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DataPanel>
        </section>
      </div>
    </main>
  );
}

type RevenueChartProps = {
  title: string;
  data: ChartPoint[];
};

function RevenueChart({ title, data }: RevenueChartProps) {
  const maximum = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">Daily completed order revenue</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          Live
        </span>
      </div>

      <div className="mt-8 flex h-64 items-end gap-1.5 overflow-x-auto pb-2 sm:gap-2">
        {data.map((point) => {
          const height = point.value > 0 ? Math.max((point.value / maximum) * 100, 5) : 2;

          return (
            <div
              key={point.label}
              className="group flex min-w-[34px] flex-1 flex-col items-center justify-end"
            >
              <div className="relative flex h-52 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-blue-600 transition hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${formatMoney(point.value)}`}
                />
              </div>
              <span className="mt-2 whitespace-nowrap text-[10px] text-gray-500">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MiniHeroStatProps = {
  label: string;
  value: string;
};

function MiniHeroStat({ label, value }: MiniHeroStatProps) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs text-blue-200">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

type QuickActionProps = {
  href: string;
  icon: string;
  label: string;
};

function QuickAction({ href, icon, label }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-gray-800 group-hover:text-blue-700">
        {label}
      </p>
    </Link>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  icon: string;
  accent:
    | "blue"
    | "indigo"
    | "purple"
    | "emerald"
    | "amber"
    | "orange"
    | "cyan"
    | "rose";
  description: string;
};

const accentClasses: Record<StatCardProps["accent"], string> = {
  blue: "bg-blue-100 text-blue-700",
  indigo: "bg-indigo-100 text-indigo-700",
  purple: "bg-purple-100 text-purple-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  orange: "bg-orange-100 text-orange-700",
  cyan: "bg-cyan-100 text-cyan-700",
  rose: "bg-rose-100 text-rose-700",
};

function StatCard({
  title,
  value,
  icon,
  accent,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${accentClasses[accent]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 break-words text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

type ProgressCardProps = {
  title: string;
  description: string;
  percentage: number;
  footer: string;
};

function ProgressCard({
  title,
  description,
  percentage,
  footer,
}: ProgressCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <span className="text-2xl font-bold text-blue-700">{percentage}%</span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-700 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-4 text-sm text-gray-600">{footer}</p>
    </div>
  );
}

type DataPanelProps = {
  title: string;
  viewAllHref: string;
  viewAllText: string;
  children: React.ReactNode;
};

function DataPanel({
  title,
  viewAllHref,
  viewAllText,
  children,
}: DataPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <Link
          href={viewAllHref}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          {viewAllText}
        </Link>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}