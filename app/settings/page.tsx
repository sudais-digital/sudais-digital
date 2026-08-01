"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  updatePassword,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import DashboardSidebar from "../components/DashboardSidebar";
import { useLanguage } from "../components/LanguageProvider";
import { useCurrency } from "../components/CurrencyProvider";
import {
  currencies,
  CurrencyCode,
} from "../lib/currency";
import { auth, db } from "../lib/firebase";

type SettingsTranslation = {
  title: string;
  description: string;
  profileSettings: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  currencyHelp: string;
  saveChanges: string;
  saving: string;
  passwordSettings: string;
  newPassword: string;
  updatePassword: string;
  updatingPassword: string;
  loading: string;
  profileSaved: string;
  profileError: string;
  passwordUpdated: string;
  passwordError: string;
  passwordLength: string;
};

const translations: Record<string, SettingsTranslation> = {
  en: {
    title: "Settings",
    description:
      "Manage your profile, currency and account settings.",
    profileSettings: "Profile Settings",
    fullName: "Full Name",
    email: "Email Address",
    phone: "Phone Number",
    country: "Country",
    currency: "Preferred Currency",
    currencyHelp:
      "Prices across the website will be displayed in this currency.",
    saveChanges: "Save Changes",
    saving: "Saving...",
    passwordSettings: "Password Settings",
    newPassword: "New Password",
    updatePassword: "Update Password",
    updatingPassword: "Updating...",
    loading: "Loading...",
    profileSaved: "Profile updated successfully.",
    profileError: "Profile could not be updated.",
    passwordUpdated: "Password updated successfully.",
    passwordError:
      "Password could not be updated. You may need to log in again.",
    passwordLength:
      "Password must contain at least 6 characters.",
  },

  romanUrdu: {
    title: "Settings",
    description:
      "Apni profile, currency aur account settings manage karein.",
    profileSettings: "Profile Settings",
    fullName: "Poora Naam",
    email: "Email Address",
    phone: "Phone Number",
    country: "Country",
    currency: "Pasandeeda Currency",
    currencyHelp:
      "Website ki tamam prices is currency mein dikhai jayengi.",
    saveChanges: "Changes Save Karein",
    saving: "Save ho raha hai...",
    passwordSettings: "Password Settings",
    newPassword: "Naya Password",
    updatePassword: "Password Update Karein",
    updatingPassword: "Update ho raha hai...",
    loading: "Loading...",
    profileSaved: "Profile successfully update ho gayi.",
    profileError: "Profile update nahi ho saki.",
    passwordUpdated: "Password successfully update ho gaya.",
    passwordError:
      "Password update nahi ho saka. Dobara login karna par sakta hai.",
    passwordLength:
      "Password kam az kam 6 characters ka hona chahiye.",
  },

  ar: {
    title: "الإعدادات",
    description:
      "إدارة الملف الشخصي والعملة وإعدادات الحساب.",
    profileSettings: "إعدادات الملف الشخصي",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    country: "الدولة",
    currency: "العملة المفضلة",
    currencyHelp:
      "سيتم عرض الأسعار في جميع أنحاء الموقع بهذه العملة.",
    saveChanges: "حفظ التغييرات",
    saving: "جارٍ الحفظ...",
    passwordSettings: "إعدادات كلمة المرور",
    newPassword: "كلمة المرور الجديدة",
    updatePassword: "تحديث كلمة المرور",
    updatingPassword: "جارٍ التحديث...",
    loading: "جارٍ التحميل...",
    profileSaved: "تم تحديث الملف الشخصي بنجاح.",
    profileError: "تعذر تحديث الملف الشخصي.",
    passwordUpdated: "تم تحديث كلمة المرور بنجاح.",
    passwordError:
      "تعذر تحديث كلمة المرور. قد تحتاج إلى تسجيل الدخول مرة أخرى.",
    passwordLength:
      "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.",
  },

  es: {
    title: "Configuración",
    description:
      "Administre su perfil, moneda y configuración de cuenta.",
    profileSettings: "Configuración del perfil",
    fullName: "Nombre completo",
    email: "Correo electrónico",
    phone: "Número de teléfono",
    country: "País",
    currency: "Moneda preferida",
    currencyHelp:
      "Los precios del sitio se mostrarán en esta moneda.",
    saveChanges: "Guardar cambios",
    saving: "Guardando...",
    passwordSettings: "Configuración de contraseña",
    newPassword: "Nueva contraseña",
    updatePassword: "Actualizar contraseña",
    updatingPassword: "Actualizando...",
    loading: "Cargando...",
    profileSaved: "Perfil actualizado correctamente.",
    profileError: "No se pudo actualizar el perfil.",
    passwordUpdated: "Contraseña actualizada correctamente.",
    passwordError:
      "No se pudo actualizar la contraseña. Es posible que deba iniciar sesión nuevamente.",
    passwordLength:
      "La contraseña debe contener al menos 6 caracteres.",
  },

  fr: {
    title: "Paramètres",
    description:
      "Gérez votre profil, votre devise et les paramètres du compte.",
    profileSettings: "Paramètres du profil",
    fullName: "Nom complet",
    email: "Adresse e-mail",
    phone: "Numéro de téléphone",
    country: "Pays",
    currency: "Devise préférée",
    currencyHelp:
      "Les prix du site seront affichés dans cette devise.",
    saveChanges: "Enregistrer",
    saving: "Enregistrement...",
    passwordSettings: "Paramètres du mot de passe",
    newPassword: "Nouveau mot de passe",
    updatePassword: "Mettre à jour",
    updatingPassword: "Mise à jour...",
    loading: "Chargement...",
    profileSaved: "Profil mis à jour avec succès.",
    profileError: "Le profil n'a pas pu être mis à jour.",
    passwordUpdated: "Mot de passe mis à jour avec succès.",
    passwordError:
      "Le mot de passe n'a pas pu être mis à jour. Vous devrez peut-être vous reconnecter.",
    passwordLength:
      "Le mot de passe doit contenir au moins 6 caractères.",
  },

  de: {
    title: "Einstellungen",
    description:
      "Verwalten Sie Profil, Währung und Kontoeinstellungen.",
    profileSettings: "Profileinstellungen",
    fullName: "Vollständiger Name",
    email: "E-Mail-Adresse",
    phone: "Telefonnummer",
    country: "Land",
    currency: "Bevorzugte Währung",
    currencyHelp:
      "Alle Preise werden in dieser Währung angezeigt.",
    saveChanges: "Änderungen speichern",
    saving: "Wird gespeichert...",
    passwordSettings: "Passworteinstellungen",
    newPassword: "Neues Passwort",
    updatePassword: "Passwort aktualisieren",
    updatingPassword: "Wird aktualisiert...",
    loading: "Wird geladen...",
    profileSaved: "Profil erfolgreich aktualisiert.",
    profileError: "Profil konnte nicht aktualisiert werden.",
    passwordUpdated: "Passwort erfolgreich aktualisiert.",
    passwordError:
      "Passwort konnte nicht aktualisiert werden. Möglicherweise müssen Sie sich erneut anmelden.",
    passwordLength:
      "Das Passwort muss mindestens 6 Zeichen enthalten.",
  },

  tr: {
    title: "Ayarlar",
    description:
      "Profil, para birimi ve hesap ayarlarınızı yönetin.",
    profileSettings: "Profil Ayarları",
    fullName: "Tam Ad",
    email: "E-posta Adresi",
    phone: "Telefon Numarası",
    country: "Ülke",
    currency: "Tercih Edilen Para Birimi",
    currencyHelp:
      "Sitedeki fiyatlar bu para biriminde gösterilecektir.",
    saveChanges: "Değişiklikleri Kaydet",
    saving: "Kaydediliyor...",
    passwordSettings: "Şifre Ayarları",
    newPassword: "Yeni Şifre",
    updatePassword: "Şifreyi Güncelle",
    updatingPassword: "Güncelleniyor...",
    loading: "Yükleniyor...",
    profileSaved: "Profil başarıyla güncellendi.",
    profileError: "Profil güncellenemedi.",
    passwordUpdated: "Şifre başarıyla güncellendi.",
    passwordError:
      "Şifre güncellenemedi. Tekrar giriş yapmanız gerekebilir.",
    passwordLength:
      "Şifre en az 6 karakter içermelidir.",
  },

  hi: {
    title: "सेटिंग्स",
    description:
      "अपनी प्रोफ़ाइल, मुद्रा और खाता सेटिंग्स प्रबंधित करें।",
    profileSettings: "प्रोफ़ाइल सेटिंग्स",
    fullName: "पूरा नाम",
    email: "ईमेल पता",
    phone: "फोन नंबर",
    country: "देश",
    currency: "पसंदीदा मुद्रा",
    currencyHelp:
      "वेबसाइट की सभी कीमतें इस मुद्रा में दिखाई जाएंगी।",
    saveChanges: "बदलाव सहेजें",
    saving: "सहेजा जा रहा है...",
    passwordSettings: "पासवर्ड सेटिंग्स",
    newPassword: "नया पासवर्ड",
    updatePassword: "पासवर्ड अपडेट करें",
    updatingPassword: "अपडेट हो रहा है...",
    loading: "लोड हो रहा है...",
    profileSaved: "प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।",
    profileError: "प्रोफ़ाइल अपडेट नहीं हो सकी।",
    passwordUpdated: "पासवर्ड सफलतापूर्वक अपडेट हो गया।",
    passwordError:
      "पासवर्ड अपडेट नहीं हो सका। आपको दोबारा लॉग इन करना पड़ सकता है।",
    passwordLength:
      "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
  },
};

function isCurrencyCode(value: unknown): value is CurrencyCode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(currencies, value)
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();

  const {
    currency,
    setCurrency,
    loadingCurrency,
  } = useCurrency();

  const pageText =
    translations[String(language)] ?? translations.en;

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [newPassword, setNewPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] =
    useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setCheckingAuth(false);
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

            setFullName(
              String(data.fullName ?? data.name ?? "")
            );

            setPhone(String(data.phone ?? ""));
            setCountry(
              String(data.country ?? "Pakistan")
            );

            if (isCurrencyCode(data.currency)) {
              setCurrency(data.currency);
            }
          }
        } catch (error) {
          console.error("Profile load error:", error);
        } finally {
          setCheckingAuth(false);
        }
      }
    );

    return () => unsubscribe();
  }, [router, setCurrency]);

  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    try {
      setSavingProfile(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          country: country.trim(),
          currency,
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success(pageText.profileSaved);
    } catch (error) {
      console.error("Profile save error:", error);

      toast.error(pageText.profileError);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (newPassword.length < 6) {
      toast.error(pageText.passwordLength);
      return;
    }

    try {
      setUpdatingPassword(true);

      await updatePassword(user, newPassword);

      setNewPassword("");
      toast.success(pageText.passwordUpdated);
    } catch (error) {
      console.error("Password update error:", error);

      toast.error(pageText.passwordError);
    } finally {
      setUpdatingPassword(false);
    }
  }

  if (checkingAuth || loadingCurrency) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          {pageText.loading}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900">
            {pageText.title}
          </h1>

          <p className="mt-2 text-gray-600">
            {pageText.description}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleSaveProfile}
              className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900">
                {pageText.profileSettings}
              </h2>

              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.fullName}
                </label>

                <input
                  id="fullName"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.email}
                </label>

                <input
                  id="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.phone}
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.country}
                </label>

                <input
                  id="country"
                  value={country}
                  onChange={(event) =>
                    setCountry(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="currency"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.currency}
                </label>

                <select
                  id="currency"
                  value={currency}
                  onChange={(event) =>
                    setCurrency(
                      event.target.value as CurrencyCode
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  {Object.entries(currencies).map(
                    ([code, details]) => (
                      <option key={code} value={code}>
                        {code} — {details.name}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-sm text-gray-500">
                  {pageText.currencyHelp}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile
                  ? pageText.saving
                  : pageText.saveChanges}
              </button>
            </form>

            <form
              onSubmit={handlePasswordUpdate}
              className="h-fit space-y-5 rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-gray-900">
                {pageText.passwordSettings}
              </h2>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block font-medium text-gray-700"
                >
                  {pageText.newPassword}
                </label>

                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full rounded-lg bg-gray-900 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingPassword
                  ? pageText.updatingPassword
                  : pageText.updatePassword}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}