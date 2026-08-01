"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Service = {
  id: string;
  platform: string;
  name: string;
  ratePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  refill: string;
  active: boolean;
  providerName: string;
  providerServiceId: string;
  providerRatePer1000: number;
  profitPercent: number;
};

const CUSTOM_PLATFORM = "__custom__";

const platforms = [
  "Instagram",
  "Facebook",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "Telegram",
  "WhatsApp",
  "Snapchat",
  "LinkedIn",
  "Threads",
  "Pinterest",
  "Discord",
  "Reddit",
  "Twitch",
  "Spotify",
  "Website Traffic",
];

export default function AdminServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [editingServiceId, setEditingServiceId] = useState("");

  const [platform, setPlatform] = useState("Instagram");
  const [customPlatform, setCustomPlatform] = useState("");
  const [name, setName] = useState("");
  const [ratePer1000, setRatePer1000] = useState("");
  const [minQuantity, setMinQuantity] = useState("100");
  const [maxQuantity, setMaxQuantity] = useState("10000");
  const [refill, setRefill] = useState("No Refill");
  const [providerName, setProviderName] = useState("");
  const [providerServiceId, setProviderServiceId] = useState("");
  const [providerRatePer1000, setProviderRatePer1000] = useState("");

  useEffect(() => {
    let unsubscribeServices: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        try {
          const adminDocument = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (
            !adminDocument.exists() ||
            adminDocument.data().role !== "admin"
          ) {
            router.replace("/dashboard");
            return;
          }

          setCheckingAccess(false);

          const servicesQuery = query(
            collection(db, "services"),
            orderBy("createdAt", "desc")
          );

          unsubscribeServices = onSnapshot(
            servicesQuery,
            (snapshot) => {
              const serviceList: Service[] = snapshot.docs.map(
                (serviceDocument) => {
                  const data = serviceDocument.data();

                  return {
                    id: serviceDocument.id,
                    platform: String(data.platform ?? ""),
                    name: String(data.name ?? ""),
                    ratePer1000: Number(data.ratePer1000 ?? 0),
                    minQuantity: Number(data.minQuantity ?? 0),
                    maxQuantity: Number(data.maxQuantity ?? 0),
                    refill: String(data.refill ?? "No Refill"),
                    active: data.active !== false,
                    providerName: String(data.providerName ?? ""),
                    providerServiceId: String(data.providerServiceId ?? ""),
                    providerRatePer1000: Number(
                      data.providerRatePer1000 ?? 0
                    ),
                    profitPercent: Number(data.profitPercent ?? 0),
                  };
                }
              );

              setServices(serviceList);
              setLoadingServices(false);
            },
            (error) => {
              console.error("Services load error:", error);
              setLoadingServices(false);
              setMessage("Services load nahi ho sakin.");
            }
          );
        } catch (error) {
          console.error("Admin verification error:", error);
          router.replace("/dashboard");
        }
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeServices) {
        unsubscribeServices();
      }
    };
  }, [router]);

  function resetForm() {
    setEditingServiceId("");
    setPlatform("Instagram");
    setCustomPlatform("");
    setName("");
    setRatePer1000("");
    setMinQuantity("100");
    setMaxQuantity("10000");
    setRefill("No Refill");
    setProviderName("");
    setProviderServiceId("");
    setProviderRatePer1000("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    const selectedPlatform =
      platform === CUSTOM_PLATFORM
        ? customPlatform.trim()
        : platform.trim();

    const numericRate = Number(ratePer1000);
    const numericMin = Number(minQuantity);
    const numericMax = Number(maxQuantity);
    const numericProviderRate = providerRatePer1000.trim()
      ? Number(providerRatePer1000)
      : 0;

    if (!selectedPlatform || !name.trim()) {
      setMessage("Platform aur service name zaroor enter karein.");
      return;
    }

    if (selectedPlatform.length > 40) {
      setMessage("Platform name 40 characters se chhota rakhein.");
      return;
    }

    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      setMessage("Valid price per 1000 enter karein.");
      return;
    }

    if (
      !Number.isFinite(numericProviderRate) ||
      numericProviderRate < 0
    ) {
      setMessage("Valid provider price per 1000 enter karein.");
      return;
    }

    const profitPercent =
      numericProviderRate > 0
        ? ((numericRate - numericProviderRate) /
            numericProviderRate) *
          100
        : 0;

    if (
      !Number.isFinite(numericMin) ||
      !Number.isFinite(numericMax) ||
      numericMin < 1 ||
      numericMax < numericMin
    ) {
      setMessage("Minimum aur maximum quantity sahi enter karein.");
      return;
    }

    try {
      setSaving(true);

      if (editingServiceId) {
        await updateDoc(
          doc(db, "services", editingServiceId),
          {
            platform: selectedPlatform,
            name: name.trim(),
            ratePer1000: numericRate,
            minQuantity: numericMin,
            maxQuantity: numericMax,
            refill,
            providerName: providerName.trim(),
            providerServiceId: providerServiceId.trim(),
            providerRatePer1000: numericProviderRate,
            profitPercent: Number(profitPercent.toFixed(2)),
            updatedAt: serverTimestamp(),
          }
        );

        setMessage("Service successfully update ho gayi.");
      } else {
        await addDoc(collection(db, "services"), {
          platform: selectedPlatform,
          name: name.trim(),
          ratePer1000: numericRate,
          minQuantity: numericMin,
          maxQuantity: numericMax,
          refill,
          providerName: providerName.trim(),
          providerServiceId: providerServiceId.trim(),
          providerRatePer1000: numericProviderRate,
          profitPercent: Number(profitPercent.toFixed(2)),
          active: true,
          currency: "USD",
          createdAt: serverTimestamp(),
        });

        setMessage("Service successfully add ho gayi.");
      }

      resetForm();
    } catch (error) {
      console.error("Save service error:", error);

      setMessage(
        editingServiceId
          ? "Service update nahi ho saki."
          : "Service add nahi ho saki."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditService(service: Service) {
    setEditingServiceId(service.id);

    if (platforms.includes(service.platform)) {
      setPlatform(service.platform);
      setCustomPlatform("");
    } else {
      setPlatform(CUSTOM_PLATFORM);
      setCustomPlatform(service.platform);
    }

    setName(service.name);
    setRatePer1000(String(service.ratePer1000));
    setMinQuantity(String(service.minQuantity));
    setMaxQuantity(String(service.maxQuantity));
    setRefill(service.refill);
    setProviderName(service.providerName);
    setProviderServiceId(service.providerServiceId);
    setProviderRatePer1000(
      service.providerRatePer1000 > 0
        ? String(service.providerRatePer1000)
        : ""
    );
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleToggleService(service: Service) {
    try {
      await updateDoc(doc(db, "services", service.id), {
        active: !service.active,
        updatedAt: serverTimestamp(),
      });

      setMessage(
        service.active
          ? "Service disable ho gayi."
          : "Service active ho gayi."
      );
    } catch (error) {
      console.error("Service status error:", error);
      setMessage("Service status change nahi ho saka.");
    }
  }

  async function handleDeleteService(serviceId: string) {
    const confirmed = window.confirm(
      "Kya aap waqai is service ko delete karna chahte hain?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "services", serviceId));

      if (editingServiceId === serviceId) {
        resetForm();
      }

      setMessage("Service delete ho gayi.");
    } catch (error) {
      console.error("Delete service error:", error);
      setMessage("Service delete nahi ho saki.");
    }
  }

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">
          Checking admin access...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Services
            </h1>

            <p className="mt-2 text-gray-600">
              Services add, edit aur prices control karein.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg bg-gray-900 px-5 py-3 text-center font-semibold text-white hover:bg-gray-800"
          >
            Back to Admin
          </Link>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {editingServiceId
                ? "Edit Service"
                : "Add New Service"}
            </h2>

            {editingServiceId && (
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
                Platform
              </label>

              <select
                value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value);

                  if (event.target.value !== CUSTOM_PLATFORM) {
                    setCustomPlatform("");
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              >
                {platforms.map((platformName) => (
                  <option
                    key={platformName}
                    value={platformName}
                  >
                    {platformName}
                  </option>
                ))}

                <option value={CUSTOM_PLATFORM}>
                  Other / Custom Platform
                </option>
              </select>

              {platform === CUSTOM_PLATFORM && (
                <input
                  value={customPlatform}
                  onChange={(event) =>
                    setCustomPlatform(event.target.value)
                  }
                  placeholder="Example: WhatsApp Business"
                  maxLength={40}
                  className="mt-3 w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-gray-900"
                  required
                />
              )}
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Service Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Example: Followers"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Price per 1000 (USD)
              </label>

              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={ratePer1000}
                onChange={(event) =>
                  setRatePer1000(event.target.value)
                }
                placeholder="Example: 0.55"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Minimum Quantity
              </label>

              <input
                type="number"
                min="1"
                value={minQuantity}
                onChange={(event) =>
                  setMinQuantity(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Maximum Quantity
              </label>

              <input
                type="number"
                min="1"
                value={maxQuantity}
                onChange={(event) =>
                  setMaxQuantity(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Refill
              </label>

              <select
                value={refill}
                onChange={(event) =>
                  setRefill(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              >
                <option value="No Refill">
                  No Refill
                </option>

                <option value="30 Days Refill">
                  30 Days Refill
                </option>

                <option value="60 Days Refill">
                  60 Days Refill
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Provider Name (Optional)
              </label>

              <input
                value={providerName}
                onChange={(event) =>
                  setProviderName(event.target.value)
                }
                placeholder="Example: ThePerfectPanel"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Provider Service ID (Optional)
              </label>

              <input
                value={providerServiceId}
                onChange={(event) =>
                  setProviderServiceId(event.target.value)
                }
                placeholder="Example: 1234"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Provider Cost / 1000 USD (Optional)
              </label>

              <input
                type="number"
                step="0.0001"
                min="0"
                value={providerRatePer1000}
                onChange={(event) =>
                  setProviderRatePer1000(event.target.value)
                }
                placeholder="Example: 0.40"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              />

              {Number(providerRatePer1000) > 0 &&
                Number(ratePer1000) > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Estimated profit:{" "}
                    {(((Number(ratePer1000) -
                      Number(providerRatePer1000)) /
                      Number(providerRatePer1000)) *
                      100).toFixed(2)}
                    %
                  </p>
                )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : editingServiceId
              ? "Update Service"
              : "Add Service"}
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900">
              All Services
            </h2>
          </div>

          {loadingServices ? (
            <div className="p-10 text-center text-gray-600">
              Services loading...
            </div>
          ) : services.length === 0 ? (
            <div className="p-10 text-center text-gray-600">
              Abhi koi service add nahi hui.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-600">
                    <th className="px-5 py-4">Platform</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Price/1000</th>
                    <th className="px-5 py-4">Min/Max</th>
                    <th className="px-5 py-4">Refill</th>
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">Profit</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <tr
                      key={service.id}
                      className="text-sm text-gray-700"
                    >
                      <td className="px-5 py-5 font-semibold">
                        {service.platform}
                      </td>

                      <td className="px-5 py-5">
                        {service.name}
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        ${service.ratePer1000.toFixed(4)}
                      </td>

                      <td className="px-5 py-5">
                        {service.minQuantity.toLocaleString()} /{" "}
                        {service.maxQuantity.toLocaleString()}
                      </td>

                      <td className="px-5 py-5">
                        {service.refill}
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-medium">
                          {service.providerName || "Manual"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          ID: {service.providerServiceId || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        {service.providerRatePer1000 > 0 ? (
                          <div>
                            <p className="font-semibold text-green-700">
                              {service.profitPercent.toFixed(2)}%
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Cost: ${service.providerRatePer1000.toFixed(4)}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            service.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {service.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              handleEditService(service)
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleToggleService(service)
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
                          >
                            {service.active
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteService(service.id)
                            }
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