import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

type ProviderService = {
  service?: string | number;
  name?: string;
  type?: string;
  category?: string;
  rate?: string | number;
  min?: string | number;
  max?: string | number;
  refill?: boolean | string;
};

function getPlatform(category: string, serviceName: string): string {
  const text = `${category} ${serviceName}`.toLowerCase();

  if (text.includes("instagram")) return "Instagram";
  if (text.includes("facebook")) return "Facebook";
  if (text.includes("youtube")) return "YouTube";
  if (text.includes("tiktok")) return "TikTok";
  if (text.includes("twitter") || text.includes(" x ")) return "X / Twitter";
  if (text.includes("telegram")) return "Telegram";
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("snapchat")) return "Snapchat";
  if (text.includes("linkedin")) return "LinkedIn";
  if (text.includes("threads")) return "Threads";
  if (text.includes("pinterest")) return "Pinterest";
  if (text.includes("discord")) return "Discord";
  if (text.includes("reddit")) return "Reddit";
  if (text.includes("twitch")) return "Twitch";
  if (text.includes("spotify")) return "Spotify";
  if (text.includes("traffic") || text.includes("website")) {
    return "Website Traffic";
  }

  return category.trim() || "Other";
}

function getRefillValue(refill: ProviderService["refill"]): string {
  if (refill === true) return "30 Days Refill";

  const value = String(refill ?? "").toLowerCase();

  if (value === "true" || value === "yes" || value.includes("refill")) {
    return "30 Days Refill";
  }

  return "No Refill";
}

function safeDocumentId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 500);
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Admin authorization token missing hai." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userSnapshot.exists || userSnapshot.data()?.role !== "admin") {
      return NextResponse.json(
        { message: "Sirf admin services import kar sakta hai." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { providerId?: string };
    const providerId = String(body.providerId ?? "").trim();

    if (!providerId) {
      return NextResponse.json(
        { message: "Provider ID missing hai." },
        { status: 400 }
      );
    }

    const providerReference = adminDb.collection("providers").doc(providerId);
    const providerSnapshot = await providerReference.get();

    if (!providerSnapshot.exists) {
      return NextResponse.json(
        { message: "Provider nahi mila." },
        { status: 404 }
      );
    }

    const provider = providerSnapshot.data() ?? {};

    if (provider.active === false) {
      return NextResponse.json(
        { message: "Provider inactive hai. Pehle isay enable karein." },
        { status: 400 }
      );
    }

    const apiUrl = String(provider.apiUrl ?? "").trim();
    const apiKeyEnvName = String(provider.apiKeyEnvName ?? "").trim();
    const providerName = String(provider.name ?? "Provider").trim();
    const currency = String(provider.currency ?? "USD").trim().toUpperCase();
    const markupPercent = Number(provider.defaultProfitPercent ?? 30);

    if (!apiUrl || !apiKeyEnvName) {
      return NextResponse.json(
        { message: "Provider API URL ya environment variable name missing hai." },
        { status: 400 }
      );
    }

    const apiKey = process.env[apiKeyEnvName];

    if (!apiKey) {
      return NextResponse.json(
        {
          message: `.env.local mein ${apiKeyEnvName} ki real API key nahi mili.`,
        },
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.set("key", apiKey);
    formData.set("action", "services");

    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    const responseText = await providerResponse.text();

    let providerResult: unknown;

    try {
      providerResult = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Provider ne valid JSON services response nahi diya."
      );
    }

    if (!providerResponse.ok) {
      const providerMessage =
        typeof providerResult === "object" &&
        providerResult !== null &&
        "error" in providerResult
          ? String((providerResult as { error: unknown }).error)
          : "Provider services request fail ho gayi.";

      throw new Error(providerMessage);
    }

    if (
      typeof providerResult === "object" &&
      providerResult !== null &&
      "error" in providerResult
    ) {
      throw new Error(
        String((providerResult as { error: unknown }).error)
      );
    }

    if (!Array.isArray(providerResult)) {
      throw new Error("Provider services list array format mein nahi mili.");
    }

    const validServices = (providerResult as ProviderService[]).filter(
      (service) =>
        service.service !== undefined &&
        String(service.service).trim() &&
        String(service.name ?? "").trim() &&
        Number(service.rate) >= 0 &&
        Number(service.min) >= 1 &&
        Number(service.max) >= Number(service.min)
    );

    if (validServices.length === 0) {
      throw new Error("Provider se koi valid service nahi mili.");
    }

    let processed = 0;
    const chunkSize = 400;

    for (let start = 0; start < validServices.length; start += chunkSize) {
      const chunk = validServices.slice(start, start + chunkSize);
      const batch = adminDb.batch();

      for (const service of chunk) {
        const providerServiceId = String(service.service).trim();
        const serviceName = String(service.name ?? "").trim();
        const category = String(service.category ?? "").trim();
        const providerRate = Number(service.rate);
        const minQuantity = Number(service.min);
        const maxQuantity = Number(service.max);
        const sellRate = Number(
          (providerRate * (1 + markupPercent / 100)).toFixed(4)
        );

        const serviceDocumentId = safeDocumentId(
          `${providerId}_${providerServiceId}`
        );

        const serviceReference = adminDb
          .collection("services")
          .doc(serviceDocumentId);

        batch.set(
          serviceReference,
          {
            platform: getPlatform(category, serviceName),
            category,
            name: serviceName,
            ratePer1000: sellRate,
            minQuantity,
            maxQuantity,
            refill: getRefillValue(service.refill),
            active: true,
            currency,
            providerId,
            providerName,
            providerServiceId,
            providerRatePer1000: providerRate,
            profitPercent: markupPercent,
            providerServiceType: String(service.type ?? ""),
            importedFromProvider: true,
            updatedAt: FieldValue.serverTimestamp(),
            importedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await batch.commit();
      processed += chunk.length;
    }

    await providerReference.update({
      totalServices: processed,
      lastServicesImportStatus: "success",
      lastServicesImportAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: `${processed} services successfully import/update ho gayi hain.`,
      totalServices: processed,
      profitPercent: markupPercent,
    });
  } catch (error) {
    console.error("Import provider services error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Services import nahi ho sakin.",
      },
      { status: 500 }
    );
  }
}