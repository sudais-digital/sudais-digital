"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { auth, db } from "../../lib/firebase";

type Provider = {
  id: string;
  name: string;
  apiUrl: string;
  apiKeyEnvName: string;
  active: boolean;
  notes: string;
  lastKnownBalance?: number | null;
  lastConnectionStatus?: "untested" | "connected" | "failed";
  lastCheckedAt?: unknown;
  totalServices?: number;
};

const providerPresets = [
  {
    label: "Custom Provider",
    name: "",
    apiUrl: "",
  },
  {
    label: "Standard SMM API v2",
    name: "My SMM Provider",
    apiUrl: "https://example.com/api/v2",
  },
];

export default function AdminProvidersPage() {
  const router = useRouter();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState("");
  const [importingProviderId, setImportingProviderId] = useState("");
  const [message, setMessage] = useState("");

  const [editingProviderId, setEditingProviderId] = useState("");
  const [preset, setPreset] = useState("Custom Provider");
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKeyEnvName, setApiKeyEnvName] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    let unsubscribeProviders: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const adminDocument = await getDoc(doc(db, "users", currentUser.uid));

        if (
          !adminDocument.exists() ||
          adminDocument.data().role !== "admin"
        ) {
          router.replace("/dashboard");
          return;
        }

        setCheckingAccess(false);

        const providersQuery = query(
          collection(db, "providers"),
          orderBy("createdAt", "desc")
        );

        unsubscribeProviders = onSnapshot(
          providersQuery,
          (snapshot) => {
            const list: Provider[] = snapshot.docs.map((providerDocument) => {
              const data = providerDocument.data();

              return {
                id: providerDocument.id,
                name: String(data.name ?? ""),
                apiUrl: String(data.apiUrl ?? ""),
                apiKeyEnvName: String(data.apiKeyEnvName ?? ""),
                active: data.active !== false,
                notes: String(data.notes ?? ""),
                lastKnownBalance:
                  data.lastKnownBalance === null ||
                  data.lastKnownBalance === undefined
                    ? null
                    : Number(data.lastKnownBalance),
                lastConnectionStatus: String(
                  data.lastConnectionStatus ?? "untested"
                ) as Provider["lastConnectionStatus"],
                lastCheckedAt: data.lastCheckedAt,
                totalServices: Number(data.totalServices ?? 0),
              };
            });

            setProviders(list);
            setLoadingProviders(false);
          },
          (error) => {
            console.error("Providers load error:", error);
            setLoadingProviders(false);
            setMessage("Providers load nahi ho sake.");
          }
        );
      } catch (error) {
        console.error("Admin verification error:", error);
        router.replace("/dashboard");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProviders?.();
    };
  }, [router]);

  const activeProvidersCount = useMemo(
    () => providers.filter((provider) => provider.active).length,
    [providers]
  );

  function resetForm() {
    setEditingProviderId("");
    setPreset("Custom Provider");
    setName("");
    setApiUrl("");
    setApiKeyEnvName("");
    setNotes("");
    setActive(true);
  }

  function handlePresetChange(selectedPreset: string) {
    setPreset(selectedPreset);

    const selected = providerPresets.find(
      (providerPreset) => providerPreset.label === selectedPreset
    );

    if (!selected || selected.label === "Custom Provider") {
      return;
    }

    setName(selected.name);
    setApiUrl(selected.apiUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const cleanName = name.trim();
    const cleanApiUrl = apiUrl.trim().replace(/\/+$/, "");
    const cleanEnvName = apiKeyEnvName.trim().toUpperCase();

    if (!cleanName) {
      setMessage("Provider name zaroor enter karein.");
      return;
    }

    try {
      const parsedUrl = new URL(cleanApiUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setMessage("Valid API URL enter karein, jaise https://panel.com/api/v2");
      return;
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(cleanEnvName)) {
      setMessage(
        "API key environment name sahi likhein, jaise PROVIDER_1_API_KEY"
      );
      return;
    }

    try {
      setSaving(true);

      const providerData = {
        name: cleanName,
        apiUrl: cleanApiUrl,
        apiKeyEnvName: cleanEnvName,
        notes: notes.trim(),
        active,
        updatedAt: serverTimestamp(),
      };

      if (editingProviderId) {
        await updateDoc(doc(db, "providers", editingProviderId), providerData);
        setMessage("Provider successfully update ho gaya.");
      } else {
        await addDoc(collection(db, "providers"), {
          ...providerData,
          lastConnectionStatus: "untested",
          lastKnownBalance: null,
          totalServices: 0,
          defaultProfitPercent: 30,
          currency: "USD",
          createdAt: serverTimestamp(),
        });

        setMessage("Provider successfully add ho gaya.");
      }

      resetForm();
    } catch (error) {
      console.error("Save provider error:", error);
      setMessage(
        editingProviderId
          ? "Provider update nahi ho saka."
          : "Provider add nahi ho saka."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditProvider(provider: Provider) {
    setEditingProviderId(provider.id);
    setPreset("Custom Provider");
    setName(provider.name);
    setApiUrl(provider.apiUrl);
    setApiKeyEnvName(provider.apiKeyEnvName);
    setNotes(provider.notes);
    setActive(provider.active);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleProvider(provider: Provider) {
    try {
      await updateDoc(doc(db, "providers", provider.id), {
        active: !provider.active,
        updatedAt: serverTimestamp(),
      });

      setMessage(
        provider.active
          ? "Provider disable ho gaya."
          : "Provider active ho gaya."
      );
    } catch (error) {
      console.error("Provider status error:", error);
      setMessage("Provider status change nahi ho saka.");
    }
  }

  async function getAdminToken(): Promise<string> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Pehle admin account se login karein.");
    }

    return currentUser.getIdToken(true);
  }

  async function handleTestProvider(provider: Provider) {
    try {
      setTestingProviderId(provider.id);
      setMessage("");

      const idToken = await getAdminToken();

      const response = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerId: provider.id }),
      });

      const responseText = await response.text();
      let result: { message?: string; balance?: number } = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Server ne valid JSON response nahi diya. Terminal error check karein."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Provider connection test fail ho gaya.");
      }

      setMessage(
        `${provider.name} successfully connected hai. Balance: $${Number(
          result.balance ?? 0
        ).toFixed(4)}`
      );
    } catch (error) {
      console.error("Provider test error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Provider connection test fail ho gaya."
      );
    } finally {
      setTestingProviderId("");
    }
  }

  async function handleImportServices(provider: Provider) {
    const confirmed = window.confirm(
      `${provider.name} se services import/update karni hain? Existing imported services bhi update ho sakti hain.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setImportingProviderId(provider.id);
      setMessage("");

      const idToken = await getAdminToken();

      const response = await fetch("/api/admin/providers/import-services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerId: provider.id }),
      });

      const responseText = await response.text();
      let result: { message?: string; totalServices?: number } = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Server ne valid JSON response nahi diya. Terminal error check karein."
        );
      }

      if (!response.ok) {
        throw new Error(result.message || "Services import fail ho gayi.");
      }

      setMessage(
        result.message ||
          `${Number(result.totalServices ?? 0)} services import ho gayi hain.`
      );
    } catch (error) {
      console.error("Services import error:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Services import nahi ho sakin."
      );
    } finally {
      setImportingProviderId("");
    }
  }

  async function handleDeleteProvider(provider: Provider) {
    const confirmed = window.confirm(
      `Kya aap waqai ${provider.name} ko delete karna chahte hain?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "providers", provider.id));

      if (editingProviderId === provider.id) {
        resetForm();
      }

      setMessage("Provider delete ho gaya.");
    } catch (error) {
      console.error("Delete provider error:", error);
      setMessage("Provider delete nahi ho saka.");
    }
  }

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Checking admin access...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Providers
            </h1>
            <p className="mt-2 text-gray-600">
              Provider details, status aur secure API-key reference manage karein.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg bg-gray-900 px-5 py-3 text-center font-semibold text-white hover:bg-gray-800"
          >
            Back to Admin
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Providers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {providers.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Active Providers</p>
            <p className="mt-1 text-3xl font-bold text-green-700">
              {activeProvidersCount}
            </p>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Security:</strong> Real API key is form ya Firestore mein save
          na karein. Sirf environment variable ka naam save karein. Real key
          project ki <code>.env.local</code> file mein rahegi.
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {editingProviderId ? "Edit Provider" : "Add New Provider"}
            </h2>

            {editingProviderId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Provider Type
              </label>
              <select
                value={preset}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              >
                {providerPresets.map((providerPreset) => (
                  <option
                    key={providerPreset.label}
                    value={providerPreset.label}
                  >
                    {providerPreset.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Provider Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Pakistan Provider 1"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                API URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
                placeholder="https://provider.com/api/v2"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                API Key Environment Name
              </label>
              <input
                value={apiKeyEnvName}
                onChange={(event) => setApiKeyEnvName(event.target.value)}
                placeholder="PROVIDER_1_API_KEY"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-gray-900"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                .env.local mein isi naam se real API key rakhein.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium text-gray-700">
                Notes
              </label>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: Cheap Instagram services"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <input
                id="provider-active"
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-5 w-5"
              />
              <label
                htmlFor="provider-active"
                className="font-medium text-gray-700"
              >
                Provider Active
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingProviderId
              ? "Update Provider"
              : "Add Provider"}
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900">All Providers</h2>
          </div>

          {loadingProviders ? (
            <div className="p-10 text-center text-gray-600">
              Providers loading...
            </div>
          ) : providers.length === 0 ? (
            <div className="p-10 text-center text-gray-600">
              Abhi koi provider add nahi hua.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">API URL</th>
                    <th className="px-5 py-4">Key Variable</th>
                    <th className="px-5 py-4">Connection</th>
                    <th className="px-5 py-4">Balance</th>
                    <th className="px-5 py-4">Services</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {providers.map((provider) => (
                    <tr key={provider.id} className="text-sm text-gray-700">
                      <td className="px-5 py-5">
                        <p className="font-semibold text-gray-900">
                          {provider.name}
                        </p>
                        {provider.notes && (
                          <p className="mt-1 max-w-xs text-xs text-gray-500">
                            {provider.notes}
                          </p>
                        )}
                      </td>

                      <td className="max-w-xs px-5 py-5">
                        <span className="break-all">{provider.apiUrl}</span>
                      </td>

                      <td className="px-5 py-5 font-mono text-xs">
                        {provider.apiKeyEnvName}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            provider.lastConnectionStatus === "connected"
                              ? "bg-green-100 text-green-700"
                              : provider.lastConnectionStatus === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {provider.lastConnectionStatus === "connected"
                            ? "Connected"
                            : provider.lastConnectionStatus === "failed"
                            ? "Failed"
                            : "Not Tested"}
                        </span>
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {provider.lastKnownBalance === null ||
                        provider.lastKnownBalance === undefined
                          ? "—"
                          : `$${provider.lastKnownBalance.toFixed(4)}`}
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {provider.totalServices ?? 0}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            provider.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {provider.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestProvider(provider)}
                            disabled={
                              testingProviderId === provider.id ||
                              importingProviderId === provider.id
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {testingProviderId === provider.id
                              ? "Testing..."
                              : "Test Connection"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleImportServices(provider)}
                            disabled={
                              importingProviderId === provider.id ||
                              testingProviderId === provider.id
                            }
                            className="rounded-lg bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {importingProviderId === provider.id
                              ? "Importing..."
                              : "Import Services"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditProvider(provider)}
                            className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleProvider(provider)}
                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
                          >
                            {provider.active ? "Disable" : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(provider)}
                            className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}