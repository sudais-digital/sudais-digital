"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import DashboardSidebar from "../components/DashboardSidebar";
import {
  useLanguage,
  type Language,
} from "../components/LanguageProvider";
import { useCurrency } from "../components/CurrencyProvider";
import { auth, db } from "../lib/firebase";
import toast from "react-hot-toast";

type ServiceOption = {
  id: string;
  platform: string;
  name: string;
  ratePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  refill: string;
  active: boolean;
};

type Quality =
  | "Standard"
  | "Premium"
  | "Real Audience";

type Speed = "Normal" | "Priority";

type PageText = {
  checkingLogin: string;
  platformsLoading: string;
  noActiveServices: string;
  selectPlatformFirst: string;
  noServicesForPlatform: string;
  selectServiceFirst: string;

  loginRequired: string;
  requiredFields: string;
  invalidQuantity: string;
  minimumQuantityMessage: string;
  maximumQuantityMessage: string;
  servicesLoadError: string;
  orderSuccess: string;
  orderError: string;
};

const qualityMultipliers: Record<Quality, number> = {
  Standard: 1,
  Premium: 1.1,
  "Real Audience": 1.25,
};

const speedMultipliers: Record<Speed, number> = {
  Normal: 1,
  Priority: 1.08,
};

const pageTranslations: Partial<
  Record<Language, PageText>
> = {
  en: {
    checkingLogin: "Checking login...",
    platformsLoading: "Platforms loading...",
    noActiveServices:
      "No active services are available.",
    selectPlatformFirst:
      "Please select a platform first.",
    noServicesForPlatform:
      "No service is available for this platform.",
    selectServiceFirst:
      "Please select a service first.",

    loginRequired: "Please log in first.",
    requiredFields:
      "Please complete all required fields.",
    invalidQuantity:
      "Please enter a valid quantity.",
    minimumQuantityMessage:
      "The minimum quantity is",
    maximumQuantityMessage:
      "The maximum quantity is",
    servicesLoadError:
      "Services could not be loaded. Please check the Firebase rules.",
    orderSuccess:
      "Your order was submitted successfully!",
    orderError:
      "The order could not be submitted. Please try again.",
  },

  romanUrdu: {
    checkingLogin: "Login check ho raha hai...",
    platformsLoading:
      "Platforms load ho rahe hain...",
    noActiveServices:
      "Koi active service available nahi hai.",
    selectPlatformFirst:
      "Pehle platform select karein.",
    noServicesForPlatform:
      "Is platform ki koi service available nahi hai.",
    selectServiceFirst:
      "Pehle service select karein.",

    loginRequired: "Pehle login karein.",
    requiredFields:
      "Tamam required fields fill karein.",
    invalidQuantity:
      "Valid quantity enter karein.",
    minimumQuantityMessage:
      "Minimum quantity",
    maximumQuantityMessage:
      "Maximum quantity",
    servicesLoadError:
      "Services load nahi ho sakin. Firebase rules check karein.",
    orderSuccess:
      "Order successfully submit ho gaya!",
    orderError:
      "Order submit nahi ho saka. Dobara try karein.",
  },

  ar: {
    checkingLogin: "جارٍ التحقق من تسجيل الدخول...",
    platformsLoading: "جارٍ تحميل المنصات...",
    noActiveServices: "لا توجد خدمات نشطة متاحة.",
    selectPlatformFirst: "اختر المنصة أولاً.",
    noServicesForPlatform:
      "لا توجد خدمة متاحة لهذه المنصة.",
    selectServiceFirst: "اختر الخدمة أولاً.",

    loginRequired: "يرجى تسجيل الدخول أولاً.",
    requiredFields: "يرجى إكمال جميع الحقول المطلوبة.",
    invalidQuantity: "يرجى إدخال كمية صحيحة.",
    minimumQuantityMessage: "الحد الأدنى للكمية هو",
    maximumQuantityMessage: "الحد الأقصى للكمية هو",
    servicesLoadError:
      "تعذر تحميل الخدمات. تحقق من قواعد Firebase.",
    orderSuccess: "تم إرسال طلبك بنجاح!",
    orderError:
      "تعذر إرسال الطلب. حاول مرة أخرى.",
  },

  es: {
    checkingLogin: "Comprobando inicio de sesión...",
    platformsLoading: "Cargando plataformas...",
    noActiveServices:
      "No hay servicios activos disponibles.",
    selectPlatformFirst:
      "Seleccione primero una plataforma.",
    noServicesForPlatform:
      "No hay servicios disponibles para esta plataforma.",
    selectServiceFirst:
      "Seleccione primero un servicio.",

    loginRequired: "Inicie sesión primero.",
    requiredFields:
      "Complete todos los campos obligatorios.",
    invalidQuantity:
      "Introduzca una cantidad válida.",
    minimumQuantityMessage:
      "La cantidad mínima es",
    maximumQuantityMessage:
      "La cantidad máxima es",
    servicesLoadError:
      "No se pudieron cargar los servicios. Revise las reglas de Firebase.",
    orderSuccess:
      "¡Su pedido se envió correctamente!",
    orderError:
      "No se pudo enviar el pedido. Inténtelo de nuevo.",
  },

  fr: {
    checkingLogin:
      "Vérification de la connexion...",
    platformsLoading:
      "Chargement des plateformes...",
    noActiveServices:
      "Aucun service actif n'est disponible.",
    selectPlatformFirst:
      "Sélectionnez d'abord une plateforme.",
    noServicesForPlatform:
      "Aucun service n'est disponible pour cette plateforme.",
    selectServiceFirst:
      "Sélectionnez d'abord un service.",

    loginRequired:
      "Veuillez d'abord vous connecter.",
    requiredFields:
      "Remplissez tous les champs obligatoires.",
    invalidQuantity:
      "Saisissez une quantité valide.",
    minimumQuantityMessage:
      "La quantité minimale est",
    maximumQuantityMessage:
      "La quantité maximale est",
    servicesLoadError:
      "Les services n'ont pas pu être chargés. Vérifiez les règles Firebase.",
    orderSuccess:
      "Votre commande a été envoyée avec succès !",
    orderError:
      "La commande n'a pas pu être envoyée. Réessayez.",
  },

  de: {
    checkingLogin:
      "Anmeldung wird überprüft...",
    platformsLoading:
      "Plattformen werden geladen...",
    noActiveServices:
      "Keine aktiven Dienste verfügbar.",
    selectPlatformFirst:
      "Wählen Sie zuerst eine Plattform.",
    noServicesForPlatform:
      "Für diese Plattform ist kein Dienst verfügbar.",
    selectServiceFirst:
      "Wählen Sie zuerst einen Dienst.",

    loginRequired:
      "Bitte melden Sie sich zuerst an.",
    requiredFields:
      "Füllen Sie alle Pflichtfelder aus.",
    invalidQuantity:
      "Geben Sie eine gültige Menge ein.",
    minimumQuantityMessage:
      "Die Mindestmenge beträgt",
    maximumQuantityMessage:
      "Die Höchstmenge beträgt",
    servicesLoadError:
      "Dienste konnten nicht geladen werden. Prüfen Sie die Firebase-Regeln.",
    orderSuccess:
      "Ihre Bestellung wurde erfolgreich gesendet!",
    orderError:
      "Die Bestellung konnte nicht gesendet werden. Versuchen Sie es erneut.",
  },

  tr: {
    checkingLogin:
      "Giriş kontrol ediliyor...",
    platformsLoading:
      "Platformlar yükleniyor...",
    noActiveServices:
      "Aktif hizmet bulunmamaktadır.",
    selectPlatformFirst:
      "Önce bir platform seçin.",
    noServicesForPlatform:
      "Bu platform için hizmet bulunmamaktadır.",
    selectServiceFirst:
      "Önce bir hizmet seçin.",

    loginRequired:
      "Lütfen önce giriş yapın.",
    requiredFields:
      "Tüm zorunlu alanları doldurun.",
    invalidQuantity:
      "Geçerli bir miktar girin.",
    minimumQuantityMessage:
      "Minimum miktar",
    maximumQuantityMessage:
      "Maksimum miktar",
    servicesLoadError:
      "Hizmetler yüklenemedi. Firebase kurallarını kontrol edin.",
    orderSuccess:
      "Siparişiniz başarıyla gönderildi!",
    orderError:
      "Sipariş gönderilemedi. Tekrar deneyin.",
  },

  hi: {
    checkingLogin:
      "लॉगिन की जाँच हो रही है...",
    platformsLoading:
      "प्लेटफ़ॉर्म लोड हो रहे हैं...",
    noActiveServices:
      "कोई सक्रिय सेवा उपलब्ध नहीं है।",
    selectPlatformFirst:
      "पहले प्लेटफ़ॉर्म चुनें।",
    noServicesForPlatform:
      "इस प्लेटफ़ॉर्म के लिए कोई सेवा उपलब्ध नहीं है।",
    selectServiceFirst:
      "पहले सेवा चुनें।",

    loginRequired:
      "कृपया पहले लॉगिन करें।",
    requiredFields:
      "सभी आवश्यक फ़ील्ड भरें।",
    invalidQuantity:
      "सही मात्रा दर्ज करें।",
    minimumQuantityMessage:
      "न्यूनतम मात्रा है",
    maximumQuantityMessage:
      "अधिकतम मात्रा है",
    servicesLoadError:
      "सेवाएं लोड नहीं हो सकीं। Firebase नियम जाँचें।",
    orderSuccess:
      "आपका ऑर्डर सफलतापूर्वक सबमिट हो गया!",
    orderError:
      "ऑर्डर सबमिट नहीं हो सका। दोबारा प्रयास करें।",
  },

  it: {
    checkingLogin:
      "Controllo accesso...",
    platformsLoading:
      "Caricamento piattaforme...",
    noActiveServices:
      "Nessun servizio attivo disponibile.",
    selectPlatformFirst:
      "Seleziona prima una piattaforma.",
    noServicesForPlatform:
      "Nessun servizio disponibile per questa piattaforma.",
    selectServiceFirst:
      "Seleziona prima un servizio.",

    loginRequired:
      "Accedi prima di continuare.",
    requiredFields:
      "Compila tutti i campi obbligatori.",
    invalidQuantity:
      "Inserisci una quantità valida.",
    minimumQuantityMessage:
      "La quantità minima è",
    maximumQuantityMessage:
      "La quantità massima è",
    servicesLoadError:
      "Impossibile caricare i servizi. Controlla le regole Firebase.",
    orderSuccess:
      "Ordine inviato con successo!",
    orderError:
      "Impossibile inviare l'ordine. Riprova.",
  },

  pt: {
    checkingLogin:
      "Verificando login...",
    platformsLoading:
      "Carregando plataformas...",
    noActiveServices:
      "Nenhum serviço ativo disponível.",
    selectPlatformFirst:
      "Selecione primeiro uma plataforma.",
    noServicesForPlatform:
      "Nenhum serviço disponível para esta plataforma.",
    selectServiceFirst:
      "Selecione primeiro um serviço.",

    loginRequired:
      "Faça login primeiro.",
    requiredFields:
      "Preencha todos os campos obrigatórios.",
    invalidQuantity:
      "Digite uma quantidade válida.",
    minimumQuantityMessage:
      "A quantidade mínima é",
    maximumQuantityMessage:
      "A quantidade máxima é",
    servicesLoadError:
      "Não foi possível carregar os serviços. Verifique as regras do Firebase.",
    orderSuccess:
      "Seu pedido foi enviado com sucesso!",
    orderError:
      "Não foi possível enviar o pedido. Tente novamente.",
  },

  ru: {
    checkingLogin:
      "Проверка входа...",
    platformsLoading:
      "Загрузка платформ...",
    noActiveServices:
      "Активные услуги отсутствуют.",
    selectPlatformFirst:
      "Сначала выберите платформу.",
    noServicesForPlatform:
      "Для этой платформы нет доступных услуг.",
    selectServiceFirst:
      "Сначала выберите услугу.",

    loginRequired:
      "Сначала войдите в систему.",
    requiredFields:
      "Заполните все обязательные поля.",
    invalidQuantity:
      "Введите правильное количество.",
    minimumQuantityMessage:
      "Минимальное количество",
    maximumQuantityMessage:
      "Максимальное количество",
    servicesLoadError:
      "Не удалось загрузить услуги. Проверьте правила Firebase.",
    orderSuccess:
      "Ваш заказ успешно отправлен!",
    orderError:
      "Не удалось отправить заказ. Попробуйте снова.",
  },

  zh: {
    checkingLogin: "正在检查登录状态...",
    platformsLoading: "正在加载平台...",
    noActiveServices: "没有可用的活跃服务。",
    selectPlatformFirst: "请先选择平台。",
    noServicesForPlatform: "此平台没有可用服务。",
    selectServiceFirst: "请先选择服务。",

    loginRequired: "请先登录。",
    requiredFields: "请填写所有必填字段。",
    invalidQuantity: "请输入有效数量。",
    minimumQuantityMessage: "最小数量为",
    maximumQuantityMessage: "最大数量为",
    servicesLoadError:
      "无法加载服务。请检查 Firebase 规则。",
    orderSuccess: "订单提交成功！",
    orderError: "订单提交失败，请重试。",
  },

  ja: {
    checkingLogin:
      "ログインを確認しています...",
    platformsLoading:
      "プラットフォームを読み込み中...",
    noActiveServices:
      "利用可能なサービスがありません。",
    selectPlatformFirst:
      "最初にプラットフォームを選択してください。",
    noServicesForPlatform:
      "このプラットフォームにはサービスがありません。",
    selectServiceFirst:
      "最初にサービスを選択してください。",

    loginRequired:
      "最初にログインしてください。",
    requiredFields:
      "すべての必須項目を入力してください。",
    invalidQuantity:
      "有効な数量を入力してください。",
    minimumQuantityMessage:
      "最小数量は",
    maximumQuantityMessage:
      "最大数量は",
    servicesLoadError:
      "サービスを読み込めませんでした。Firebaseルールを確認してください。",
    orderSuccess:
      "注文が正常に送信されました！",
    orderError:
      "注文を送信できませんでした。もう一度お試しください。",
  },
};

const englishFallback =
  pageTranslations.en as PageText;

export default function NewOrderPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { formatFromUSD } = useCurrency();

  const pageText =
    pageTranslations[language] ?? englishFallback;

  const [user, setUser] =
    useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [services, setServices] = useState<
    ServiceOption[]
  >([]);
  const [loadingServices, setLoadingServices] =
    useState(true);

  const [platform, setPlatform] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quality, setQuality] =
    useState<Quality>("Standard");
  const [speed, setSpeed] =
    useState<Speed>("Normal");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        setCheckingAuth(false);
      }
    );

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    const unsubscribeServices = onSnapshot(
      collection(db, "services"),
      (snapshot) => {
        const loadedServices: ServiceOption[] =
          snapshot.docs
            .map((serviceDocument) => {
              const data = serviceDocument.data();

              return {
                id: serviceDocument.id,
                platform: String(
                  data.platform ?? ""
                ),
                name: String(data.name ?? ""),
                ratePer1000: Number(
                  data.ratePer1000 ?? 0
                ),
                minQuantity: Number(
                  data.minQuantity ?? 1
                ),
                maxQuantity: Number(
                  data.maxQuantity ?? 10000
                ),
                refill: String(
                  data.refill ?? "No Refill"
                ),
                active: data.active !== false,
              };
            })
            .filter(
              (service) =>
                service.active &&
                service.platform.trim() !== "" &&
                service.name.trim() !== ""
            );

        setServices(loadedServices);
        setLoadingServices(false);
        
      },
      (error) => {
        console.error(
          "Services load error:",
          error
        );

        setLoadingServices(false);
        toast.error(pageText.servicesLoadError);
      }
    );

    return () => unsubscribeServices();
  }, [pageText.servicesLoadError]);

  const platforms = useMemo(() => {
    return Array.from(
      new Set(
        services.map(
          (service) => service.platform
        )
      )
    );
  }, [services]);

  const availableServices = useMemo(() => {
    if (!platform) {
      return [];
    }

    return services.filter(
      (service) =>
        service.platform === platform
    );
  }, [platform, services]);

  const selectedService = useMemo(() => {
    return services.find(
      (service) => service.id === serviceId
    );
  }, [services, serviceId]);

  const estimatedCharge = useMemo(() => {
    const numericQuantity = Number(quantity);

    if (
      !selectedService ||
      !Number.isFinite(numericQuantity) ||
      numericQuantity < 1
    ) {
      return 0;
    }

    const baseCharge =
      (numericQuantity / 1000) *
      selectedService.ratePer1000;

    return (
      baseCharge *
      qualityMultipliers[quality] *
      speedMultipliers[speed]
    );
  }, [
    quantity,
    selectedService,
    quality,
    speed,
  ]);

  function handlePlatformChange(value: string) {
    setPlatform(value);
    setServiceId("");
    setQuantity("");
    
  }

  function handleServiceChange(value: string) {
    setServiceId(value);
    setQuantity("");
    
  }

  async function handleOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    

    if (!user) {
      toast.error(pageText.loginRequired);
      return;
    }

    if (
      !platform ||
      !selectedService ||
      !link.trim() ||
      !quantity
    ) {
      toast.error(pageText.requiredFields);
      return;
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity <= 0
    ) {
      toast.error(pageText.invalidQuantity);
      return;
    }

    if (
      numericQuantity <
      selectedService.minQuantity
    ) {
      toast.error(`${pageText.minimumQuantityMessage} ${selectedService.minQuantity.toLocaleString()}.`);
      return;
    }

    if (
      numericQuantity >
      selectedService.maxQuantity
    ) {
      toast.error(`${pageText.maximumQuantityMessage} ${selectedService.maxQuantity.toLocaleString()}.`);
      return;
    }

    try {
      setSubmitting(true);

      const idToken = await user.getIdToken();

      const response = await fetch(
        "/api/orders/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            serviceId: selectedService.id,
            link: link.trim(),
            quantity: numericQuantity,
            quality,
            speed,
          }),
        }
      );

      const result = (await response.json()) as {
        message?: string;
        code?: string;
        charge?: number;
        currency?: string;
        orderId?: string;
        providerOrderId?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message || pageText.orderError
        );
      }

      toast.success(result.message || pageText.orderSuccess);

      setPlatform("");
      setServiceId("");
      setQuality("Standard");
      setSpeed("Normal");
      setLink("");
      setQuantity("");
    } catch (error) {
      console.error(
        "Automatic order submit error:",
        error
      );

      if (error instanceof Error) {
        toast.error(error.message || pageText.orderError);
      } else {
        toast.error(pageText.orderError);
      }
    } finally {
      setSubmitting(false);
    }
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
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("placeNewOrder")}
          </h1>

          <p className="mt-2 text-gray-600">
            {t("orderDescription")}
          </p>

          <form
            onSubmit={handleOrder}
            className="mt-8 space-y-6 rounded-2xl bg-white p-5 shadow-sm md:p-8"
          >
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("socialMediaPlatform")}
              </label>

              <select
                value={platform}
                onChange={(event) =>
                  handlePlatformChange(
                    event.target.value
                  )
                }
                disabled={loadingServices}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 disabled:bg-gray-100"
                required
              >
                <option value="">
                  {loadingServices
                    ? pageText.platformsLoading
                    : platforms.length === 0
                      ? pageText.noActiveServices
                      : t("selectPlatform")}
                </option>

                {platforms.map(
                  (platformName) => (
                    <option
                      key={platformName}
                      value={platformName}
                    >
                      {platformName}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("serviceType")}
              </label>

              <select
                value={serviceId}
                onChange={(event) =>
                  handleServiceChange(
                    event.target.value
                  )
                }
                disabled={
                  !platform || loadingServices
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 disabled:bg-gray-100"
                required
              >
                <option value="">
                  {!platform
                    ? pageText.selectPlatformFirst
                    : availableServices.length ===
                        0
                      ? pageText.noServicesForPlatform
                      : t("selectService")}
                </option>

                {availableServices.map(
                  (service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name} —{" "}
                      {formatFromUSD(service.ratePer1000)}
                      /1000
                    </option>
                  )
                )}
              </select>
            </div>

            {selectedService && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t("minimumQuantity")}
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {selectedService.minQuantity.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      {t("maximumQuantity")}
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {selectedService.maxQuantity.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      {t("refillGuarantee")}
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {selectedService.refill}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      {t("pricePer1000")}
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {formatFromUSD(selectedService.ratePer1000)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("serviceQuality")}
              </label>

              <select
                value={quality}
                onChange={(event) =>
                  setQuality(
                    event.target.value as Quality
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              >
                <option value="Standard">
                  {t("standard")}
                </option>

                <option value="Premium">
                  {t("premiumQuality")}
                </option>

                <option value="Real Audience">
                  {t("realAudience")}
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("processingSpeed")}
              </label>

              <select
                value={speed}
                onChange={(event) =>
                  setSpeed(
                    event.target.value as Speed
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              >
                <option value="Normal">
                  {t("normalProcessing")}
                </option>

                <option value="Priority">
                  {t("priorityProcessing")}
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("profileLink")}
              </label>

              <input
                type="url"
                value={link}
                onChange={(event) =>
                  setLink(event.target.value)
                }
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                {t("quantity")}
              </label>

              <input
                type="number"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                placeholder={
                  selectedService
                    ? `${t("minimumQuantity")}: ${selectedService.minQuantity}`
                    : pageText.selectServiceFirst
                }
                min={
                  selectedService?.minQuantity ??
                  1
                }
                max={
                  selectedService?.maxQuantity
                }
                disabled={!selectedService}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-600 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="grid gap-4 rounded-xl bg-gray-50 p-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">
                  {t("selectedService")}
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  {selectedService?.name ??
                    t("notSelected")}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  {t("refillGuarantee")}
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  {selectedService?.refill ??
                    t("notSelected")}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  {t("quantity")}
                </p>

                <p className="mt-1 font-bold text-gray-900">
                  {quantity || "0"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  {t("estimatedCharge")}
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {formatFromUSD(estimatedCharge)}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingServices ||
                !selectedService
              }
              className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? t("submittingOrder")
                : t("submitOrder")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}