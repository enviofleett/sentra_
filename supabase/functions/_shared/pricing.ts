export type RawProduct = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  scent_profile: string | null;
  gender: string | null;
  size: string | null;
  active_group_buy_id?: string | null;
  price_intelligence?: {
    average_market_price: number | null;
    lowest_market_price: number | null;
    highest_market_price: number | null;
  } | null;
  group_buy_campaigns?: {
    discount_price: number;
    status: string;
  } | null;
};

export type EnrichedProduct = {
  id: string;
  name: string;
  brand: string | null;
  basePrice: number;
  bestPrice: number;
  referencePrice: number;
  savingsAmount: number;
  savingsPercent: number;
  marginAmount: number | null;
  marginPercent: number | null;
  stock: number;
  scentProfile: string | null;
  gender: string | null;
  priceTier: "Budget" | "Mid" | "Premium" | "Luxury" | "Unknown";
};

export type Combo = {
  productIds: string[];
  totalPrice: number;
  totalReferencePrice: number;
  totalSavings: number;
  score: number;
};

const safeNumber = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number | null);
  if (!Number.isFinite(n as number)) return null;
  return n as number;
};

const detectPriceTier = (price: number | null): EnrichedProduct["priceTier"] => {
  if (!price || price <= 0) return "Unknown";
  if (price <= 15000) return "Budget";
  if (price <= 35000) return "Mid";
  if (price <= 70000) return "Premium";
  return "Luxury";
};

export const enrichProducts = (rows: RawProduct[]): EnrichedProduct[] => {
  return rows.map((p) => {
    const basePrice = safeNumber(p.price) ?? 0;
    const marketAvg = safeNumber(p.price_intelligence?.average_market_price);
    const marketLow = safeNumber(p.price_intelligence?.lowest_market_price);
    const groupBuyPrice =
      p.group_buy_campaigns && p.group_buy_campaigns.status === "active"
        ? safeNumber(p.group_buy_campaigns.discount_price) ?? null
        : null;
    const referencePrice = marketAvg ?? marketLow ?? basePrice;
    const candidates = [basePrice];
    if (groupBuyPrice && groupBuyPrice > 0) candidates.push(groupBuyPrice);
    const bestPrice = Math.min(...candidates);
    const savingsAmount = Math.max(referencePrice - bestPrice, 0);
    const savingsPercent = referencePrice > 0 ? Math.round((savingsAmount / referencePrice) * 100) : 0;
    const cost = safeNumber(p.cost_price);
    const marginAmount = cost !== null ? bestPrice - cost : null;
    const marginPercent =
      cost !== null && bestPrice > 0 ? Math.round(((bestPrice - cost) / bestPrice) * 100) : null;
    const stock = safeNumber(p.stock_quantity) ?? 0;
    const priceTier = detectPriceTier(bestPrice);
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      basePrice,
      bestPrice,
      referencePrice,
      savingsAmount,
      savingsPercent,
      marginAmount,
      marginPercent,
      stock,
      scentProfile: p.scent_profile,
      gender: p.gender,
      priceTier,
    };
  });
};

const affinityScore = (a: EnrichedProduct, b: EnrichedProduct): number => {
  let score = 0;
  if (a.scentProfile && b.scentProfile && a.scentProfile === b.scentProfile) score += 2;
  if (a.gender && b.gender && a.gender === b.gender) score += 1;
  if (a.priceTier === b.priceTier) score += 1;
  return score;
};

export const buildCombos = (products: EnrichedProduct[], maxPerSize = 50): Combo[] => {
  const singles: Combo[] = products.map((p) => ({
    productIds: [p.id],
    totalPrice: p.bestPrice,
    totalReferencePrice: p.referencePrice,
    totalSavings: p.savingsAmount,
    score:
      p.savingsAmount * 0.6 +
      (p.marginAmount ?? 0) * 0.3 +
      Math.log10(Math.max(p.stock, 1)) * 0.1,
  }));
  const pairs: Combo[] = [];
  const limited = products.slice(0, Math.min(products.length, maxPerSize));
  for (let i = 0; i < limited.length; i++) {
    for (let j = i + 1; j < limited.length; j++) {
      const a = limited[i];
      const b = limited[j];
      const totalPrice = a.bestPrice + b.bestPrice;
      const totalReferencePrice = a.referencePrice + b.referencePrice;
      const totalSavings = a.savingsAmount + b.savingsAmount;
      const comboMargin =
        (a.marginAmount ?? 0) + (b.marginAmount ?? 0);
      const affinity = affinityScore(a, b);
      const score =
        totalSavings * 0.5 +
        comboMargin * 0.3 +
        affinity * 5 +
        Math.log10(Math.max(a.stock + b.stock, 1)) * 0.2;
      pairs.push({
        productIds: [a.id, b.id],
        totalPrice,
        totalReferencePrice,
        totalSavings,
        score,
      });
    }
  }
  const all = [...singles, ...pairs];
  all.sort((a, b) => b.score - a.score);
  return all;
};

export type DealSummary = {
  items: EnrichedProduct[];
  combo: Combo;
};

const formatNaira = (v: number): string => {
  return `₦${Math.round(v).toLocaleString()}`;
};

export const describeDeal = (deal: DealSummary): string => {
  const names = deal.items.map((p) => p.name);
  const total = deal.combo.totalPrice;
  const savings = deal.combo.totalSavings;
  if (names.length === 1) {
    const name = names[0];
    if (savings > 0) {
      return `Imagine picking ${name} today and keeping about ${formatNaira(
        savings,
      )} in your pocket. You pay around ${formatNaira(
        total,
      )} instead of the usual higher price.`;
    }
    return `Imagine walking out with ${name} for about ${formatNaira(
      total,
    )}. Simple, clean price with no tricks.`;
  }
  if (names.length === 2) {
    const [a, b] = names;
    if (savings > 0) {
      return `Imagine getting both ${a} and ${b} together for about ${formatNaira(
        total,
      )}. It feels like one of them is almost free, saving you roughly ${formatNaira(
        savings,
      )} compared to buying them the usual way.`;
    }
    return `Imagine stacking ${a} and ${b} in one simple bundle for about ${formatNaira(
      total,
    )}. One easy move, two strong scents in your bag.`;
  }
  return `Imagine filling your shelf with this mix for about ${formatNaira(
    total,
  )}. It is a heavy basket but still friendly on your wallet.`;
};

