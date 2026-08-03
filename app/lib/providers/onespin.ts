export type CreateProviderOrderInput = {
  apiUrl: string;
  apiKey: string;
  service: string;
  link: string;
  quantity: number;
};

export type CreateProviderOrderResult = {
  providerOrderId: string;
};

export type GetProviderOrderStatusInput = {
  apiUrl: string;
  apiKey: string;
  providerOrderId: string;
};

export type GetProviderOrderStatusResult = {
  status: string;
  startCount: number | null;
  remains: number | null;
  charge: number | null;
  currency: string | null;
};

export type GetProviderServiceRateInput = {
  apiUrl: string;
  apiKey: string;
  service: string;
};

export type GetProviderServiceRateResult = {
  service: string;
  ratePer1000: number;
  minQuantity: number | null;
  maxQuantity: number | null;
};

type ProviderStatusResponse = {
  status?: string;
  start_count?: string | number;
  remains?: string | number;
  charge?: string | number;
  currency?: string;
  error?: string;
  message?: string;
};

type ProviderServiceResponse = {
  service?: string | number;
  rate?: string | number;
  min?: string | number;
  max?: string | number;
  error?: string;
  message?: string;
};

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function readProviderJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Provider JSON invalid hai. Response: ${text.slice(0, 150)}`
    );
  }
}

function getProviderErrorMessage(
  payload: unknown,
  fallback: string
): string {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const data = payload as {
    error?: unknown;
    message?: unknown;
  };

  return String(data.error ?? data.message ?? fallback);
}

export async function createProviderOrder(
  input: CreateProviderOrderInput
): Promise<CreateProviderOrderResult> {
  const form = new URLSearchParams();

  form.set("key", input.apiKey);
  form.set("action", "add");
  form.set("service", input.service);
  form.set("link", input.link);
  form.set("quantity", String(input.quantity));

  const response = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const json = await readProviderJson<Record<string, unknown>>(response);

  if (!response.ok) {
    throw new Error(
      getProviderErrorMessage(
        json,
        `Provider HTTP error ${response.status}`
      )
    );
  }

  if (json.error) {
    throw new Error(String(json.error));
  }

  if (!json.order) {
    throw new Error("Provider Order ID nahi mili.");
  }

  return {
    providerOrderId: String(json.order),
  };
}

export async function getProviderOrderStatus(
  input: GetProviderOrderStatusInput
): Promise<GetProviderOrderStatusResult> {
  const form = new URLSearchParams();

  form.set("key", input.apiKey);
  form.set("action", "status");
  form.set("order", input.providerOrderId);

  const response = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const json = await readProviderJson<ProviderStatusResponse>(response);

  if (!response.ok) {
    throw new Error(
      json.error ??
        json.message ??
        `Provider HTTP error ${response.status}`
    );
  }

  if (json.error) {
    throw new Error(json.error);
  }

  if (!json.status) {
    throw new Error(
      "Provider status response mein status nahi mila."
    );
  }

  return {
    status: String(json.status),
    startCount: optionalNumber(json.start_count),
    remains: optionalNumber(json.remains),
    charge: optionalNumber(json.charge),
    currency: json.currency ? String(json.currency) : null,
  };
}

export async function getProviderServiceRate(
  input: GetProviderServiceRateInput
): Promise<GetProviderServiceRateResult> {
  const form = new URLSearchParams();

  form.set("key", input.apiKey);
  form.set("action", "services");

  const response = await fetch(input.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const json = await readProviderJson<unknown>(response);

  if (!response.ok) {
    throw new Error(
      getProviderErrorMessage(
        json,
        `Provider HTTP error ${response.status}`
      )
    );
  }

  if (
    typeof json === "object" &&
    json !== null &&
    !Array.isArray(json) &&
    "error" in json
  ) {
    throw new Error(
      String((json as { error?: unknown }).error ?? "Provider Error")
    );
  }

  if (!Array.isArray(json)) {
    throw new Error(
      "Provider services response array format mein nahi mila."
    );
  }

  const requestedServiceId = String(input.service).trim();

  const matchedService = (
    json as ProviderServiceResponse[]
  ).find(
    (service) =>
      String(service.service ?? "").trim() === requestedServiceId
  );

  if (!matchedService) {
    throw new Error(
      "Selected service provider ki latest list mein nahi mili."
    );
  }

  const ratePer1000 = Number(matchedService.rate);

  if (!Number.isFinite(ratePer1000) || ratePer1000 < 0) {
    throw new Error(
      "Provider ki latest service rate valid nahi hai."
    );
  }

  return {
    service: requestedServiceId,
    ratePer1000,
    minQuantity: optionalNumber(matchedService.min),
    maxQuantity: optionalNumber(matchedService.max),
  };
}