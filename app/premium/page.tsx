"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import { auth, db } from "../lib/firebase";

type MembershipPlan = "Free" | "Pro" | "Business";

type UserMembership = {
  plan: MembershipPlan;
  status: "active" | "expired" | "pending";
  startedAt: Date | null;
  expiresAt: Date | null;
};

type Plan = {
  name: MembershipPlan;
  price: number;
  duration: string;
  description: string;
  badge?: string;
  features: string[];
  buttonText: string;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: 0,
    duration: "forever",
    description: "Perfect for testing Sudais Digital and placing regular orders.",
    features: [
      "Access to standard services",
      "Standard order processing",
      "Wallet and deposit access",
      "Referral earnings",
      "Basic customer support",
    ],
    buttonText: "Current Free Plan",
  },
  {
    name: "Pro",
    price: 9.99,
    duration: "30 days",
    description: "Best for creators, freelancers and growing social media pages.",
    badge: "Most Popular",
    features: [
      "Everything included in Free",
      "Access to Pro-only services",
      "Lower service prices",
      "Priority order processing",
      "Priority customer support",
      "Premium member badge",
    ],
    buttonText: "Upgrade to Pro",
  },
  {
    name: "Business",
    price: 24.99,
    duration: "30 days",
    description: "Built for agencies, resellers and high-volume customers.",
    badge: "Best Value",
    features: [
      "Everything included in Pro",
      "Access to all premium services",
      "Best available service prices",
      "Highest order priority",
      "Business customer support",
      "High-volume ordering benefits",
    ],
    buttonText: "Upgrade to Business",
  },
];

function normalizeMembership(value: unknown): MembershipPlan {
  const membership = String(value ?? "Free").trim().toLowerCase();

  if (membership === "business") {
    return "Business";
  }

  if (membership === "pro" || membership === "premium") {
    return "Pro";
  }

  return "Free";
}

function convertToDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  const parsedDate = new Date(String(value));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not available";
  }

  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PremiumPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [membership, setMembership] = useState<UserMembership>({
    plan: "Free",
    status: "active",
    startedAt: null,
    expiresAt: null,
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
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
            const data = userDocument.data();
            const plan = normalizeMembership(
              data.membershipPlan ?? data.membership
            );

            const startedAt = convertToDate(
              data.membershipStartedAt ??
                data.premiumStartedAt ??
                data.membershipStartDate
            );

            const expiresAt = convertToDate(
              data.membershipExpiresAt ??
                data.premiumExpiresAt ??
                data.membershipExpiryDate
            );

            const isExpired =
              plan !== "Free" &&
              expiresAt !== null &&
              expiresAt.getTime() <= Date.now();

            const savedStatus = String(
              data.membershipStatus ?? "active"
            ).toLowerCase();

            setMembership({
              plan: isExpired ? "Free" : plan,
              status: isExpired
                ? "expired"
                : savedStatus === "pending"
                  ? "pending"
                  : "active",
              startedAt,
              expiresAt,
            });
          }
        } catch (error) {
          console.error("Premium membership load error:", error);
        } finally {
          setCheckingAuth(false);
        }
      },
      (error) => {
        console.error("Premium auth error:", error);
        setCheckingAuth(false);
      }
    );

    return () => unsubscribeAuth();
  }, [router]);

  const activePlanIndex = useMemo(() => {
    return plans.findIndex((plan) => plan.name === membership.plan);
  }, [membership.plan]);

  function handlePlanAction(plan: MembershipPlan) {
    if (plan === membership.plan) {
      return;
    }

    if (plan === "Free") {
      return;
    }

    router.push(`/premium/request?plan=${encodeURIComponent(plan)}`);
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-lg font-medium text-gray-600">
            Loading membership...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-800">
                Premium Membership
              </h1>

              <p className="text-sm text-gray-500">
                Upgrade your Sudais Digital account.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-gray-800">
                {user?.email}
              </p>

              <p className="text-xs font-medium text-blue-700">
                {membership.plan} Member
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-800 to-indigo-700 px-6 py-10 text-white shadow-lg md:px-10">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                Sudais Digital Membership
              </span>

              <h2 className="mt-5 text-3xl font-bold md:text-4xl">
                Get better prices, priority processing and premium services.
              </h2>

              <p className="mt-4 max-w-2xl text-blue-100">
                Choose the membership that matches your order volume and
                business needs.
              </p>
            </div>
          </section>

          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current membership
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {membership.plan}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      membership.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : membership.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {membership.status.charAt(0).toUpperCase() +
                      membership.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-gray-500">Started</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {membership.plan === "Free"
                      ? "Account creation"
                      : formatDate(membership.startedAt)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-gray-500">Expires</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {membership.plan === "Free"
                      ? "Never"
                      : formatDate(membership.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">
                Choose your plan
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-gray-600">
                All paid plans are activated after payment verification by
                the admin.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const isCurrentPlan = plan.name === membership.plan;
                const isLowerPlan = index < activePlanIndex;
                const isFeatured = plan.name === "Pro";

                return (
                  <article
                    key={plan.name}
                    className={`relative flex flex-col rounded-3xl border bg-white p-7 shadow-sm ${
                      isFeatured
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200"
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute right-5 top-5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {plan.name}
                      </h3>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-gray-600">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mt-6">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price.toFixed(2)}
                      </span>

                      <span className="ml-2 text-sm text-gray-500">
                        / {plan.duration}
                      </span>
                    </div>

                    <ul className="mt-7 flex-1 space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            ✓
                          </span>

                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => handlePlanAction(plan.name)}
                      disabled={
                        isCurrentPlan ||
                        plan.name === "Free" ||
                        isLowerPlan ||
                        membership.status === "pending"
                      }
                      className={`mt-8 rounded-xl px-5 py-3 font-semibold transition ${
                        isCurrentPlan
                          ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                          : plan.name === "Free" || isLowerPlan
                            ? "cursor-not-allowed bg-gray-100 text-gray-400"
                            : membership.status === "pending"
                              ? "cursor-not-allowed bg-amber-100 text-amber-700"
                              : "bg-blue-700 text-white hover:bg-blue-800"
                      }`}
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : membership.status === "pending"
                          ? "Request Pending"
                          : isLowerPlan
                            ? "Lower Plan"
                            : plan.buttonText}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-bold text-amber-900">
              Important information
            </h3>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Paid membership starts after admin approval. Membership payments
              and requests will be handled in the next Premium System phase.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}