import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

type ProviderBalanceResponse = {
  balance?: string | number;
  currency?: string;
  error?: string;
  message?: string;
};

export async function POST(request: Request) {
  let providerId = "";

  try {
    const authorizationHeader = request.headers.get("authorization");

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        { success: false, message: "Admin login token nahi mila." },
        { status: 401 }
      );
    }

    const idToken = authorizationHeader.replace("Bearer ", "").trim();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const adminDocument = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!adminDocument.exists || adminDocument.data()?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Sirf admin provider test kar sakta hai." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { providerId?: string };
    providerId = String(body.providerId ?? "").trim();

    if (!providerId) {
      return NextResponse.json(
        { success: false, message: "Provider ID missing hai." },
        { status: 400 }
      );
    }

    const providerReference = adminDb.collection("providers").doc(providerId);
    const providerDocument = await providerReference.get();

    if (!providerDocument.exists) {
      return NextResponse.json(
        { success: false, message: "Provider Firestore mein nahi mila." },
        { status: 404 }
      );
    }

    const providerData = providerDocument.data();
    const apiUrl = String(providerData?.apiUrl ?? "").trim();
    const apiKeyEnvName = String(providerData?.apiKeyEnvName ?? "").trim();

    if (!apiUrl || !apiKeyEnvName) {
      throw new Error("Provider API URL ya API key environment name missing hai.");
    }

    const apiKey = process.env[apiKeyEnvName];

    if (!apiKey) {
      throw new Error(
        `.env.local mein ${apiKeyEnvName} ki real API key nahi mili.`
      );
    }

    const formData = new URLSearchParams();
    formData.set("key", apiKey);
    formData.set("action", "balance");

    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const responseText = await providerResponse.text();
    let providerResult: ProviderBalanceResponse;

    try {
      providerResult = JSON.parse(responseText) as ProviderBalanceResponse;
    } catch {
      throw new Error(
        `Provider ne JSON response nahi diya. Response: ${responseText.slice(0, 150)}`
      );
    }

    if (!providerResponse.ok) {
      throw new Error(
        providerResult.error ||
          providerResult.message ||
          `Provider HTTP error ${providerResponse.status}`
      );
    }

    if (providerResult.error) {
      throw new Error(providerResult.error);
    }

    const balance = Number(providerResult.balance);

    if (!Number.isFinite(balance)) {
      throw new Error("Provider response mein valid balance nahi mila.");
    }

    await providerReference.update({
      lastConnectionStatus: "connected",
      lastKnownBalance: balance,
      lastKnownCurrency: String(providerResult.currency ?? "USD"),
      lastConnectionError: "",
      lastCheckedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Provider successfully connected hai.",
      balance,
      currency: String(providerResult.currency ?? "USD"),
    });
  } catch (error) {
    console.error("Provider connection test error:", error);

    if (providerId) {
      try {
        await adminDb.collection("providers").doc(providerId).update({
          lastConnectionStatus: "failed",
          lastConnectionError:
            error instanceof Error ? error.message : "Unknown provider error",
          lastCheckedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        console.error("Provider failure status save error:", updateError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Provider connection test fail ho gaya.",
      },
      { status: 500 }
    );
  }
}