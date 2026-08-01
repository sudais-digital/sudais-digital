"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

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

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="min-h-screen w-64 bg-blue-900 px-4 py-6 text-white">
      <div className="mb-10 px-3">
        <h2 className="text-2xl font-bold">Sudais Digital</h2>
        <p className="mt-1 text-sm text-blue-200">User Dashboard</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                active
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-blue-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{t(item.key)}</span>
            </Link>
          );
        })}

        <div className="my-3 border-t border-blue-700" />

        {/* WhatsApp */}
        <a
          href="https://wa.me/923704611234?text=Assalamualaikum%2C%20mujhe%20Sudais%20Digital%20ke%20bare%20mein%20madad%20chahiye."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-blue-100 transition hover:bg-blue-800"
        >
          <span>💬</span>
          <span>WhatsApp</span>
        </a>

        {/* Email */}
        <a
          href="https://mail.google.com/mail/?view=cm&fs=1&to=hamzarandhwa0786@gmail.com&su=Sudais%20Digital%20Support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-blue-100 transition hover:bg-blue-800"
        >
          <span>✉️</span>
          <span>Email</span>
        </a>
      </nav>
    </aside>
  );
}