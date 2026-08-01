export const currencyCodes = [
  "USD", "PKR", "INR", "EUR", "GBP", "AED", "SAR", "BDT", "TRY", "CAD",
  "AUD", "NZD", "JPY", "CNY", "HKD", "SGD", "MYR", "IDR", "THB", "PHP",
  "KRW", "VND", "LKR", "NPR", "AFN", "IRR", "IQD", "QAR", "KWD", "BHD",
  "OMR", "JOD", "ILS", "EGP", "MAD", "DZD", "TND", "ZAR", "NGN", "KES",
  "GHS", "UGX", "TZS", "ETB", "RWF", "XOF", "XAF", "BRL", "ARS", "CLP",
  "COP", "PEN", "UYU", "MXN", "CRC", "DOP", "JMD", "TTD", "BBD", "BSD",
  "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "RSD",
  "HRK", "ISK", "UAH", "RUB", "GEL", "AMD", "AZN", "KZT", "UZS", "MNT"
] as const;

export type CurrencyCode = (typeof currencyCodes)[number];

export type CurrencyDetails = {
  name: string;
  locale: string;
  flag: string;
};

export const currencies: Record<CurrencyCode, CurrencyDetails> = {
  USD: { name: "US Dollar", locale: "en-US", flag: "🇺🇸" },
  PKR: { name: "Pakistani Rupee", locale: "en-PK", flag: "🇵🇰" },
  INR: { name: "Indian Rupee", locale: "en-IN", flag: "🇮🇳" },
  EUR: { name: "Euro", locale: "de-DE", flag: "🇪🇺" },
  GBP: { name: "British Pound", locale: "en-GB", flag: "🇬🇧" },
  AED: { name: "UAE Dirham", locale: "en-AE", flag: "🇦🇪" },
  SAR: { name: "Saudi Riyal", locale: "en-SA", flag: "🇸🇦" },
  BDT: { name: "Bangladeshi Taka", locale: "en-BD", flag: "🇧🇩" },
  TRY: { name: "Turkish Lira", locale: "tr-TR", flag: "🇹🇷" },
  CAD: { name: "Canadian Dollar", locale: "en-CA", flag: "🇨🇦" },
  AUD: { name: "Australian Dollar", locale: "en-AU", flag: "🇦🇺" },
  NZD: { name: "New Zealand Dollar", locale: "en-NZ", flag: "🇳🇿" },
  JPY: { name: "Japanese Yen", locale: "ja-JP", flag: "🇯🇵" },
  CNY: { name: "Chinese Yuan", locale: "zh-CN", flag: "🇨🇳" },
  HKD: { name: "Hong Kong Dollar", locale: "zh-HK", flag: "🇭🇰" },
  SGD: { name: "Singapore Dollar", locale: "en-SG", flag: "🇸🇬" },
  MYR: { name: "Malaysian Ringgit", locale: "ms-MY", flag: "🇲🇾" },
  IDR: { name: "Indonesian Rupiah", locale: "id-ID", flag: "🇮🇩" },
  THB: { name: "Thai Baht", locale: "th-TH", flag: "🇹🇭" },
  PHP: { name: "Philippine Peso", locale: "en-PH", flag: "🇵🇭" },
  KRW: { name: "South Korean Won", locale: "ko-KR", flag: "🇰🇷" },
  VND: { name: "Vietnamese Dong", locale: "vi-VN", flag: "🇻🇳" },
  LKR: { name: "Sri Lankan Rupee", locale: "en-LK", flag: "🇱🇰" },
  NPR: { name: "Nepalese Rupee", locale: "en-NP", flag: "🇳🇵" },
  AFN: { name: "Afghan Afghani", locale: "fa-AF", flag: "🇦🇫" },
  IRR: { name: "Iranian Rial", locale: "fa-IR", flag: "🇮🇷" },
  IQD: { name: "Iraqi Dinar", locale: "ar-IQ", flag: "🇮🇶" },
  QAR: { name: "Qatari Riyal", locale: "ar-QA", flag: "🇶🇦" },
  KWD: { name: "Kuwaiti Dinar", locale: "ar-KW", flag: "🇰🇼" },
  BHD: { name: "Bahraini Dinar", locale: "ar-BH", flag: "🇧🇭" },
  OMR: { name: "Omani Rial", locale: "ar-OM", flag: "🇴🇲" },
  JOD: { name: "Jordanian Dinar", locale: "ar-JO", flag: "🇯🇴" },
  ILS: { name: "Israeli New Shekel", locale: "he-IL", flag: "🇮🇱" },
  EGP: { name: "Egyptian Pound", locale: "ar-EG", flag: "🇪🇬" },
  MAD: { name: "Moroccan Dirham", locale: "ar-MA", flag: "🇲🇦" },
  DZD: { name: "Algerian Dinar", locale: "ar-DZ", flag: "🇩🇿" },
  TND: { name: "Tunisian Dinar", locale: "ar-TN", flag: "🇹🇳" },
  ZAR: { name: "South African Rand", locale: "en-ZA", flag: "🇿🇦" },
  NGN: { name: "Nigerian Naira", locale: "en-NG", flag: "🇳🇬" },
  KES: { name: "Kenyan Shilling", locale: "en-KE", flag: "🇰🇪" },
  GHS: { name: "Ghanaian Cedi", locale: "en-GH", flag: "🇬🇭" },
  UGX: { name: "Ugandan Shilling", locale: "en-UG", flag: "🇺🇬" },
  TZS: { name: "Tanzanian Shilling", locale: "en-TZ", flag: "🇹🇿" },
  ETB: { name: "Ethiopian Birr", locale: "am-ET", flag: "🇪🇹" },
  RWF: { name: "Rwandan Franc", locale: "en-RW", flag: "🇷🇼" },
  XOF: { name: "West African CFA Franc", locale: "fr-SN", flag: "🌍" },
  XAF: { name: "Central African CFA Franc", locale: "fr-CM", flag: "🌍" },
  BRL: { name: "Brazilian Real", locale: "pt-BR", flag: "🇧🇷" },
  ARS: { name: "Argentine Peso", locale: "es-AR", flag: "🇦🇷" },
  CLP: { name: "Chilean Peso", locale: "es-CL", flag: "🇨🇱" },
  COP: { name: "Colombian Peso", locale: "es-CO", flag: "🇨🇴" },
  PEN: { name: "Peruvian Sol", locale: "es-PE", flag: "🇵🇪" },
  UYU: { name: "Uruguayan Peso", locale: "es-UY", flag: "🇺🇾" },
  MXN: { name: "Mexican Peso", locale: "es-MX", flag: "🇲🇽" },
  CRC: { name: "Costa Rican Colón", locale: "es-CR", flag: "🇨🇷" },
  DOP: { name: "Dominican Peso", locale: "es-DO", flag: "🇩🇴" },
  JMD: { name: "Jamaican Dollar", locale: "en-JM", flag: "🇯🇲" },
  TTD: { name: "Trinidad and Tobago Dollar", locale: "en-TT", flag: "🇹🇹" },
  BBD: { name: "Barbadian Dollar", locale: "en-BB", flag: "🇧🇧" },
  BSD: { name: "Bahamian Dollar", locale: "en-BS", flag: "🇧🇸" },
  CHF: { name: "Swiss Franc", locale: "de-CH", flag: "🇨🇭" },
  SEK: { name: "Swedish Krona", locale: "sv-SE", flag: "🇸🇪" },
  NOK: { name: "Norwegian Krone", locale: "nb-NO", flag: "🇳🇴" },
  DKK: { name: "Danish Krone", locale: "da-DK", flag: "🇩🇰" },
  PLN: { name: "Polish Złoty", locale: "pl-PL", flag: "🇵🇱" },
  CZK: { name: "Czech Koruna", locale: "cs-CZ", flag: "🇨🇿" },
  HUF: { name: "Hungarian Forint", locale: "hu-HU", flag: "🇭🇺" },
  RON: { name: "Romanian Leu", locale: "ro-RO", flag: "🇷🇴" },
  BGN: { name: "Bulgarian Lev", locale: "bg-BG", flag: "🇧🇬" },
  RSD: { name: "Serbian Dinar", locale: "sr-RS", flag: "🇷🇸" },
  HRK: { name: "Croatian Kuna", locale: "hr-HR", flag: "🇭🇷" },
  ISK: { name: "Icelandic Króna", locale: "is-IS", flag: "🇮🇸" },
  UAH: { name: "Ukrainian Hryvnia", locale: "uk-UA", flag: "🇺🇦" },
  RUB: { name: "Russian Ruble", locale: "ru-RU", flag: "🇷🇺" },
  GEL: { name: "Georgian Lari", locale: "ka-GE", flag: "🇬🇪" },
  AMD: { name: "Armenian Dram", locale: "hy-AM", flag: "🇦🇲" },
  AZN: { name: "Azerbaijani Manat", locale: "az-AZ", flag: "🇦🇿" },
  KZT: { name: "Kazakhstani Tenge", locale: "kk-KZ", flag: "🇰🇿" },
  UZS: { name: "Uzbekistani Som", locale: "uz-UZ", flag: "🇺🇿" },
  MNT: { name: "Mongolian Tögrög", locale: "mn-MN", flag: "🇲🇳" }
};

const regionCurrencyMap: Record<string, CurrencyCode> = {
  PK: "PKR", IN: "INR", US: "USD", GB: "GBP", AE: "AED", SA: "SAR", BD: "BDT",
  TR: "TRY", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY", CN: "CNY", HK: "HKD",
  SG: "SGD", MY: "MYR", ID: "IDR", TH: "THB", PH: "PHP", KR: "KRW", VN: "VND",
  LK: "LKR", NP: "NPR", AF: "AFN", IR: "IRR", IQ: "IQD", QA: "QAR", KW: "KWD",
  BH: "BHD", OM: "OMR", JO: "JOD", IL: "ILS", EG: "EGP", MA: "MAD", DZ: "DZD",
  TN: "TND", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS", UG: "UGX", TZ: "TZS",
  ET: "ETB", RW: "RWF", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  UY: "UYU", MX: "MXN", CR: "CRC", DO: "DOP", JM: "JMD", TT: "TTD", BB: "BBD",
  BS: "BSD", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON", BG: "BGN", RS: "RSD", HR: "EUR", IS: "ISK", UA: "UAH",
  RU: "RUB", GE: "GEL", AM: "AMD", AZ: "AZN", KZ: "KZT", UZ: "UZS", MN: "MNT",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", CY: "EUR", EE: "EUR", LV: "EUR",
  LT: "EUR", LU: "EUR", MT: "EUR", SI: "EUR", SK: "EUR"
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in currencies;
}

export function detectCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "USD";

  const locale = navigator.language || "en-US";
  const region = locale.split("-")[1]?.toUpperCase();

  if (region && regionCurrencyMap[region]) {
    return regionCurrencyMap[region];
  }

  return "USD";
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const details = currencies[currency];

  try {
    return new Intl.NumberFormat(details.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 4
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${currency} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
  }
}