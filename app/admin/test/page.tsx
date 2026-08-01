"use client";

import { useState } from "react";
import Link from "next/link";

import { auth } from "../../lib/firebase";

export default function AdminBackendTestPage() {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleTest() {
    try {
      setTesting(true);
      setMessage("");
      setSuccess(false);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Pehle admin account se login karein.");
      }

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch("/api/admin/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Backend connection test fail ho gaya."
        );
      }

      setSuccess(true);
      setMessage(result.message);
    } catch (error) {
      console.error("Backend test error:", error);

      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Backend connection test fail ho gaya."
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-5 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Firebase Admin Test
          </h1>

          <p className="mt-2 text-gray-600">
            Is button se Firebase Admin SDK aur environment variables check
            honge.
          </p>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test Backend Connection"}
          </button>

          {message && (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                success
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <Link
            href="/admin"
            className="mt-6 inline-block font-semibold text-blue-600 hover:underline"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    </main>
  );
}