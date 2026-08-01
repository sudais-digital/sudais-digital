"use client";

import DashboardSidebar from "../components/DashboardSidebar";
import { useCurrency } from "../components/CurrencyProvider";
import Services from "../components/Services";

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar />

      <main className="min-w-0 flex-1">
        <Services />
      </main>
    </div>
  );
}