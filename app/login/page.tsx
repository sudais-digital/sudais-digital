"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

import { useLanguage } from "../components/LanguageProvider";
import { auth } from "../lib/firebase";

const ADMIN_EMAIL = "hamzajutt8000700@gmail.com";

type LoginText = {
  subtitle: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  login: string;
  loggingIn: string;
  noAccount: string;
  createAccount: string;

  requiredMessage: string;
  successMessage: string;
  adminSuccessMessage: string;
  invalidCredentials: string;
  invalidEmail: string;
  userNotFound: string;
  wrongPassword: string;
  tooManyRequests: string;
  networkError: string;
  generalError: string;
};

const translations: Record<string, LoginText> = {
  en: {
    subtitle: "Log in to your account",
    email: "Email Address",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    login: "Log In",
    loggingIn: "Logging in...",
    noAccount: "Don't have an account?",
    createAccount: "Create Account",

    requiredMessage: "Please enter your email and password.",
    successMessage: "Login successful!",
    adminSuccessMessage: "Admin login successful!",
    invalidCredentials: "The email or password is incorrect.",
    invalidEmail: "Please enter a valid email address.",
    userNotFound: "No account was found with this email.",
    wrongPassword: "The password is incorrect.",
    tooManyRequests:
      "Too many login attempts. Please wait and try again.",
    networkError:
      "Network error. Please check your internet connection.",
    generalError: "Login could not be completed. Please try again.",
  },

  romanUrdu: {
    subtitle: "Apne account mein login karein",
    email: "Email Address",
    emailPlaceholder: "Apni email enter karein",
    password: "Password",
    passwordPlaceholder: "Apna password enter karein",
    login: "Login Karein",
    loggingIn: "Login ho raha hai...",
    noAccount: "Account nahi hai?",
    createAccount: "Account Banayein",

    requiredMessage: "Email aur password enter karein.",
    successMessage: "Login successful!",
    adminSuccessMessage: "Admin login successful!",
    invalidCredentials: "Email ya password ghalat hai.",
    invalidEmail: "Valid email address enter karein.",
    userNotFound: "Is email se koi account nahi mila.",
    wrongPassword: "Password ghalat hai.",
    tooManyRequests:
      "Bohat zyada login attempts ho gayi hain. Thori dair baad dobara try karein.",
    networkError:
      "Internet connection check karein aur dobara try karein.",
    generalError: "Login nahi ho saka. Dobara try karein.",
  },

  ur: {
    subtitle: "اپنے اکاؤنٹ میں لاگ اِن کریں",
    email: "ای میل ایڈریس",
    emailPlaceholder: "اپنی ای میل درج کریں",
    password: "پاس ورڈ",
    passwordPlaceholder: "اپنا پاس ورڈ درج کریں",
    login: "لاگ اِن کریں",
    loggingIn: "لاگ اِن ہو رہا ہے...",
    noAccount: "اکاؤنٹ موجود نہیں؟",
    createAccount: "اکاؤنٹ بنائیں",

    requiredMessage: "ای میل اور پاس ورڈ درج کریں۔",
    successMessage: "لاگ اِن کامیاب ہو گیا!",
    adminSuccessMessage: "ایڈمن لاگ اِن کامیاب ہو گیا!",
    invalidCredentials: "ای میل یا پاس ورڈ غلط ہے۔",
    invalidEmail: "درست ای میل ایڈریس درج کریں۔",
    userNotFound: "اس ای میل سے کوئی اکاؤنٹ نہیں ملا۔",
    wrongPassword: "پاس ورڈ غلط ہے۔",
    tooManyRequests:
      "بہت زیادہ لاگ اِن کوششیں ہو چکی ہیں۔ کچھ دیر بعد دوبارہ کوشش کریں۔",
    networkError:
      "انٹرنیٹ کنکشن چیک کریں اور دوبارہ کوشش کریں۔",
    generalError: "لاگ اِن نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
  },

  ar: {
    subtitle: "سجّل الدخول إلى حسابك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    password: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور",
    login: "تسجيل الدخول",
    loggingIn: "جارٍ تسجيل الدخول...",
    noAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب",

    requiredMessage:
      "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
    successMessage: "تم تسجيل الدخول بنجاح!",
    adminSuccessMessage: "تم تسجيل دخول المسؤول بنجاح!",
    invalidCredentials:
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    invalidEmail:
      "يرجى إدخال بريد إلكتروني صحيح.",
    userNotFound:
      "لم يتم العثور على حساب بهذا البريد الإلكتروني.",
    wrongPassword: "كلمة المرور غير صحيحة.",
    tooManyRequests:
      "محاولات تسجيل دخول كثيرة. انتظر ثم حاول مرة أخرى.",
    networkError:
      "خطأ في الشبكة. تحقق من اتصال الإنترنت.",
    generalError:
      "تعذر تسجيل الدخول. حاول مرة أخرى.",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const pageText =
    translations[String(language)] ?? translations.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function getFirebaseErrorMessage(errorCode: string) {
    switch (errorCode) {
      case "auth/invalid-email":
        return pageText.invalidEmail;

      case "auth/user-not-found":
        return pageText.userNotFound;

      case "auth/wrong-password":
        return pageText.wrongPassword;

      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        return pageText.invalidCredentials;

      case "auth/too-many-requests":
        return pageText.tooManyRequests;

      case "auth/network-request-failed":
        return pageText.networkError;

      default:
        return pageText.generalError;
    }
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error(pageText.requiredMessage);
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const loggedInEmail =
        userCredential.user.email?.trim().toLowerCase();

      const isAdmin =
        loggedInEmail === ADMIN_EMAIL.toLowerCase();

      if (isAdmin) {
        toast.success(pageText.adminSuccessMessage);
        router.replace("/admin");
      } else {
        toast.success(pageText.successMessage);
        router.replace("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        toast.error(
          getFirebaseErrorMessage(
            String(
              (error as { code?: string }).code ?? ""
            )
          )
        );
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
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-gray-700"
            >
              {pageText.email}
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder={pageText.emailPlaceholder}
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-gray-700"
            >
              {pageText.password}
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder={pageText.passwordPlaceholder}
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? pageText.loggingIn
              : pageText.login}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {pageText.noAccount}{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-700 hover:underline"
          >
            {pageText.createAccount}
          </Link>
        </p>
      </div>
    </main>
  );
}