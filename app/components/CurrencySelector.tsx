"use client";

import { useMemo, useState } from "react";

import { useCurrency } from "./CurrencyProvider";
import {
  CurrencyCode,
  currencies,
  currencyCodes,
} from "../lib/currency";

export default function CurrencySelector() {
  const {
    currency,
    setCurrency,
    ratesLoading,
    ratesUpdatedAt,
    refreshRates,
  } = useCurrency();

  const [search, setSearch] = useState("");

  const filteredCurrencies = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return currencyCodes;

    return currencyCodes.filter((code) => {
      const details = currencies[code];
      return (
        code.toLowerCase().includes(value) ||
        details.name.toLowerCase().includes(value)
      );
    });
  }, [search]);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            Display Currency
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Backend amounts USD mein safe rahenge.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshRates()}
          disabled={ratesLoading}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {ratesLoading ? "Updating..." : "Refresh rates"}
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search currency..."
        className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />

      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none focus:border-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        {filteredCurrencies.map((code) => (
          <option key={code} value={code}>
            {currencies[code].flag} {code} — {currencies[code].name}
          </option>
        ))}
      </select>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Selected: {currencies[currency].flag} {currency} — {currencies[currency].name}
        {ratesUpdatedAt
          ? ` · Rates updated ${new Date(ratesUpdatedAt).toLocaleString()}`
          : " · Fallback rates active"}
      </p>
    </div>
  );
}