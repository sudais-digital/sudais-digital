"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLanguage } from "../components/LanguageProvider";
import toast from "react-hot-toast";
import { auth, db } from "../lib/firebase";

type RegisterText = {
  subtitle: string;
  fullName: string;
  fullNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  referralCode: string;
  referralCodePlaceholder: string;
  referralCodeOptional: string;
  createAccount: string;
  creatingAccount: string;
  alreadyAccount: string;
  login: string;

  requiredFields: string;
  passwordLength: string;
  passwordMismatch: string;
  successMessage: string;
  verificationMessage: string;
  emailAlreadyUsed: string;
  invalidEmail: string;
  weakPassword: string;
  networkError: string;
  invalidReferral: string;
  selfReferral: string;
  generalError: string;
};

const translations: Record<string, RegisterText> = {
  en: {
    subtitle: "Create your account",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email Address",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Minimum 6 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Enter the password again",
    referralCode: "Referral Code",
    referralCodePlaceholder: "Example: SD-8F42KD",
    referralCodeOptional: "Optional",
    createAccount: "Create Account",
    creatingAccount: "Creating account...",
    alreadyAccount: "Already have an account?",
    login: "Log In",

    requiredFields: "Please complete all required fields.",
    passwordLength: "The password must contain at least 6 characters.",
    passwordMismatch: "The passwords do not match.",
    successMessage: "Your account was created successfully!",
    verificationMessage:
      "A verification email has been sent. Please check your inbox.",
    emailAlreadyUsed:
      "An account already exists with this email address.",
    invalidEmail: "Please enter a valid email address.",
    weakPassword:
      "The password is too weak. Please use a stronger password.",
    networkError:
      "Network error. Please check your internet connection.",
    invalidReferral: "This referral code is invalid.",
    selfReferral: "You cannot use your own referral code.",
    generalError:
      "The account could not be created. Please try again.",
  },

  romanUrdu: {
    subtitle: "Apna account banayein",
    fullName: "Poora Naam",
    fullNamePlaceholder: "Apna poora naam enter karein",
    email: "Email Address",
    emailPlaceholder: "Apni email enter karein",
    password: "Password",
    passwordPlaceholder: "Kam az kam 6 characters",
    confirmPassword: "Password Confirm Karein",
    confirmPasswordPlaceholder: "Password dobara enter karein",
    referralCode: "Referral Code",
    referralCodePlaceholder: "Misal: SD-8F42KD",
    referralCodeOptional: "Optional",
    createAccount: "Account Banayein",
    creatingAccount: "Account ban raha hai...",
    alreadyAccount: "Pehle se account hai?",
    login: "Login Karein",

    requiredFields: "Tamam required fields fill karein.",
    passwordLength:
      "Password kam az kam 6 characters ka hona chahiye.",
    passwordMismatch: "Dono passwords same nahi hain.",
    successMessage: "Account successfully create ho gaya!",
    verificationMessage:
      "Verification email send kar di gayi hai. Apna inbox check karein.",
    emailAlreadyUsed:
      "Is email address se pehle hi account bana hua hai.",
    invalidEmail: "Valid email address enter karein.",
    weakPassword:
      "Password bohat weak hai. Strong password use karein.",
    networkError:
      "Internet connection check karein aur dobara try karein.",
    invalidReferral: "Yeh referral code valid nahi hai.",
    selfReferral: "Apna referral code use nahi kar sakte.",
    generalError:
      "Account create nahi ho saka. Dobara try karein.",
  },

  ur: {
    subtitle: "اپنا اکاؤنٹ بنائیں",
    fullName: "پورا نام",
    fullNamePlaceholder: "اپنا پورا نام درج کریں",
    email: "ای میل ایڈریس",
    emailPlaceholder: "اپنی ای میل درج کریں",
    password: "پاس ورڈ",
    passwordPlaceholder: "کم از کم 6 حروف",
    confirmPassword: "پاس ورڈ کی تصدیق",
    confirmPasswordPlaceholder: "پاس ورڈ دوبارہ درج کریں",
    referralCode: "ریفرل کوڈ",
    referralCodePlaceholder: "مثال: SD-8F42KD",
    referralCodeOptional: "اختیاری",
    createAccount: "اکاؤنٹ بنائیں",
    creatingAccount: "اکاؤنٹ بن رہا ہے...",
    alreadyAccount: "پہلے سے اکاؤنٹ موجود ہے؟",
    login: "لاگ اِن کریں",

    requiredFields: "تمام ضروری خانے پُر کریں۔",
    passwordLength:
      "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔",
    passwordMismatch: "دونوں پاس ورڈ ایک جیسے نہیں ہیں۔",
    successMessage: "اکاؤنٹ کامیابی سے بن گیا!",
    verificationMessage:
      "تصدیقی ای میل بھیج دی گئی ہے۔ اپنا ان باکس چیک کریں۔",
    emailAlreadyUsed:
      "اس ای میل ایڈریس سے پہلے ہی اکاؤنٹ موجود ہے۔",
    invalidEmail: "درست ای میل ایڈریس درج کریں۔",
    weakPassword:
      "پاس ورڈ کمزور ہے۔ مضبوط پاس ورڈ استعمال کریں۔",
    networkError:
      "انٹرنیٹ کنکشن چیک کریں اور دوبارہ کوشش کریں۔",
    invalidReferral: "یہ ریفرل کوڈ درست نہیں ہے۔",
    selfReferral: "آپ اپنا ریفرل کوڈ استعمال نہیں کر سکتے۔",
    generalError:
      "اکاؤنٹ نہیں بن سکا۔ دوبارہ کوشش کریں۔",
  },

  ar: {
    subtitle: "إنشاء حسابك",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "أدخل اسمك الكامل",
    email: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    password: "كلمة المرور",
    passwordPlaceholder: "6 أحرف على الأقل",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أدخل كلمة المرور مرة أخرى",
    referralCode: "رمز الإحالة",
    referralCodePlaceholder: "مثال: SD-8F42KD",
    referralCodeOptional: "اختياري",
    createAccount: "إنشاء حساب",
    creatingAccount: "جارٍ إنشاء الحساب...",
    alreadyAccount: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",

    requiredFields: "يرجى إكمال جميع الحقول المطلوبة.",
    passwordLength:
      "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    successMessage: "تم إنشاء الحساب بنجاح!",
    verificationMessage:
      "تم إرسال رسالة تحقق. يرجى فحص بريدك الإلكتروني.",
    emailAlreadyUsed:
      "يوجد حساب بالفعل بهذا البريد الإلكتروني.",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
    weakPassword:
      "كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.",
    networkError:
      "خطأ في الشبكة. تحقق من اتصال الإنترنت.",
    invalidReferral: "رمز الإحالة غير صالح.",
    selfReferral: "لا يمكنك استخدام رمز الإحالة الخاص بك.",
    generalError:
      "تعذر إنشاء الحساب. حاول مرة أخرى.",
  },
};

function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase();
}

function generateReferralCode(uid: string) {
  const uidPart = uid
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase();

  return `SD-${uidPart}${randomPart}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const pageText =
    translations[String(language)] ?? translations.en;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [referralCodeInput, setReferralCodeInput] =
    useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = normalizeReferralCode(
      params.get("ref") ?? ""
    );

    if (referralCode) {
      setReferralCodeInput(referralCode);
    }
  }, []);

  function getFirebaseErrorMessage(errorCode: string) {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return pageText.emailAlreadyUsed;

      case "auth/invalid-email":
        return pageText.invalidEmail;

      case "auth/weak-password":
        return pageText.weakPassword;

      case "auth/network-request-failed":
        return pageText.networkError;

      default:
        return pageText.generalError;
    }
  }

  async function createUniqueReferralCode(uid: string) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const code = generateReferralCode(uid);
      const codeDocument = await getDoc(
        doc(db, "referralCodes", code)
      );

      if (!codeDocument.exists()) {
        return code;
      }
    }

    return `SD-${uid.toUpperCase()}`;
  }

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanReferralCode = normalizeReferralCode(
      referralCodeInput
    );

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      toast.error(pageText.requiredFields);
      return;
    }

    if (password.length < 6) {
      toast.error(pageText.passwordLength);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(pageText.passwordMismatch);
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const newUserId = userCredential.user.uid;
      const ownReferralCode =
        await createUniqueReferralCode(newUserId);

      let referredBy = "";
      let referredByCode = "";

      if (cleanReferralCode) {
        const referralCodeDocument = await getDoc(
          doc(db, "referralCodes", cleanReferralCode)
        );

        if (!referralCodeDocument.exists()) {
          throw new Error("invalid-referral");
        }

        const referrerId = String(
          referralCodeDocument.data()?.userId ?? ""
        );

        if (!referrerId) {
          throw new Error("invalid-referral");
        }

        if (referrerId === newUserId) {
          throw new Error("self-referral");
        }

        referredBy = referrerId;
        referredByCode = cleanReferralCode;
      }

      await setDoc(doc(db, "users", newUserId), {
        uid: newUserId,
        fullName: cleanName,
        name: cleanName,
        email: userCredential.user.email,
        phone: "",
        country: "Pakistan",
        currency: "USD",

        wallet: 0,
        walletBalance: 0,
        referralBalance: 0,
        referralEarnings: 0,
        pendingCommission: 0,
        totalOrders: 0,

        referralCode: ownReferralCode,
        referredBy,
        referredByCode,

        membership: "Free",
        role: "user",
        status: "active",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "referralCodes", ownReferralCode),
        {
          code: ownReferralCode,
          userId: newUserId,
          createdAt: serverTimestamp(),
        }
      );

      if (referredBy) {
        await setDoc(doc(db, "referrals", newUserId), {
          id: newUserId,
          referrerId: referredBy,
          referredUserId: newUserId,
          referredUserName: cleanName,
          referralCode: referredByCode,
          status: "pending",
          totalEarned: 0,
          pendingCommission: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await sendEmailVerification(
          userCredential.user
        );
      } catch (verificationError) {
        console.error(
          "Verification email error:",
          verificationError
        );
      }

      toast.success(`${pageText.successMessage} ${pageText.verificationMessage}`);

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setReferralCodeInput("");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (error: unknown) {
      console.error("Register error:", error);
      setMessageType("error");

      if (
        error instanceof Error &&
        error.message === "invalid-referral"
      ) {
        toast.error(pageText.invalidReferral);
      } else if (
        error instanceof Error &&
        error.message === "self-referral"
      ) {
        toast.error(pageText.selfReferral);
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        toast.error(getFirebaseErrorMessage(String((error as { code?: string }).code ?? "")));
      } else {
        toast.error(pageText.generalError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-blue-800">
          Sudais Digital
        </h1>

        <p className="mt-2 text-center text-gray-600">
          {pageText.subtitle}
        </p>

        <form
          onSubmit={handleRegister}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block font-medium text-gray-700">
              {pageText.fullName}
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder={pageText.fullNamePlaceholder}
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              {pageText.email}
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder={pageText.emailPlaceholder}
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              {pageText.password}
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder={pageText.passwordPlaceholder}
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              {pageText.confirmPassword}
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder={
                pageText.confirmPasswordPlaceholder
              }
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="font-medium text-gray-700">
                {pageText.referralCode}
              </label>

              <span className="text-xs text-gray-500">
                {pageText.referralCodeOptional}
              </span>
            </div>

            <input
              type="text"
              value={referralCodeInput}
              onChange={(event) =>
                setReferralCodeInput(
                  event.target.value.toUpperCase()
                )
              }
              placeholder={
                pageText.referralCodePlaceholder
              }
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase text-gray-900 outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? pageText.creatingAccount
              : pageText.createAccount}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {pageText.alreadyAccount}{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:underline"
          >
            {pageText.login}
          </Link>
        </p>
      </div>
    </main>
  );
}