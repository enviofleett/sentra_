import { describe, it, expect } from "vitest";
import { enrichProducts, buildCombos, describeDeal, RawProduct } from "./pricing";

const makeProduct = (overrides: Partial<RawProduct> = {}): RawProduct => {
  return {
    id: overrides.id || "p1",
    name: overrides.name || "Test Perfume",
    brand: overrides.brand || "Brand",
    price: overrides.price ?? 20000,
    cost_price: overrides.cost_price ?? 10000,
    stock_quantity: overrides.stock_quantity ?? 10,
    scent_profile: overrides.scent_profile || "woody",
    gender: overrides.gender || "unisex",
    size: overrides.size || "50ml",
    active_group_buy_id: overrides.active_group_buy_id ?? null,
    price_intelligence: overrides.price_intelligence ?? null,
    group_buy_campaigns: overrides.group_buy_campaigns ?? null,
  };
};

describe("enrichProducts", () => {
  it("keeps all products and computes bestPrice and savings", () => {
    const rows: RawProduct[] = [
      makeProduct({
        id: "a",
        name: "A",
        price: 20000,
        price_intelligence: {
          average_market_price: 25000,
          lowest_market_price: 24000,
          highest_market_price: 26000,
        },
      }),
      makeProduct({
        id: "b",
        name: "B",
        price: 15000,
        group_buy_campaigns: { discount_price: 12000, status: "active" },
      }),
    ];
    const enriched = enrichProducts(rows);
    expect(enriched).toHaveLength(2);
    const a = enriched.find((p) => p.id === "a")!;
    const b = enriched.find((p) => p.id === "b")!;
    expect(a.referencePrice).toBe(25000);
    expect(a.bestPrice).toBe(20000);
    expect(a.savingsAmount).toBe(5000);
    expect(b.bestPrice).toBe(12000);
    expect(b.savingsAmount).toBeGreaterThanOrEqual(0);
  });
});

describe("buildCombos", () => {
  it("creates single and pair combos scored by savings and margin", () => {
    const rows: RawProduct[] = [
      makeProduct({ id: "a", name: "A", price: 20000, stock_quantity: 20 }),
      makeProduct({ id: "b", name: "B", price: 18000, stock_quantity: 5 }),
      makeProduct({ id: "c", name: "C", price: 30000, stock_quantity: 3 }),
    ];
    const enriched = enrichProducts(rows);
    const combos = buildCombos(enriched, 3);
    expect(combos.length).toBeGreaterThanOrEqual(3);
    const top = combos[0];
    expect(top.productIds.length).toBeGreaterThanOrEqual(1);
    expect(top.totalPrice).toBeGreaterThan(0);
  });
});

describe("describeDeal", () => {
  it("returns simple language without technical jargon", () => {
    const rows: RawProduct[] = [
      makeProduct({ id: "a", name: "Fresh Wood", price: 20000 }),
      makeProduct({ id: "b", name: "Sweet Amber", price: 18000 }),
    ];
    const enriched = enrichProducts(rows);
    const combos = buildCombos(enriched, 2);
    const combo = combos.find((c) => c.productIds.length === 2)!;
    const items = combo.productIds.map((id) => enriched.find((p) => p.id === id)!);
    const text = describeDeal({ items, combo });
    expect(text.toLowerCase()).toContain("imagine");
    expect(text.toLowerCase()).not.toContain("%");
    expect(text.toLowerCase()).not.toContain("margin");
  });
});

