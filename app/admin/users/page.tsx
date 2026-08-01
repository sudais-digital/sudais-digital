"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useLanguage } from "../../components/LanguageProvider";
import { auth, db } from "../../lib/firebase";
import toast from "react-hot-toast";

type UserRecord = {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  wallet: number;
  referralBalance: number;
  membership: string;
  role: string;
  status: string;
  country: string;
  createdAt?: Timestamp;
};

type UserText = {
  checkingAccess: string;
  title: string;
  description: string;
  backToAdmin: string;
  loading: string;
  noUsers: string;
  searchPlaceholder: string;

  name: string;
  email: string;
  wallet: string;
  membership: string;
  role: string;
  status: string;
  country: string;
  joined: string;
  actions: string;

  update: string;
  updating: string;
  free: string;
  premium: string;
  user: string;
  admin: string;
  active: string;
  blocked: string;
  unknown: string;

  usersLoadError: string;
  updateSuccess: string;
  updateError: string;
  invalidWallet: string;
  selfRoleError: string;
  selfStatusError: string;
};

const translations: Record<string, UserText> = {
  en: {
    checkingAccess: "Checking admin access...",
    title: "Manage Users",
    description:
      "View users and manage their wallet, membership, role and account status.",
    backToAdmin: "Back to Admin",
    loading: "Users are loading...",
    noUsers: "No users were found.",
    searchPlaceholder: "Search by name or email...",

    name: "Name",
    email: "Email",
    wallet: "Wallet",
    membership: "Membership",
    role: "Role",
    status: "Status",
    country: "Country",
    joined: "Joined",
    actions: "Actions",

    update: "Update",
    updating: "Updating...",
    free: "Free",
    premium: "Premium",
    user: "User",
    admin: "Admin",
    active: "Active",
    blocked: "Blocked",
    unknown: "Unknown",

    usersLoadError: "Users could not be loaded.",
    updateSuccess: "User information was updated successfully.",
    updateError: "User information could not be updated.",
    invalidWallet: "Please enter a valid wallet amount.",
    selfRoleError: "You cannot remove your own admin role.",
    selfStatusError: "You cannot block your own admin account.",
  },

  romanUrdu: {
    checkingAccess: "Admin access check ho raha hai...",
    title: "Users Manage Karein",
    description:
      "Users dekhein aur unka wallet, membership, role aur status manage karein.",
    backToAdmin: "Admin Panel",
    loading: "Users load ho rahe hain...",
    noUsers: "Koi user nahi mila.",
    searchPlaceholder: "Naam ya email se search karein...",

    name: "Naam",
    email: "Email",
    wallet: "Wallet",
    membership: "Membership",
    role: "Role",
    status: "Status",
    country: "Country",
    joined: "Join Date",
    actions: "Actions",

    update: "Update Karein",
    updating: "Update ho raha hai...",
    free: "Free",
    premium: "Premium",
    user: "User",
    admin: "Admin",
    active: "Active",
    blocked: "Blocked",
    unknown: "Unknown",

    usersLoadError: "Users load nahi ho sake.",
    updateSuccess: "User ki information successfully update ho gayi.",
    updateError: "User ki information update nahi ho saki.",
    invalidWallet: "Valid wallet amount enter karein.",
    selfRoleError: "Apna admin role remove nahi kar sakte.",
    selfStatusError: "Apna admin account block nahi kar sakte.",
  },

  ur: {
    checkingAccess: "ایڈمن رسائی چیک کی جا رہی ہے...",
    title: "صارفین مینیج کریں",
    description:
      "صارفین دیکھیں اور ان کا والٹ، ممبرشپ، رول اور اسٹیٹس مینیج کریں۔",
    backToAdmin: "ایڈمن پینل",
    loading: "صارفین لوڈ ہو رہے ہیں...",
    noUsers: "کوئی صارف نہیں ملا۔",
    searchPlaceholder: "نام یا ای میل سے تلاش کریں...",

    name: "نام",
    email: "ای میل",
    wallet: "والٹ",
    membership: "ممبرشپ",
    role: "رول",
    status: "اسٹیٹس",
    country: "ملک",
    joined: "شمولیت کی تاریخ",
    actions: "ایکشن",

    update: "اپ ڈیٹ کریں",
    updating: "اپ ڈیٹ ہو رہا ہے...",
    free: "فری",
    premium: "پریمیم",
    user: "صارف",
    admin: "ایڈمن",
    active: "فعال",
    blocked: "بلاک",
    unknown: "نامعلوم",

    usersLoadError: "صارفین لوڈ نہیں ہو سکے۔",
    updateSuccess: "صارف کی معلومات کامیابی سے اپ ڈیٹ ہو گئیں۔",
    updateError: "صارف کی معلومات اپ ڈیٹ نہیں ہو سکیں۔",
    invalidWallet: "درست والٹ رقم درج کریں۔",
    selfRoleError: "آپ اپنا ایڈمن رول ختم نہیں کر سکتے۔",
    selfStatusError: "آپ اپنا ایڈمن اکاؤنٹ بلاک نہیں کر سکتے۔",
  },

  ar: {
    checkingAccess: "جارٍ التحقق من صلاحية المسؤول...",
    title: "إدارة المستخدمين",
    description:
      "عرض المستخدمين وإدارة المحفظة والعضوية والدور وحالة الحساب.",
    backToAdmin: "لوحة الإدارة",
    loading: "جارٍ تحميل المستخدمين...",
    noUsers: "لم يتم العثور على مستخدمين.",
    searchPlaceholder: "البحث بالاسم أو البريد الإلكتروني...",

    name: "الاسم",
    email: "البريد الإلكتروني",
    wallet: "المحفظة",
    membership: "العضوية",
    role: "الدور",
    status: "الحالة",
    country: "الدولة",
    joined: "تاريخ الانضمام",
    actions: "الإجراءات",

    update: "تحديث",
    updating: "جارٍ التحديث...",
    free: "مجاني",
    premium: "مميز",
    user: "مستخدم",
    admin: "مسؤول",
    active: "نشط",
    blocked: "محظور",
    unknown: "غير معروف",

    usersLoadError: "تعذر تحميل المستخدمين.",
    updateSuccess: "تم تحديث معلومات المستخدم بنجاح.",
    updateError: "تعذر تحديث معلومات المستخدم.",
    invalidWallet: "يرجى إدخال مبلغ صحيح للمحفظة.",
    selfRoleError: "لا يمكنك إزالة دور المسؤول الخاص بك.",
    selfStatusError: "لا يمكنك حظر حساب المسؤول الخاص بك.",
  },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const pageText =
    translations[String(language)] ?? translations.en;

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");

  const [walletInputs, setWalletInputs] = useState<
    Record<string, string>
  >({});

  const [membershipInputs, setMembershipInputs] = useState<
    Record<string, string>
  >({});

  const [roleInputs, setRoleInputs] = useState<
    Record<string, string>
  >({});

  const [statusInputs, setStatusInputs] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;

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

          const adminRole = String(
            adminDocument.data()?.role ?? ""
          ).toLowerCase();

          if (!adminDocument.exists() || adminRole !== "admin") {
            router.replace("/dashboard");
            return;
          }

          setCurrentAdminId(currentUser.uid);
          setCheckingAccess(false);

          unsubscribeUsers = onSnapshot(
            collection(db, "users"),
            (snapshot) => {
              const allUsers: UserRecord[] = snapshot.docs.map(
                (userDocument) => {
                  const data = userDocument.data();

                  return {
                    id: userDocument.id,
                    uid: data.uid ?? userDocument.id,
                    fullName:
                      data.fullName ??
                      data.name ??
                      "Unknown User",
                    email: data.email ?? "No email",
                    wallet: Number(data.wallet ?? 0),
                    referralBalance: Number(
                      data.referralBalance ?? 0
                    ),
                    membership: data.membership ?? "Free",
                    role: String(data.role ?? "user").toLowerCase(),
                    status: String(
                      data.status ?? "active"
                    ).toLowerCase(),
                    country: data.country ?? "Unknown",
                    createdAt: data.createdAt,
                  };
                }
              );

              allUsers.sort((firstUser, secondUser) => {
                const firstTime =
                  firstUser.createdAt?.toMillis() ?? 0;
                const secondTime =
                  secondUser.createdAt?.toMillis() ?? 0;

                return secondTime - firstTime;
              });

              setUsers(allUsers);

              const newWalletInputs: Record<string, string> = {};
              const newMembershipInputs: Record<string, string> =
                {};
              const newRoleInputs: Record<string, string> = {};
              const newStatusInputs: Record<string, string> = {};

              allUsers.forEach((user) => {
                newWalletInputs[user.id] = String(user.wallet);
                newMembershipInputs[user.id] =
                  user.membership === "Business"
                    ? "Business"
                    : user.membership === "Pro"
                    ? "Pro"
                    : "Free";
                newRoleInputs[user.id] =
                  user.role === "admin" ? "admin" : "user";
                newStatusInputs[user.id] =
                  user.status === "blocked"
                    ? "blocked"
                    : "active";
              });

              setWalletInputs(newWalletInputs);
              setMembershipInputs(newMembershipInputs);
              setRoleInputs(newRoleInputs);
              setStatusInputs(newStatusInputs);

              setLoadingUsers(false);
            },
            (error) => {
              console.error("Users load error:", error);
              setLoadingUsers(false);
              toast.error(pageText.usersLoadError);
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

      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, [router, pageText.usersLoadError]);

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue)
      );
    });
  }, [search, users]);

  async function handleUpdateUser(userId: string) {
    const walletAmount = Number(walletInputs[userId]);
    const selectedMembership =
      membershipInputs[userId] ?? "Free";
    const selectedRole = roleInputs[userId] ?? "user";
    const selectedStatus = statusInputs[userId] ?? "active";

    if (
      !Number.isFinite(walletAmount) ||
      walletAmount < 0
    ) {
      toast.error(pageText.invalidWallet);
      return;
    }

    if (
      userId === currentAdminId &&
      selectedRole !== "admin"
    ) {
      toast.error(pageText.selfRoleError);
      return;
    }

    if (
      userId === currentAdminId &&
      selectedStatus === "blocked"
    ) {
      toast.error(pageText.selfStatusError);
      return;
    }

    try {
      setUpdatingUserId(userId);


      await updateDoc(doc(db, "users", userId), {
        wallet: walletAmount,
        membership: selectedMembership,
        role: selectedRole,
        status: selectedStatus,
        updatedAt: new Date(),
      });

      toast.success(pageText.updateSuccess);
    } catch (error) {
      console.error("User update error:", error);
      toast.error(pageText.updateError);
    } finally {
      setUpdatingUserId("");
    }
  }

  function formatDate(timestamp?: Timestamp) {
    if (!timestamp) {
      return pageText.unknown;
    }

    return timestamp.toDate().toLocaleDateString();
  }

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
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {pageText.title}
            </h1>

            <p className="mt-2 text-gray-600">
              {pageText.description}
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg bg-gray-900 px-5 py-3 text-center font-semibold text-white transition hover:bg-gray-800"
          >
            {pageText.backToAdmin}
          </Link>
        </div>

        <div className="mt-7">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pageText.searchPlaceholder}
            className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
          />
        </div>

        {loadingUsers ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">
              {pageText.loading}
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">
              {pageText.noUsers}
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="px-5 py-4 font-semibold">
                      {pageText.name}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.wallet}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.membership}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.role}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.status}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.country}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.joined}
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {pageText.actions}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="text-sm text-gray-700"
                    >
                      <td className="px-5 py-5">
                        <p className="font-semibold text-gray-900">
                          {user.fullName}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {user.email}
                        </p>

                        {user.id === currentAdminId && (
                          <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            Current Admin
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={walletInputs[user.id] ?? "0"}
                          onChange={(event) =>
                            setWalletInputs((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-blue-600"
                        />
                      </td>

                      <td className="px-5 py-5">
                        <select
                          value={
                            membershipInputs[user.id] ?? "Free"
                          }
                          onChange={(event) =>
                            setMembershipInputs((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        >
                          <option value="Free">
                            Free
                          </option>

                          <option value="Pro">
                            Pro
                          </option>

                          <option value="Business">
                            Business
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-5">
                        <select
                          value={roleInputs[user.id] ?? "user"}
                          onChange={(event) =>
                            setRoleInputs((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        >
                          <option value="user">
                            {pageText.user}
                          </option>

                          <option value="admin">
                            {pageText.admin}
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-5">
                        <select
                          value={
                            statusInputs[user.id] ?? "active"
                          }
                          onChange={(event) =>
                            setStatusInputs((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        >
                          <option value="active">
                            {pageText.active}
                          </option>

                          <option value="blocked">
                            {pageText.blocked}
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-5">
                        {user.country}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUser(user.id)
                          }
                          disabled={
                            updatingUserId === user.id
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingUserId === user.id
                            ? pageText.updating
                            : pageText.update}
                        </button>
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