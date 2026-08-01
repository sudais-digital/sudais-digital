"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import { useCurrency } from "../components/CurrencyProvider";
import { useLanguage } from "../components/LanguageProvider";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";

type Order = {
  id: string;
  platform: string;
  service: string;
  quality: string;
  guarantee: string;
  speed: string;
  link: string;
  quantity: number;
  charge: number;
  currency: string;
  status: string;
  createdAt?: Timestamp;
};

type PageText = {
  checkingLogin: string;
  pageTitle: string;
  pageDescription: string;

  ordersLoading: string;
  noOrdersTitle: string;
  noOrdersDescription: string;
  placeNewOrder: string;

  order: string;
  service: string;
  quantity: string;
  charge: string;
  status: string;
  date: string;
  openLink: string;

  justNow: string;
  indexRequired: string;
  ordersLoadError: string;

  pending: string;
  processing: string;
  completed: string;
  partial: string;
  cancelled: string;
  refunded: string;

  standard: string;
  premium: string;
  realAudience: string;

  normal: string;
  priority: string;

  noRefill: string;
};

const translations: Record<string, PageText> = {
  en: {
    checkingLogin: "Checking login...",
    pageTitle: "My Orders",
    pageDescription:
      "View your submitted orders and their current status.",

    ordersLoading: "Orders are loading...",
    noOrdersTitle: "You do not have any orders yet",
    noOrdersDescription:
      "Submit your first order from the New Order page.",
    placeNewOrder: "Place New Order",

    order: "Order",
    service: "Service",
    quantity: "Quantity",
    charge: "Charge",
    status: "Status",
    date: "Date",
    openLink: "Open link",

    justNow: "Just now",
    indexRequired:
      "A Firestore index is required. Open the link shown in the terminal or browser console and create the index.",
    ordersLoadError:
      "Orders could not be loaded. Please try again.",

    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    partial: "Partial",
    cancelled: "Cancelled",
    refunded: "Refunded",

    standard: "Standard",
    premium: "Premium Quality",
    realAudience: "Real Audience",

    normal: "Normal Processing",
    priority: "Priority Processing",

    noRefill: "No Refill",
  },

  romanUrdu: {
    checkingLogin: "Login check ho raha hai...",
    pageTitle: "Mere Orders",
    pageDescription:
      "Apne submitted orders aur unka current status dekhein.",

    ordersLoading: "Orders load ho rahe hain...",
    noOrdersTitle: "Abhi aapka koi order nahi hai",
    noOrdersDescription:
      "New Order page se apna pehla order submit karein.",
    placeNewOrder: "Naya Order Karein",

    order: "Order",
    service: "Service",
    quantity: "Quantity",
    charge: "Charge",
    status: "Status",
    date: "Date",
    openLink: "Link Kholein",

    justNow: "Abhi",
    indexRequired:
      "Firestore index required hai. Terminal ya browser console mein jo link aaye, usko open karke index create karein.",
    ordersLoadError:
      "Orders load nahi ho sake. Dobara try karein.",

    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    partial: "Partial",
    cancelled: "Cancelled",
    refunded: "Refunded",

    standard: "Standard",
    premium: "Premium Quality",
    realAudience: "Real Audience",

    normal: "Normal Processing",
    priority: "Priority Processing",

    noRefill: "No Refill",
  },

  ur: {
    checkingLogin: "لاگ اِن چیک ہو رہا ہے...",
    pageTitle: "میرے آرڈرز",
    pageDescription:
      "اپنے جمع کیے گئے آرڈرز اور ان کی موجودہ حیثیت دیکھیں۔",

    ordersLoading: "آرڈرز لوڈ ہو رہے ہیں...",
    noOrdersTitle: "ابھی آپ کا کوئی آرڈر نہیں ہے",
    noOrdersDescription:
      "نیو آرڈر پیج سے اپنا پہلا آرڈر جمع کریں۔",
    placeNewOrder: "نیا آرڈر کریں",

    order: "آرڈر",
    service: "سروس",
    quantity: "مقدار",
    charge: "قیمت",
    status: "حیثیت",
    date: "تاریخ",
    openLink: "لنک کھولیں",

    justNow: "ابھی",
    indexRequired:
      "Firestore انڈیکس درکار ہے۔ ٹرمینل یا براؤزر کنسول میں دکھایا گیا لنک کھول کر انڈیکس بنائیں۔",
    ordersLoadError:
      "آرڈرز لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔",

    pending: "زیر التوا",
    processing: "جاری ہے",
    completed: "مکمل",
    partial: "جزوی",
    cancelled: "منسوخ",
    refunded: "واپس کر دیا گیا",

    standard: "معیاری",
    premium: "پریمیم معیار",
    realAudience: "حقیقی صارفین",

    normal: "عام رفتار",
    priority: "ترجیحی رفتار",

    noRefill: "کوئی ریفل نہیں",
  },

  ar: {
    checkingLogin: "جارٍ التحقق من تسجيل الدخول...",
    pageTitle: "طلباتي",
    pageDescription:
      "عرض طلباتك المرسلة وحالتها الحالية.",

    ordersLoading: "جارٍ تحميل الطلبات...",
    noOrdersTitle: "ليس لديك أي طلبات حتى الآن",
    noOrdersDescription:
      "أرسل طلبك الأول من صفحة الطلب الجديد.",
    placeNewOrder: "إنشاء طلب جديد",

    order: "الطلب",
    service: "الخدمة",
    quantity: "الكمية",
    charge: "التكلفة",
    status: "الحالة",
    date: "التاريخ",
    openLink: "فتح الرابط",

    justNow: "الآن",
    indexRequired:
      "مطلوب فهرس Firestore. افتح الرابط الظاهر في الطرفية أو وحدة تحكم المتصفح وأنشئ الفهرس.",
    ordersLoadError:
      "تعذر تحميل الطلبات. حاول مرة أخرى.",

    pending: "قيد الانتظار",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    partial: "جزئي",
    cancelled: "ملغي",
    refunded: "تم رد المبلغ",

    standard: "قياسي",
    premium: "جودة مميزة",
    realAudience: "جمهور حقيقي",

    normal: "معالجة عادية",
    priority: "معالجة ذات أولوية",

    noRefill: "بدون تعويض",
  },

  es: {
    checkingLogin: "Comprobando inicio de sesión...",
    pageTitle: "Mis pedidos",
    pageDescription:
      "Vea sus pedidos enviados y su estado actual.",

    ordersLoading: "Cargando pedidos...",
    noOrdersTitle: "Todavía no tiene pedidos",
    noOrdersDescription:
      "Envíe su primer pedido desde la página Nuevo pedido.",
    placeNewOrder: "Realizar nuevo pedido",

    order: "Pedido",
    service: "Servicio",
    quantity: "Cantidad",
    charge: "Costo",
    status: "Estado",
    date: "Fecha",
    openLink: "Abrir enlace",

    justNow: "Ahora mismo",
    indexRequired:
      "Se requiere un índice de Firestore. Abra el enlace mostrado en la terminal o consola del navegador y cree el índice.",
    ordersLoadError:
      "No se pudieron cargar los pedidos. Inténtelo de nuevo.",

    pending: "Pendiente",
    processing: "Procesando",
    completed: "Completado",
    partial: "Parcial",
    cancelled: "Cancelado",
    refunded: "Reembolsado",

    standard: "Estándar",
    premium: "Calidad prémium",
    realAudience: "Audiencia real",

    normal: "Procesamiento normal",
    priority: "Procesamiento prioritario",

    noRefill: "Sin reposición",
  },

  fr: {
    checkingLogin: "Vérification de la connexion...",
    pageTitle: "Mes commandes",
    pageDescription:
      "Consultez vos commandes et leur état actuel.",

    ordersLoading: "Chargement des commandes...",
    noOrdersTitle:
      "Vous n'avez encore aucune commande",
    noOrdersDescription:
      "Envoyez votre première commande depuis la page Nouvelle commande.",
    placeNewOrder: "Passer une nouvelle commande",

    order: "Commande",
    service: "Service",
    quantity: "Quantité",
    charge: "Coût",
    status: "Statut",
    date: "Date",
    openLink: "Ouvrir le lien",

    justNow: "À l'instant",
    indexRequired:
      "Un index Firestore est requis. Ouvrez le lien affiché dans le terminal ou la console du navigateur et créez l'index.",
    ordersLoadError:
      "Les commandes n'ont pas pu être chargées. Réessayez.",

    pending: "En attente",
    processing: "En traitement",
    completed: "Terminée",
    partial: "Partielle",
    cancelled: "Annulée",
    refunded: "Remboursée",

    standard: "Standard",
    premium: "Qualité premium",
    realAudience: "Audience réelle",

    normal: "Traitement normal",
    priority: "Traitement prioritaire",

    noRefill: "Sans recharge",
  },

  de: {
    checkingLogin: "Anmeldung wird überprüft...",
    pageTitle: "Meine Bestellungen",
    pageDescription:
      "Sehen Sie Ihre Bestellungen und deren aktuellen Status.",

    ordersLoading: "Bestellungen werden geladen...",
    noOrdersTitle:
      "Sie haben noch keine Bestellungen",
    noOrdersDescription:
      "Senden Sie Ihre erste Bestellung über die Seite Neue Bestellung.",
    placeNewOrder: "Neue Bestellung aufgeben",

    order: "Bestellung",
    service: "Dienst",
    quantity: "Menge",
    charge: "Kosten",
    status: "Status",
    date: "Datum",
    openLink: "Link öffnen",

    justNow: "Gerade eben",
    indexRequired:
      "Ein Firestore-Index ist erforderlich. Öffnen Sie den Link im Terminal oder in der Browserkonsole und erstellen Sie den Index.",
    ordersLoadError:
      "Bestellungen konnten nicht geladen werden. Versuchen Sie es erneut.",

    pending: "Ausstehend",
    processing: "In Bearbeitung",
    completed: "Abgeschlossen",
    partial: "Teilweise",
    cancelled: "Storniert",
    refunded: "Erstattet",

    standard: "Standard",
    premium: "Premium-Qualität",
    realAudience: "Echtes Publikum",

    normal: "Normale Bearbeitung",
    priority: "Prioritätsbearbeitung",

    noRefill: "Keine Nachfüllung",
  },
};

const englishFallback = translations.en;

export default function MyOrdersPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { formatFromUSD } = useCurrency();

  const pageText =
    translations[String(language)] ?? englishFallback;

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkingAuth, setCheckingAuth] =
    useState(true);
  const [loadingOrders, setLoadingOrders] =
    useState(true);
  

  useEffect(() => {
    let unsubscribeOrders:
      | (() => void)
      | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        setCheckingAuth(false);

        const ordersQuery = query(
          collection(db, "orders"),
          where(
            "userId",
            "==",
            currentUser.uid
          ),
          orderBy("createdAt", "desc")
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const userOrders: Order[] =
              snapshot.docs.map(
                (orderDocument) => {
                  const data =
                    orderDocument.data();

                  return {
                    id: orderDocument.id,
                    platform:
                      data.platform ?? "",
                    service:
                      data.service ?? "",
                    quality:
                      data.quality ?? "",
                    guarantee:
                      data.guarantee ?? "",
                    speed: data.speed ?? "",
                    link: data.link ?? "",
                    quantity: Number(
                      data.quantity ?? 0
                    ),
                    charge: Number(
                      data.charge ?? 0
                    ),
                    currency:
                      data.currency ?? "USD",
                    status:
                      data.status ?? "Pending",
                    createdAt:
                      data.createdAt,
                  };
                }
              );

            setOrders(userOrders);
            setLoadingOrders(false);
            
          },
          (error) => {
            console.error(
              "Orders load error:",
              error
            );

            setLoadingOrders(false);

            if (
              error.message
                .toLowerCase()
                .includes("index")
            ) {
              toast.error(pageText.indexRequired);
            } else {
              toast.error(pageText.ordersLoadError);
            }
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, [
    router,
    pageText.indexRequired,
    pageText.ordersLoadError,
  ]);

  function formatOrderDate(
    timestamp?: Timestamp
  ) {
    if (!timestamp) {
      return pageText.justNow;
    }

    return timestamp
      .toDate()
      .toLocaleString();
  }

  function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";

      case "processing":
        return "bg-blue-100 text-blue-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      case "refunded":
        return "bg-purple-100 text-purple-700";

      case "partial":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  function translateStatus(status: string) {
    switch (status.toLowerCase()) {
      case "processing":
        return pageText.processing;

      case "completed":
        return pageText.completed;

      case "partial":
        return pageText.partial;

      case "cancelled":
        return pageText.cancelled;

      case "refunded":
        return pageText.refunded;

      default:
        return pageText.pending;
    }
  }

  function translateQuality(quality: string) {
    switch (quality.toLowerCase()) {
      case "premium":
        return pageText.premium;

      case "real audience":
        return pageText.realAudience;

      default:
        return pageText.standard;
    }
  }

  function translateSpeed(speed: string) {
    if (speed.toLowerCase() === "priority") {
      return pageText.priority;
    }

    return pageText.normal;
  }

  function translateGuarantee(
    guarantee: string
  ) {
    if (
      guarantee.toLowerCase() ===
        "no refill" ||
      guarantee.trim() === ""
    ) {
      return pageText.noRefill;
    }

    return guarantee;
  }

  const locale = useMemo(() => {
    const localeMap: Record<string, string> = {
      en: "en-US",
      romanUrdu: "en-PK",
      ur: "ur-PK",
      ar: "ar-SA",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      tr: "tr-TR",
      hi: "hi-IN",
      it: "it-IT",
      pt: "pt-BR",
      ru: "ru-RU",
      zh: "zh-CN",
      ja: "ja-JP",
    };

    return (
      localeMap[String(language)] ??
      "en-US"
    );
  }, [language]);

  function formatDate(timestamp?: Timestamp) {
    if (!timestamp) {
      return pageText.justNow;
    }

    return timestamp.toDate().toLocaleString(
      locale,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }  
   if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          {pageText.checkingLogin}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {pageText.pageTitle}
            </h1>

            <p className="mt-2 text-gray-600">
              {pageText.pageDescription}
            </p>
          </div>

          {loadingOrders ? (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-gray-600">
                {pageText.ordersLoading}
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="text-xl font-bold text-gray-900">
                {pageText.noOrdersTitle}
              </p>

              <p className="mt-2 text-gray-600">
                {pageText.noOrdersDescription}
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/new-order")
                }
                className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
              >
                {pageText.placeNewOrder}
              </button>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="px-5 py-4 font-semibold">
                        {pageText.order}
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        {pageText.service}
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        {pageText.quantity}
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        {pageText.charge}
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        {pageText.status}
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        {pageText.date}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="text-sm text-gray-700"
                      >
                        <td className="px-5 py-5">
                          <p className="font-semibold text-gray-900">
                            {order.platform}
                          </p>

                          {order.link && (
                            <a
                              href={order.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block max-w-48 truncate text-blue-700 hover:underline"
                            >
                              {pageText.openLink}
                            </a>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-semibold text-gray-900">
                            {order.service}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {translateQuality(
                              order.quality
                            )}{" "}
                            ·{" "}
                            {translateGuarantee(
                              order.guarantee
                            )}{" "}
                            ·{" "}
                            {translateSpeed(
                              order.speed
                            )}
                          </p>
                        </td>  
                                                <td className="px-5 py-5 font-medium">
                          {order.quantity.toLocaleString()}
                        </td>

                        <td className="px-5 py-5 font-semibold text-gray-900">
                          {formatFromUSD(order.charge)}
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {translateStatus(order.status)}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-gray-500">
                          {formatDate(order.createdAt)}
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
    </div>
      );
}