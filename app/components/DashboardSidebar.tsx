"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

type DashboardSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const menuItems = [
  { key: "dashboard", href: "/dashboard", icon: "🏠" },
  { key: "newOrder", href: "/new-order", icon: "🛒" },
  { key: "myOrders", href: "/my-orders", icon: "📦" },
  { key: "services", href: "/services", icon: "⭐" },
  { key: "addFunds", href: "/add-funds", icon: "💳" },
  { key: "referrals", href: "/referrals", icon: "👥" },
  { key: "premium", href: "/premium", icon: "💎" },
  { key: "settings", href: "/settings", icon: "⚙️" },
];

export default function DashboardSidebar({
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, onMobileClose]);

  const closeMobileMenu = () => onMobileClose?.();

  const sidebarContent = (
    <aside className="flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-blue-900 px-4 py-6 text-white shadow-2xl dark:bg-slate-950">
      <div className="mb-8 flex items-start justify-between gap-4 px-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold">Sudais Digital</h2>
          <p className="mt-1 text-sm text-blue-200">User Dashboard</p>
        </div>

        <button
          type="button"
          onClick={closeMobileMenu}
          aria-label="Close menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-700 text-lg transition hover:bg-blue-800 lg:hidden"
        >
          ✕
        </button>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                active
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-blue-800"
              }`}
            >
              <span aria-hidden="true" className="shrink-0">{item.icon}</span>
              <span className="truncate">{t(item.key)}</span>
            </Link>
          );
        })}

        <div className="my-4 border-t border-blue-700" />

        <a
          href="https://wa.me/923704611234?text=Assalamualaikum%2C%20mujhe%20Sudais%20Digital%20ke%20bare%20mein%20madad%20chahiye."
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-blue-100 transition hover:bg-blue-800"
        >
          <span aria-hidden="true">💬</span>
          <span>WhatsApp</span>
        </a>

        <a
          href="https://mail.google.com/mail/?view=cm&fs=1&to=hamzarandhwa0786@gmail.com&su=Sudais%20Digital%20Support"
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-blue-100 transition hover:bg-blue-800"
        >
          <span aria-hidden="true">✉️</span>
          <span>Email</span>
        </a>
      </nav>
    </aside>
  );

  return (
    <>
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        {sidebarContent}
      </div>

      <div
        className={`fixed inset-0 z-[100] lg:hidden ${
          mobileOpen
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={closeMobileMenu}
          className={`absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`relative h-full transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}