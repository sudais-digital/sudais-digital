"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import ThemeToggle from "../components/ThemeToggle";
import { useCurrency } from "../components/CurrencyProvider";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";

type MembershipPlan = "Free" | "Pro" | "Business";

type MembershipState = {
  plan: MembershipPlan;
  status: "Free" | "Active" | "Expired";
  startDate: Timestamp | null;
  expiryDate: Timestamp | null;
  remainingDays: number;
};

function normalizeMembership(value: unknown): MembershipPlan {
  const membership = String(value ?? "Free").toLowerCase();

  if (membership === "business") {
    return "Business";
  }

  if (membership === "pro" || membership === "premium") {
    return "Pro";
  }

  return "Free";
}

function calculateMembershipState(
  planValue: unknown,
  startDateValue: unknown,
  expiryDateValue: unknown
): MembershipState {
  const plan = normalizeMembership(planValue);

  const startDate =
    startDateValue instanceof Timestamp
      ? startDateValue
      : null;

  const expiryDate =
    expiryDateValue instanceof Timestamp
      ? expiryDateValue
      : null;

  if (plan === "Free") {
    return {
      plan: "Free",
      status: "Free",
      startDate,
      expiryDate,
      remainingDays: 0,
    };
  }

  if (!expiryDate) {
    return {
      plan,
      status: "Active",
      startDate,
      expiryDate: null,
      remainingDays: 0,
    };
  }

  const now = new Date();
  const expiry = expiryDate.toDate();
  const difference = expiry.getTime() - now.getTime();
  const remainingDays = Math.max(
    0,
    Math.ceil(difference / (1000 * 60 * 60 * 24))
  );

  return {
    plan,
    status: difference > 0 ? "Active" : "Expired",
    startDate,
    expiryDate,
    remainingDays,
  };
}

function formatMembershipDate(value: Timestamp | null): string {
  if (!value) {
    return "Not available";
  }

  return value.toDate().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function membershipBadgeClass(
  status: MembershipState["status"]
): string {
  if (status === "Active") {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }

  if (status === "Expired") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function membershipCardClass(plan: MembershipPlan): string {
  if (plan === "Business") {
    return "border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:border-purple-800 dark:from-purple-950/50 dark:to-gray-900";
  }

  if (plan === "Pro") {
    return "border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-800 dark:from-blue-950/50 dark:to-gray-900";
  }

  return "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900";
}

export default function DashboardPage() {
  const router = useRouter();
  const { formatFromUSD, loadingCurrency } = useCurrency();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  const [membership, setMembership] =
    useState<MembershipState>({
      plan: "Free",
      status: "Free",
      startDate: null,
      expiryDate: null,
      remainingDays: 0,
    });

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribeUserDocument: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setCheckingAuth(false);
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        try {
          unsubscribeUserDocument = onSnapshot(
            doc(db, "users", currentUser.uid),
            (userDocument) => {
              if (!userDocument.exists()) {
                return;
              }

              const data = userDocument.data();

              setWalletBalance(
                Number(
                  data.wallet ??
                    data.walletBalance ??
                    data.walletUSD ??
                    data.balance ??
                    0
                )
              );

              setReferralEarnings(
                Number(
                  data.referralEarningsUSD ??
                    data.referralEarnings ??
                    0
                )
              );

              setMembership(
                calculateMembershipState(
                  data.membership ??
                    data.premiumPlan ??
                    "Free",
                  data.membershipStartDate,
                  data.membershipExpiryDate
                )
              );
            },
            (error) => {
              console.error(
                "Dashboard profile listener error:",
                error
              );
            }
          );
        } catch (error) {
          console.error(
            "Dashboard profile load error:",
            error
          );
        }

        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid)
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            setTotalOrders(snapshot.size);

            setPendingOrders(
              snapshot.docs.filter((orderDocument) => {
                const status = String(
                  orderDocument.data().status ?? "Pending"
                ).toLowerCase();

                return (
                  status === "pending" ||
                  status === "processing" ||
                  status === "pending submission" ||
                  status === "submitting to provider"
                );
              }).length
            );
          },
          (error) => {
            console.error(
              "Dashboard orders load error:",
              error
            );
          }
        );

        setCheckingAuth(false);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeOrders?.();
      unsubscribeUserDocument?.();
    };
  }, [router]);

  useEffect(() => {
    if (!membership.expiryDate) {
      return;
    }

    const interval = window.setInterval(() => {
      setMembership((current) =>
        calculateMembershipState(
          current.plan,
          current.startDate,
          current.expiryDate
        )
      );
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [membership.expiryDate]);

  const membershipAction = useMemo(() => {
    if (
      membership.plan === "Free" ||
      membership.status === "Expired"
    ) {
      return {
        label: "Upgrade Membership",
        path: "/premium",
      };
    }

    return {
      label: "Renew Membership",
      path: `/premium/request?plan=${membership.plan}`,
    };
  }, [membership.plan, membership.status]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  }

  if (checkingAuth || loadingCurrency) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open dashboard menu"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-xl text-gray-800 shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-blue-800 dark:text-blue-300 sm:text-2xl">
                  Dashboard
                </h1>
                <p className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
                  Welcome to Sudais Digital
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <ThemeToggle compact />

              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {membership.plan} Member
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:px-5 sm:text-base"
              >
                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </button>
            </div>
          </div>
        </header>

        <div className="w-full max-w-full p-4 sm:p-5 md:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Welcome back
              </h2>

              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Manage your orders, wallet, referrals and
                membership.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  router.push("/add-funds")
                }
                className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                Add Funds
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/new-order")
                }
                className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
              >
                New Order
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Wallet Balance"
              value={formatFromUSD(walletBalance)}
              description="Available balance"
              actionLabel="Add Funds"
              onAction={() =>
                router.push("/add-funds")
              }
            />

            <DashboardCard
              title="Total Orders"
              value={String(totalOrders)}
              description="All orders"
              actionLabel="View Orders"
              onAction={() =>
                router.push("/my-orders")
              }
            />

            <DashboardCard
              title="Pending Orders"
              value={String(pendingOrders)}
              description="Waiting or processing"
              actionLabel="Track Orders"
              onAction={() =>
                router.push("/my-orders")
              }
            />

            <DashboardCard
              title="Referral Earnings"
              value={formatFromUSD(
                referralEarnings
              )}
              description="Total commission"
            />
          </div>

          <section
            className={`mt-10 rounded-2xl border p-6 shadow-sm ${membershipCardClass(
              membership.plan
            )}`}
          >
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Membership
                  </h3>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${membershipBadgeClass(
                      membership.status
                    )}`}
                  >
                    {membership.status}
                  </span>
                </div>

                <p className="mt-2 text-4xl font-bold text-blue-800 dark:text-blue-300">
                  {membership.plan}
                </p>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {membership.plan === "Free"
                    ? "Upgrade karke premium tools aur benefits unlock karein."
                    : membership.status === "Expired"
                    ? "Aapki membership expire ho chuki hai. Renew karke benefits dobara activate karein."
                    : "Aapki premium membership active hai."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    membershipAction.path
                  )
                }
                className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 lg:w-auto"
              >
                {membershipAction.label}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MembershipInfoCard
                label="Current Plan"
                value={membership.plan}
              />

              <MembershipInfoCard
                label="Start Date"
                value={formatMembershipDate(
                  membership.startDate
                )}
              />

              <MembershipInfoCard
                label="Expiry Date"
                value={formatMembershipDate(
                  membership.expiryDate
                )}
              />

              <MembershipInfoCard
                label="Remaining Days"
                value={
                  membership.status === "Active"
                    ? String(
                        membership.remainingDays
                      )
                    : "0"
                }
              />
            </div>

            {membership.status === "Expired" && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                Membership expire ho chuki hai. Dashboard
                par plan record show hoga, lekin premium
                access renew hone tak active nahi hoga.
              </div>
            )}

            {membership.plan === "Free" && (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                Pro plan $9.99 aur Business plan $24.99
                per 30 days available hai.
              </div>
            )}
          </section>

          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Wallet & Deposits
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add balance using JazzCash, Easypaisa,
                  Binance USDT or bank transfer.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/add-funds")
                }
                className="w-full rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 sm:w-auto"
              >
                Create Deposit Request
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              Payment submit karne ke baad admin
              verification karega. Approval ke baad amount
              aapke wallet mein add hoga.
            </div>
          </section>

          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Orders
                </h3>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  View and manage your latest orders.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push("/new-order")
                }
                className="w-full rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 sm:w-auto"
              >
                New Order
              </button>
            </div>

            <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700 sm:p-10">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {totalOrders === 0
                  ? "No orders yet"
                  : `${totalOrders} order${
                      totalOrders === 1 ? "" : "s"
                    } available`}
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/my-orders")
                }
                className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
              >
                Open My Orders
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

type DashboardCardProps = {
  title: string;
  value: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function DashboardCard({
  title,
  value,
  description,
  actionLabel,
  onAction,
}: DashboardCardProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900 sm:p-6">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>

      <h3 className="mt-3 break-words text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
        {value}
      </h3>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 text-sm font-semibold text-blue-700 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

type MembershipInfoCardProps = {
  label: string;
  value: string;
};

function MembershipInfoCard({
  label,
  value,
}: MembershipInfoCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-800/80">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}