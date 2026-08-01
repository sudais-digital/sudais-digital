export function calculateSellingPrice(providerCost: number): number {
  if (!Number.isFinite(providerCost) || providerCost <= 0) {
    return 0;
  }

  let profitMargin: number;

  if (providerCost <= 0.2) {
    profitMargin = 0.7;
  } else if (providerCost <= 1) {
    profitMargin = 0.45;
  } else if (providerCost <= 5) {
    profitMargin = 0.35;
  } else {
    profitMargin = 0.25;
  }

  const currencyBuffer = 0.03;

  const sellingPrice =
    providerCost * (1 + profitMargin + currencyBuffer);

  return Number(sellingPrice.toFixed(4));
}

export function applyServiceOptions(
  basePrice: number,
  quality: string,
  guarantee: string,
  speed: string
): number {
  let multiplier = 1;

  if (quality === "Premium") {
    multiplier += 0.15;
  }

  if (quality === "Country Targeted") {
    multiplier += 0.3;
  }

  if (guarantee === "30 Days Refill") {
    multiplier += 0.1;
  }

  if (guarantee === "60 Days Refill") {
    multiplier += 0.18;
  }

  if (speed === "Priority") {
    multiplier += 0.1;
  }

  return Number((basePrice * multiplier).toFixed(2));
}