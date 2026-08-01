"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language =
  | "en"
  | "romanUrdu"
  | "ar"
  | "es"
  | "fr"
  | "de"
  | "tr"
  | "hi"
  | "it"
  | "pt"
  | "ru"
  | "zh"
  | "ja";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

type TranslationDictionary = Record<
  Language,
  Record<string, string>
>;

export const languageOptions: {
  code: Language;
  label: string;
}[] = [
  { code: "en", label: "🇺🇸 English" },
  { code: "romanUrdu", label: "🇵🇰 Roman Urdu" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "hi", label: "🇮🇳 हिन्दी" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "pt", label: "🇵🇹 Português" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "zh", label: "🇨🇳 中文" },
  { code: "ja", label: "🇯🇵 日本語" },
];

const translations: TranslationDictionary = {
  en: {
    language: "Language",
    dashboard: "Dashboard",
    newOrder: "New Order",
    myOrders: "My Orders",
    services: "Services",
    addFunds: "Add Funds",
    referrals: "Referrals",
    premium: "Premium",
    settings: "Settings",
    logout: "Logout",

    placeNewOrder: "Place New Order",
    orderDescription:
      "Select a platform and service to place your order.",
    socialMediaPlatform: "Social Media Platform",
    selectPlatform: "Select platform",
    serviceType: "Service Type",
    selectService: "Select service",
    serviceQuality: "Service Quality",
    processingSpeed: "Processing Speed",
    standard: "Standard",
    premiumQuality: "Premium Quality",
    realAudience: "Real Audience",
    normalProcessing: "Normal Processing",
    priorityProcessing: "Priority Processing",
    profileLink: "Profile, Page or Post Link",
    quantity: "Quantity",
    minimumQuantity: "Minimum Quantity",
    maximumQuantity: "Maximum Quantity",
    refillGuarantee: "Refill Guarantee",
    pricePer1000: "Price Per 1000",
    estimatedCharge: "Estimated Charge",
    selectedService: "Selected Service",
    submitOrder: "Submit Order",
    submittingOrder: "Submitting Order...",

    addFundsTitle: "Add Funds",
    addFundsDescription:
      "Complete your payment and submit the details for verification.",
    currentWalletBalance: "Current Wallet Balance",
    submitPaymentDetails: "Submit Payment Details",
    paymentMethod: "Payment Method",
    amount: "Amount",
    senderName: "Sender Name",
    senderAccount: "Sender Account / Number",
    transactionReference: "Transaction ID / Reference",
    additionalNotes: "Additional Notes",
    submitFundRequest: "Submit Fund Request",
    submittingRequest: "Submitting Request...",

    loading: "Loading...",
    notSelected: "Not selected",
    active: "Active",
    inactive: "Inactive",
    edit: "Edit",
    delete: "Delete",
    enable: "Enable",
    disable: "Disable",
    backToAdmin: "Back to Admin",
  },

  romanUrdu: {
    language: "Zaban",
    dashboard: "Dashboard",
    newOrder: "Naya Order",
    myOrders: "Mere Orders",
    services: "Services",
    addFunds: "Funds Add Karein",
    referrals: "Referrals",
    premium: "Premium",
    settings: "Settings",
    logout: "Logout",

    placeNewOrder: "Naya Order Lagayen",
    orderDescription:
      "Platform aur service select karke order submit karein.",
    socialMediaPlatform: "Social Media Platform",
    selectPlatform: "Platform select karein",
    serviceType: "Service Type",
    selectService: "Service select karein",
    serviceQuality: "Service Quality",
    processingSpeed: "Processing Speed",
    standard: "Standard",
    premiumQuality: "Premium Quality",
    realAudience: "Real Audience",
    normalProcessing: "Normal Processing",
    priorityProcessing: "Priority Processing",
    profileLink: "Profile, Page ya Post Link",
    quantity: "Quantity",
    minimumQuantity: "Minimum Quantity",
    maximumQuantity: "Maximum Quantity",
    refillGuarantee: "Refill Guarantee",
    pricePer1000: "Har 1000 ki Price",
    estimatedCharge: "Andazati Charge",
    selectedService: "Selected Service",
    submitOrder: "Order Submit Karein",
    submittingOrder: "Order Submit Ho Raha Hai...",

    addFundsTitle: "Funds Add Karein",
    addFundsDescription:
      "Payment complete karke verification ke liye details submit karein.",
    currentWalletBalance: "Current Wallet Balance",
    submitPaymentDetails: "Payment Details Submit Karein",
    paymentMethod: "Payment Method",
    amount: "Amount",
    senderName: "Sender Ka Naam",
    senderAccount: "Sender Account ya Number",
    transactionReference: "Transaction ID ya Reference",
    additionalNotes: "Additional Notes",
    submitFundRequest: "Fund Request Submit Karein",
    submittingRequest: "Request Submit Ho Rahi Hai...",

    loading: "Loading...",
    notSelected: "Select nahi hua",
    active: "Active",
    inactive: "Inactive",
    edit: "Edit",
    delete: "Delete",
    enable: "Enable",
    disable: "Disable",
    backToAdmin: "Admin Par Wapas",
  },

  ar: {
    language: "اللغة",
    dashboard: "لوحة التحكم",
    newOrder: "طلب جديد",
    myOrders: "طلباتي",
    services: "الخدمات",
    addFunds: "إضافة أموال",
    referrals: "الإحالات",
    premium: "مميز",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",

    placeNewOrder: "إنشاء طلب جديد",
    orderDescription: "اختر المنصة والخدمة لإرسال الطلب.",
    socialMediaPlatform: "منصة التواصل الاجتماعي",
    selectPlatform: "اختر المنصة",
    serviceType: "نوع الخدمة",
    selectService: "اختر الخدمة",
    serviceQuality: "جودة الخدمة",
    processingSpeed: "سرعة التنفيذ",
    standard: "قياسي",
    premiumQuality: "جودة مميزة",
    realAudience: "جمهور حقيقي",
    normalProcessing: "تنفيذ عادي",
    priorityProcessing: "تنفيذ أولوية",
    profileLink: "رابط الملف أو الصفحة أو المنشور",
    quantity: "الكمية",
    minimumQuantity: "الحد الأدنى",
    maximumQuantity: "الحد الأقصى",
    refillGuarantee: "ضمان التعويض",
    pricePer1000: "السعر لكل 1000",
    estimatedCharge: "التكلفة التقديرية",
    selectedService: "الخدمة المختارة",
    submitOrder: "إرسال الطلب",
    submittingOrder: "جارٍ إرسال الطلب...",

    addFundsTitle: "إضافة أموال",
    addFundsDescription:
      "أكمل الدفع ثم أرسل التفاصيل للتحقق.",
    currentWalletBalance: "رصيد المحفظة الحالي",
    submitPaymentDetails: "إرسال تفاصيل الدفع",
    paymentMethod: "طريقة الدفع",
    amount: "المبلغ",
    senderName: "اسم المرسل",
    senderAccount: "حساب أو رقم المرسل",
    transactionReference: "رقم المعاملة أو المرجع",
    additionalNotes: "ملاحظات إضافية",
    submitFundRequest: "إرسال طلب الإيداع",
    submittingRequest: "جارٍ إرسال الطلب...",

    loading: "جارٍ التحميل...",
    notSelected: "غير محدد",
    active: "نشط",
    inactive: "غير نشط",
    edit: "تعديل",
    delete: "حذف",
    enable: "تفعيل",
    disable: "تعطيل",
    backToAdmin: "العودة للإدارة",
  },

  es: {
    language: "Idioma",
    dashboard: "Panel",
    newOrder: "Nuevo pedido",
    myOrders: "Mis pedidos",
    services: "Servicios",
    addFunds: "Agregar fondos",
    referrals: "Referidos",
    premium: "Premium",
    settings: "Configuración",
    logout: "Cerrar sesión",

    placeNewOrder: "Realizar nuevo pedido",
    orderDescription:
      "Seleccione una plataforma y un servicio para realizar su pedido.",
    socialMediaPlatform: "Plataforma de redes sociales",
    selectPlatform: "Seleccionar plataforma",
    serviceType: "Tipo de servicio",
    selectService: "Seleccionar servicio",
    serviceQuality: "Calidad del servicio",
    processingSpeed: "Velocidad de procesamiento",
    standard: "Estándar",
    premiumQuality: "Calidad premium",
    realAudience: "Audiencia real",
    normalProcessing: "Procesamiento normal",
    priorityProcessing: "Procesamiento prioritario",
    profileLink: "Enlace de perfil, página o publicación",
    quantity: "Cantidad",
    minimumQuantity: "Cantidad mínima",
    maximumQuantity: "Cantidad máxima",
    refillGuarantee: "Garantía de reposición",
    pricePer1000: "Precio por 1000",
    estimatedCharge: "Costo estimado",
    selectedService: "Servicio seleccionado",
    submitOrder: "Enviar pedido",
    submittingOrder: "Enviando pedido...",

    addFundsTitle: "Agregar fondos",
    addFundsDescription:
      "Complete el pago y envíe los detalles para verificación.",
    currentWalletBalance: "Saldo actual",
    submitPaymentDetails: "Enviar detalles de pago",
    paymentMethod: "Método de pago",
    amount: "Cantidad",
    senderName: "Nombre del remitente",
    senderAccount: "Cuenta o número del remitente",
    transactionReference: "ID de transacción o referencia",
    additionalNotes: "Notas adicionales",
    submitFundRequest: "Enviar solicitud",
    submittingRequest: "Enviando solicitud...",

    loading: "Cargando...",
    notSelected: "No seleccionado",
    active: "Activo",
    inactive: "Inactivo",
    edit: "Editar",
    delete: "Eliminar",
    enable: "Activar",
    disable: "Desactivar",
    backToAdmin: "Volver al administrador",
  },

  fr: {
    language: "Langue",
    dashboard: "Tableau de bord",
    newOrder: "Nouvelle commande",
    myOrders: "Mes commandes",
    services: "Services",
    addFunds: "Ajouter des fonds",
    referrals: "Parrainages",
    premium: "Premium",
    settings: "Paramètres",
    logout: "Déconnexion",

    placeNewOrder: "Passer une nouvelle commande",
    orderDescription:
      "Sélectionnez une plateforme et un service.",
    socialMediaPlatform: "Plateforme sociale",
    selectPlatform: "Sélectionner une plateforme",
    serviceType: "Type de service",
    selectService: "Sélectionner un service",
    serviceQuality: "Qualité du service",
    processingSpeed: "Vitesse de traitement",
    standard: "Standard",
    premiumQuality: "Qualité premium",
    realAudience: "Audience réelle",
    normalProcessing: "Traitement normal",
    priorityProcessing: "Traitement prioritaire",
    profileLink: "Lien du profil, de la page ou de la publication",
    quantity: "Quantité",
    minimumQuantity: "Quantité minimale",
    maximumQuantity: "Quantité maximale",
    refillGuarantee: "Garantie de remplacement",
    pricePer1000: "Prix pour 1000",
    estimatedCharge: "Coût estimé",
    selectedService: "Service sélectionné",
    submitOrder: "Envoyer la commande",
    submittingOrder: "Envoi en cours...",

    addFundsTitle: "Ajouter des fonds",
    addFundsDescription:
      "Effectuez le paiement et envoyez les informations.",
    currentWalletBalance: "Solde actuel",
    submitPaymentDetails: "Envoyer les informations de paiement",
    paymentMethod: "Mode de paiement",
    amount: "Montant",
    senderName: "Nom de l'expéditeur",
    senderAccount: "Compte ou numéro de l'expéditeur",
    transactionReference: "ID de transaction ou référence",
    additionalNotes: "Notes supplémentaires",
    submitFundRequest: "Envoyer la demande",
    submittingRequest: "Envoi de la demande...",

    loading: "Chargement...",
    notSelected: "Non sélectionné",
    active: "Actif",
    inactive: "Inactif",
    edit: "Modifier",
    delete: "Supprimer",
    enable: "Activer",
    disable: "Désactiver",
    backToAdmin: "Retour à l'administration",
  },

  de: {
    language: "Sprache",
    dashboard: "Dashboard",
    newOrder: "Neue Bestellung",
    myOrders: "Meine Bestellungen",
    services: "Dienste",
    addFunds: "Guthaben hinzufügen",
    referrals: "Empfehlungen",
    premium: "Premium",
    settings: "Einstellungen",
    logout: "Abmelden",

    placeNewOrder: "Neue Bestellung aufgeben",
    orderDescription:
      "Wählen Sie Plattform und Dienst aus.",
    socialMediaPlatform: "Social-Media-Plattform",
    selectPlatform: "Plattform auswählen",
    serviceType: "Diensttyp",
    selectService: "Dienst auswählen",
    serviceQuality: "Dienstqualität",
    processingSpeed: "Bearbeitungsgeschwindigkeit",
    standard: "Standard",
    premiumQuality: "Premium-Qualität",
    realAudience: "Echte Zielgruppe",
    normalProcessing: "Normale Bearbeitung",
    priorityProcessing: "Prioritätsbearbeitung",
    profileLink: "Profil-, Seiten- oder Beitragslink",
    quantity: "Menge",
    minimumQuantity: "Mindestmenge",
    maximumQuantity: "Höchstmenge",
    refillGuarantee: "Nachfüllgarantie",
    pricePer1000: "Preis pro 1000",
    estimatedCharge: "Geschätzte Kosten",
    selectedService: "Ausgewählter Dienst",
    submitOrder: "Bestellung absenden",
    submittingOrder: "Bestellung wird gesendet...",

    addFundsTitle: "Guthaben hinzufügen",
    addFundsDescription:
      "Zahlung abschließen und Details zur Prüfung senden.",
    currentWalletBalance: "Aktuelles Guthaben",
    submitPaymentDetails: "Zahlungsdetails senden",
    paymentMethod: "Zahlungsmethode",
    amount: "Betrag",
    senderName: "Name des Absenders",
    senderAccount: "Konto oder Nummer des Absenders",
    transactionReference: "Transaktions-ID oder Referenz",
    additionalNotes: "Zusätzliche Hinweise",
    submitFundRequest: "Anfrage senden",
    submittingRequest: "Anfrage wird gesendet...",

    loading: "Wird geladen...",
    notSelected: "Nicht ausgewählt",
    active: "Aktiv",
    inactive: "Inaktiv",
    edit: "Bearbeiten",
    delete: "Löschen",
    enable: "Aktivieren",
    disable: "Deaktivieren",
    backToAdmin: "Zurück zum Admin",
  },

  tr: {
    language: "Dil",
    dashboard: "Kontrol Paneli",
    newOrder: "Yeni Sipariş",
    myOrders: "Siparişlerim",
    services: "Hizmetler",
    addFunds: "Bakiye Ekle",
    referrals: "Referanslar",
    premium: "Premium",
    settings: "Ayarlar",
    logout: "Çıkış",

    placeNewOrder: "Yeni Sipariş Ver",
    orderDescription:
      "Platform ve hizmet seçerek siparişinizi gönderin.",
    socialMediaPlatform: "Sosyal Medya Platformu",
    selectPlatform: "Platform seçin",
    serviceType: "Hizmet Türü",
    selectService: "Hizmet seçin",
    serviceQuality: "Hizmet Kalitesi",
    processingSpeed: "İşlem Hızı",
    standard: "Standart",
    premiumQuality: "Premium Kalite",
    realAudience: "Gerçek Kitle",
    normalProcessing: "Normal İşlem",
    priorityProcessing: "Öncelikli İşlem",
    profileLink: "Profil, Sayfa veya Gönderi Bağlantısı",
    quantity: "Miktar",
    minimumQuantity: "Minimum Miktar",
    maximumQuantity: "Maksimum Miktar",
    refillGuarantee: "Yenileme Garantisi",
    pricePer1000: "1000 Başına Fiyat",
    estimatedCharge: "Tahmini Ücret",
    selectedService: "Seçilen Hizmet",
    submitOrder: "Siparişi Gönder",
    submittingOrder: "Sipariş Gönderiliyor...",

    addFundsTitle: "Bakiye Ekle",
    addFundsDescription:
      "Ödemeyi tamamlayın ve bilgileri doğrulama için gönderin.",
    currentWalletBalance: "Mevcut Cüzdan Bakiyesi",
    submitPaymentDetails: "Ödeme Bilgilerini Gönder",
    paymentMethod: "Ödeme Yöntemi",
    amount: "Tutar",
    senderName: "Gönderen Adı",
    senderAccount: "Gönderen Hesabı veya Numarası",
    transactionReference: "İşlem Kimliği veya Referans",
    additionalNotes: "Ek Notlar",
    submitFundRequest: "Bakiye Talebi Gönder",
    submittingRequest: "Talep Gönderiliyor...",

    loading: "Yükleniyor...",
    notSelected: "Seçilmedi",
    active: "Aktif",
    inactive: "Pasif",
    edit: "Düzenle",
    delete: "Sil",
    enable: "Etkinleştir",
    disable: "Devre dışı bırak",
    backToAdmin: "Yöneticiye Dön",
  },

  hi: {
    language: "भाषा",
    dashboard: "डैशबोर्ड",
    newOrder: "नया ऑर्डर",
    myOrders: "मेरे ऑर्डर",
    services: "सेवाएं",
    addFunds: "फंड जोड़ें",
    referrals: "रेफरल",
    premium: "प्रीमियम",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",

    placeNewOrder: "नया ऑर्डर करें",
    orderDescription:
      "प्लेटफ़ॉर्म और सेवा चुनकर ऑर्डर भेजें।",
    socialMediaPlatform: "सोशल मीडिया प्लेटफ़ॉर्म",
    selectPlatform: "प्लेटफ़ॉर्म चुनें",
    serviceType: "सेवा प्रकार",
    selectService: "सेवा चुनें",
    serviceQuality: "सेवा गुणवत्ता",
    processingSpeed: "प्रोसेसिंग गति",
    standard: "स्टैंडर्ड",
    premiumQuality: "प्रीमियम गुणवत्ता",
    realAudience: "वास्तविक ऑडियंस",
    normalProcessing: "सामान्य प्रोसेसिंग",
    priorityProcessing: "प्राथमिकता प्रोसेसिंग",
    profileLink: "प्रोफ़ाइल, पेज या पोस्ट लिंक",
    quantity: "मात्रा",
    minimumQuantity: "न्यूनतम मात्रा",
    maximumQuantity: "अधिकतम मात्रा",
    refillGuarantee: "रिफिल गारंटी",
    pricePer1000: "प्रति 1000 कीमत",
    estimatedCharge: "अनुमानित शुल्क",
    selectedService: "चुनी गई सेवा",
    submitOrder: "ऑर्डर सबमिट करें",
    submittingOrder: "ऑर्डर सबमिट हो रहा है...",

    addFundsTitle: "फंड जोड़ें",
    addFundsDescription:
      "भुगतान पूरा करके सत्यापन के लिए जानकारी भेजें।",
    currentWalletBalance: "वर्तमान वॉलेट बैलेंस",
    submitPaymentDetails: "भुगतान विवरण भेजें",
    paymentMethod: "भुगतान विधि",
    amount: "राशि",
    senderName: "भेजने वाले का नाम",
    senderAccount: "भेजने वाले का खाता या नंबर",
    transactionReference: "ट्रांजैक्शन आईडी या रेफरेंस",
    additionalNotes: "अतिरिक्त नोट्स",
    submitFundRequest: "फंड अनुरोध भेजें",
    submittingRequest: "अनुरोध भेजा जा रहा है...",

    loading: "लोड हो रहा है...",
    notSelected: "चयनित नहीं",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    edit: "संपादित करें",
    delete: "हटाएं",
    enable: "सक्रिय करें",
    disable: "निष्क्रिय करें",
    backToAdmin: "एडमिन पर वापस",
  },

  it: {
    language: "Lingua",
    dashboard: "Dashboard",
    newOrder: "Nuovo ordine",
    myOrders: "I miei ordini",
    services: "Servizi",
    addFunds: "Aggiungi fondi",
    referrals: "Referral",
    premium: "Premium",
    settings: "Impostazioni",
    logout: "Esci",

    placeNewOrder: "Effettua un nuovo ordine",
    orderDescription:
      "Seleziona una piattaforma e un servizio.",
    socialMediaPlatform: "Piattaforma social",
    selectPlatform: "Seleziona piattaforma",
    serviceType: "Tipo di servizio",
    selectService: "Seleziona servizio",
    serviceQuality: "Qualità del servizio",
    processingSpeed: "Velocità di elaborazione",
    standard: "Standard",
    premiumQuality: "Qualità premium",
    realAudience: "Pubblico reale",
    normalProcessing: "Elaborazione normale",
    priorityProcessing: "Elaborazione prioritaria",
    profileLink: "Link profilo, pagina o post",
    quantity: "Quantità",
    minimumQuantity: "Quantità minima",
    maximumQuantity: "Quantità massima",
    refillGuarantee: "Garanzia refill",
    pricePer1000: "Prezzo per 1000",
    estimatedCharge: "Costo stimato",
    selectedService: "Servizio selezionato",
    submitOrder: "Invia ordine",
    submittingOrder: "Invio ordine...",

    addFundsTitle: "Aggiungi fondi",
    addFundsDescription:
      "Completa il pagamento e invia i dettagli.",
    currentWalletBalance: "Saldo attuale",
    submitPaymentDetails: "Invia dettagli di pagamento",
    paymentMethod: "Metodo di pagamento",
    amount: "Importo",
    senderName: "Nome mittente",
    senderAccount: "Conto o numero mittente",
    transactionReference: "ID transazione o riferimento",
    additionalNotes: "Note aggiuntive",
    submitFundRequest: "Invia richiesta",
    submittingRequest: "Invio richiesta...",

    loading: "Caricamento...",
    notSelected: "Non selezionato",
    active: "Attivo",
    inactive: "Inattivo",
    edit: "Modifica",
    delete: "Elimina",
    enable: "Abilita",
    disable: "Disabilita",
    backToAdmin: "Torna all'amministrazione",
  },

  pt: {
    language: "Idioma",
    dashboard: "Painel",
    newOrder: "Novo pedido",
    myOrders: "Meus pedidos",
    services: "Serviços",
    addFunds: "Adicionar fundos",
    referrals: "Indicações",
    premium: "Premium",
    settings: "Configurações",
    logout: "Sair",

    placeNewOrder: "Fazer novo pedido",
    orderDescription:
      "Selecione uma plataforma e um serviço.",
    socialMediaPlatform: "Plataforma de mídia social",
    selectPlatform: "Selecionar plataforma",
    serviceType: "Tipo de serviço",
    selectService: "Selecionar serviço",
    serviceQuality: "Qualidade do serviço",
    processingSpeed: "Velocidade de processamento",
    standard: "Padrão",
    premiumQuality: "Qualidade premium",
    realAudience: "Público real",
    normalProcessing: "Processamento normal",
    priorityProcessing: "Processamento prioritário",
    profileLink: "Link do perfil, página ou publicação",
    quantity: "Quantidade",
    minimumQuantity: "Quantidade mínima",
    maximumQuantity: "Quantidade máxima",
    refillGuarantee: "Garantia de reposição",
    pricePer1000: "Preço por 1000",
    estimatedCharge: "Custo estimado",
    selectedService: "Serviço selecionado",
    submitOrder: "Enviar pedido",
    submittingOrder: "Enviando pedido...",

    addFundsTitle: "Adicionar fundos",
    addFundsDescription:
      "Conclua o pagamento e envie os detalhes.",
    currentWalletBalance: "Saldo atual",
    submitPaymentDetails: "Enviar detalhes de pagamento",
    paymentMethod: "Método de pagamento",
    amount: "Valor",
    senderName: "Nome do remetente",
    senderAccount: "Conta ou número do remetente",
    transactionReference: "ID da transação ou referência",
    additionalNotes: "Notas adicionais",
    submitFundRequest: "Enviar solicitação",
    submittingRequest: "Enviando solicitação...",

    loading: "Carregando...",
    notSelected: "Não selecionado",
    active: "Ativo",
    inactive: "Inativo",
    edit: "Editar",
    delete: "Excluir",
    enable: "Ativar",
    disable: "Desativar",
    backToAdmin: "Voltar ao administrador",
  },

  ru: {
    language: "Язык",
    dashboard: "Панель",
    newOrder: "Новый заказ",
    myOrders: "Мои заказы",
    services: "Услуги",
    addFunds: "Пополнить баланс",
    referrals: "Рефералы",
    premium: "Премиум",
    settings: "Настройки",
    logout: "Выйти",

    placeNewOrder: "Создать новый заказ",
    orderDescription:
      "Выберите платформу и услугу.",
    socialMediaPlatform: "Социальная платформа",
    selectPlatform: "Выберите платформу",
    serviceType: "Тип услуги",
    selectService: "Выберите услугу",
    serviceQuality: "Качество услуги",
    processingSpeed: "Скорость обработки",
    standard: "Стандарт",
    premiumQuality: "Премиум качество",
    realAudience: "Реальная аудитория",
    normalProcessing: "Обычная обработка",
    priorityProcessing: "Приоритетная обработка",
    profileLink: "Ссылка на профиль, страницу или публикацию",
    quantity: "Количество",
    minimumQuantity: "Минимальное количество",
    maximumQuantity: "Максимальное количество",
    refillGuarantee: "Гарантия пополнения",
    pricePer1000: "Цена за 1000",
    estimatedCharge: "Расчетная стоимость",
    selectedService: "Выбранная услуга",
    submitOrder: "Отправить заказ",
    submittingOrder: "Отправка заказа...",

    addFundsTitle: "Пополнить баланс",
    addFundsDescription:
      "Завершите оплату и отправьте данные.",
    currentWalletBalance: "Текущий баланс",
    submitPaymentDetails: "Отправить данные платежа",
    paymentMethod: "Способ оплаты",
    amount: "Сумма",
    senderName: "Имя отправителя",
    senderAccount: "Счет или номер отправителя",
    transactionReference: "ID транзакции или ссылка",
    additionalNotes: "Дополнительные заметки",
    submitFundRequest: "Отправить запрос",
    submittingRequest: "Отправка запроса...",

    loading: "Загрузка...",
    notSelected: "Не выбрано",
    active: "Активно",
    inactive: "Неактивно",
    edit: "Изменить",
    delete: "Удалить",
    enable: "Включить",
    disable: "Отключить",
    backToAdmin: "Назад в админ-панель",
  },

  zh: {
    language: "语言",
    dashboard: "控制面板",
    newOrder: "新订单",
    myOrders: "我的订单",
    services: "服务",
    addFunds: "添加资金",
    referrals: "推荐",
    premium: "高级",
    settings: "设置",
    logout: "退出",

    placeNewOrder: "创建新订单",
    orderDescription: "选择平台和服务并提交订单。",
    socialMediaPlatform: "社交媒体平台",
    selectPlatform: "选择平台",
    serviceType: "服务类型",
    selectService: "选择服务",
    serviceQuality: "服务质量",
    processingSpeed: "处理速度",
    standard: "标准",
    premiumQuality: "高级质量",
    realAudience: "真实受众",
    normalProcessing: "普通处理",
    priorityProcessing: "优先处理",
    profileLink: "个人资料、页面或帖子链接",
    quantity: "数量",
    minimumQuantity: "最小数量",
    maximumQuantity: "最大数量",
    refillGuarantee: "补充保证",
    pricePer1000: "每1000价格",
    estimatedCharge: "预计费用",
    selectedService: "已选服务",
    submitOrder: "提交订单",
    submittingOrder: "正在提交订单...",

    addFundsTitle: "添加资金",
    addFundsDescription: "完成付款并提交详细信息。",
    currentWalletBalance: "当前钱包余额",
    submitPaymentDetails: "提交付款信息",
    paymentMethod: "付款方式",
    amount: "金额",
    senderName: "付款人姓名",
    senderAccount: "付款人账户或号码",
    transactionReference: "交易ID或参考号",
    additionalNotes: "附加说明",
    submitFundRequest: "提交资金请求",
    submittingRequest: "正在提交请求...",

    loading: "加载中...",
    notSelected: "未选择",
    active: "启用",
    inactive: "停用",
    edit: "编辑",
    delete: "删除",
    enable: "启用",
    disable: "停用",
    backToAdmin: "返回管理面板",
  },

  ja: {
    language: "言語",
    dashboard: "ダッシュボード",
    newOrder: "新規注文",
    myOrders: "注文履歴",
    services: "サービス",
    addFunds: "資金を追加",
    referrals: "紹介",
    premium: "プレミアム",
    settings: "設定",
    logout: "ログアウト",

    placeNewOrder: "新しい注文を作成",
    orderDescription:
      "プラットフォームとサービスを選択してください。",
    socialMediaPlatform: "ソーシャルメディアプラットフォーム",
    selectPlatform: "プラットフォームを選択",
    serviceType: "サービスの種類",
    selectService: "サービスを選択",
    serviceQuality: "サービス品質",
    processingSpeed: "処理速度",
    standard: "標準",
    premiumQuality: "プレミアム品質",
    realAudience: "実際のオーディエンス",
    normalProcessing: "通常処理",
    priorityProcessing: "優先処理",
    profileLink: "プロフィール、ページ、投稿リンク",
    quantity: "数量",
    minimumQuantity: "最小数量",
    maximumQuantity: "最大数量",
    refillGuarantee: "補充保証",
    pricePer1000: "1000件あたりの価格",
    estimatedCharge: "見積料金",
    selectedService: "選択したサービス",
    submitOrder: "注文を送信",
    submittingOrder: "注文を送信中...",

    addFundsTitle: "資金を追加",
    addFundsDescription:
      "支払いを完了し、確認情報を送信してください。",
    currentWalletBalance: "現在のウォレット残高",
    submitPaymentDetails: "支払い情報を送信",
    paymentMethod: "支払い方法",
    amount: "金額",
    senderName: "送金者名",
    senderAccount: "送金者アカウントまたは番号",
    transactionReference: "取引IDまたは参照番号",
    additionalNotes: "追加メモ",
    submitFundRequest: "資金リクエストを送信",
    submittingRequest: "リクエスト送信中...",

    loading: "読み込み中...",
    notSelected: "未選択",
    active: "有効",
    inactive: "無効",
    edit: "編集",
    delete: "削除",
    enable: "有効化",
    disable: "無効化",
    backToAdmin: "管理画面に戻る",
  },
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] =
    useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      localStorage.getItem("sudaisDigitalLanguage");

    const isValidLanguage = languageOptions.some(
      (option) => option.code === savedLanguage
    );

    if (isValidLanguage) {
      setLanguageState(savedLanguage as Language);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;

    document.documentElement.dir =
      language === "ar" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(newLanguage: Language) {
    setLanguageState(newLanguage);

    localStorage.setItem(
      "sudaisDigitalLanguage",
      newLanguage
    );
  }

  function t(key: string) {
    return (
      translations[language]?.[key] ??
      translations.en[key] ??
      key
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      {children}

      <div className="fixed right-4 top-20 z-[100] md:top-20">
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <select
            value={language}
            onChange={(event) =>
              setLanguage(
                event.target.value as Language
              )
            }
            className="max-w-48 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none"
            aria-label="Select website language"
          >
            {languageOptions.map((option) => (
              <option
                key={option.code}
                value={option.code}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}