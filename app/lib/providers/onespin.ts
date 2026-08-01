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

type ProviderStatusResponse = {
  status?: string;
  start_count?: string | number;
  remains?: string | number;
  charge?: string | number;
  currency?: string;
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

async function readProviderJson(
  response: Response
): Promise<Record<string, unknown>> {
  const text = await response.text();

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Provider JSON invalid hai. Response: ${text.slice(0, 150)}`
    );
  }
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

  const json = await readProviderJson(response);

  if (!response.ok) {
    throw new Error(
      String(json.error ?? json.message ?? "Provider Error")
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

  const json = (await readProviderJson(
    response
  )) as ProviderStatusResponse;

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
    throw new Error("Provider status response mein status nahi mila.");
  }

  return {
    status: String(json.status),
    startCount: optionalNumber(json.start_count),
    remains: optionalNumber(json.remains),
    charge: optionalNumber(json.charge),
    currency: json.currency ? String(json.currency) : null,
  };
}