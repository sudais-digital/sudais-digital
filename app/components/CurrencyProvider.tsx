"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CurrencyCode,
  currencies,
  currencyCodes,
  detectCurrency,
  formatCurrency,
  isCurrencyCode,
} from "../lib/currency";

type ExchangeRates = Partial<Record<CurrencyCode, number>>;

type CurrencyContextType = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  exchangeRates: ExchangeRates;
  convertFromUSD: (amountUSD: number) => number;
  convertToUSD: (amount: number, sourceCurrency?: CurrencyCode) => number;
  formatFromUSD: (amountUSD: number) => string;
  loadingCurrency: boolean;
  ratesLoading: boolean;
  ratesUpdatedAt: string | null;
  refreshRates: () => Promise<void>;
};

const STORAGE_CURRENCY = "sudaisDigitalCurrency";
const STORAGE_RATES = "sudaisDigitalExchangeRates";
const STORAGE_RATES_TIME = "sudaisDigitalExchangeRatesUpdatedAt";
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

const fallbackExchangeRates: ExchangeRates = {
  USD: 1,
  PKR: 280,
  INR: 86,
  EUR: 0.92,
  GBP: 0.77,
  AED: 3.67,
  SAR: 3.75,
  BDT: 122,
  TRY: 40,
  CAD: 1.37,
  AUD: 1.53,
  NZD: 1.67,
  JPY: 150,
  CNY: 7.2,
  HKD: 7.8,
  SGD: 1.35,
  MYR: 4.7,
  IDR: 16000,
  THB: 35,
  PHP: 57,
  KRW: 1350,
  VND: 25000,
  LKR: 300,
  NPR: 138,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
  EGP: 50,
  ZAR: 18,
  NGN: 1500,
  KES: 130,
  BRL: 5.5,
  MXN: 18,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  PLN: 4,
  CZK: 23,
  HUF: 365,
  RON: 4.6,
  UAH: 41,
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

function sanitizeRates(input: unknown): ExchangeRates {
  if (!input || typeof input !== "object") return {};

  const source = input as Record<string, unknown>;
  const clean: ExchangeRates = { USD: 1 };

  currencyCodes.forEach((code) => {
    const value = Number(source[code]);
    if (Number.isFinite(value) && value > 0) {
      clean[code] = value;
    }
  });

  return clean;
}

async function fetchLatestUSDRates(): Promise<ExchangeRates> {
  const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Currency API error: ${response.status}`);
  }

  const rows = (await response.json()) as Array<{
    quote?: unknown;
    rate?: unknown;
  }>;

  const rates: ExchangeRates = { USD: 1 };

  rows.forEach((row) => {
    const code = String(row.quote ?? "").toUpperCase();
    const rate = Number(row.rate);

    if (isCurrencyCode(code) && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  });

  return rates;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    ...fallbackExchangeRates,
  });
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);

  const refreshRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const liveRates = await fetchLatestUSDRates();
      const mergedRates = { ...fallbackExchangeRates, ...liveRates, USD: 1 };
      const updatedAt = new Date().toISOString();

      setExchangeRates(mergedRates);
      setRatesUpdatedAt(updatedAt);

      localStorage.setItem(STORAGE_RATES, JSON.stringify(mergedRates));
      localStorage.setItem(STORAGE_RATES_TIME, updatedAt);
    } catch (error) {
      console.error("Exchange rates load error:", error);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedCurrency = localStorage.getItem(STORAGE_CURRENCY);
    const selectedCurrency = isCurrencyCode(savedCurrency)
      ? savedCurrency
      : detectCurrency();

    setCurrencyState(selectedCurrency);
    localStorage.setItem(STORAGE_CURRENCY, selectedCurrency);

    const cachedRatesRaw = localStorage.getItem(STORAGE_RATES);
    const cachedTime = localStorage.getItem(STORAGE_RATES_TIME);
    const cachedDate = cachedTime ? new Date(cachedTime) : null;
    const cacheIsFresh =
      cachedDate &&
      Number.isFinite(cachedDate.getTime()) &&
      Date.now() - cachedDate.getTime() < CACHE_DURATION_MS;

    if (cachedRatesRaw) {
      try {
        const cachedRates = sanitizeRates(JSON.parse(cachedRatesRaw));
        setExchangeRates({ ...fallbackExchangeRates, ...cachedRates, USD: 1 });
        setRatesUpdatedAt(cachedTime);
      } catch {
        localStorage.removeItem(STORAGE_RATES);
      }
    }

    setLoadingCurrency(false);

    if (!cacheIsFresh) {
      void refreshRates();
    }
  }, [refreshRates]);

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    if (!Object.prototype.hasOwnProperty.call(currencies, newCurrency)) return;

    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_CURRENCY, newCurrency);
  }, []);

  const convertFromUSD = useCallback(
    (amountUSD: number): number => {
      const safeAmount = Number.isFinite(amountUSD) ? amountUSD : 0;
      const rate = exchangeRates[currency] ?? fallbackExchangeRates[currency] ?? 1;
      return safeAmount * rate;
    },
    [currency, exchangeRates]
  );

  const convertToUSD = useCallback(
    (amount: number, sourceCurrency: CurrencyCode = currency): number => {
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      const rate =
        exchangeRates[sourceCurrency] ?? fallbackExchangeRates[sourceCurrency] ?? 1;
      return rate > 0 ? safeAmount / rate : safeAmount;
    },
    [currency, exchangeRates]
  );

  const formatFromUSD = useCallback(
    (amountUSD: number): string => {
      return formatCurrency(convertFromUSD(amountUSD), currency);
    },
    [convertFromUSD, currency]
  );

  const contextValue = useMemo(
    () => ({
      currency,
      setCurrency,
      exchangeRates,
      convertFromUSD,
      convertToUSD,
      formatFromUSD,
      loadingCurrency,
      ratesLoading,
      ratesUpdatedAt,
      refreshRates,
    }),
    [
      currency,
      setCurrency,
      exchangeRates,
      convertFromUSD,
      convertToUSD,
      formatFromUSD,
      loadingCurrency,
      ratesLoading,
      ratesUpdatedAt,
      refreshRates,
    ]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }

  return context;
}