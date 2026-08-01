"use client";

import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({
  compact = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      aria-label={isDark ? "Light mode on karein" : "Dark mode on karein"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span aria-hidden="true" className="text-lg">
        {isDark ? "☀️" : "🌙"}
      </span>

      {!compact && (
        <span className="text-sm">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}