import { describe, expect, it } from "vitest";
import { normalizeOrderItem, normalizeOrderItems } from "./orderItems";

describe("orderItems normalizer", () => {
  it("keeps flat legacy item shape intact", () => {
    const item = normalizeOrderItem({
      product_id: "p1",
      name: "Legacy Product",
      quantity: 2,
      price: 15000,
      image_url: "https://example.com/p1.png",
      vendor_id: "v1",
      vendor_name: "Vendor One",
    });

    expect(item).toEqual({
      product_id: "p1",
      name: "Legacy Product",
      quantity: 2,
      price: 15000,
      image_url: "https://example.com/p1.png",
      vendor_id: "v1",
      vendor_name: "Vendor One",
    });
  });

  it("flattens nested checkout item shape", () => {
    const item = normalizeOrderItem({
      product_id: "p2",
      quantity: 3,
      product: {
        id: "p2",
        name: "Nested Product",
        price: 22000,
        image_url: "https://example.com/p2.png",
        vendor_id: "v2",
        vendor: { rep_full_name: "Vendor Two" },
      },
    });

    expect(item).toEqual({
      product_id: "p2",
      name: "Nested Product",
      quantity: 3,
      price: 22000,
      image_url: "https://example.com/p2.png",
      vendor_id: "v2",
      vendor_name: "Vendor Two",
    });
  });

  it("applies safe defaults for missing values", () => {
    const item = normalizeOrderItem({});

    expect(item.name).toBe("Product");
    expect(item.product_id).toBe("");
    expect(item.price).toBe(0);
    expect(item.quantity).toBe(1);
    expect(item.image_url).toBeNull();
    expect(item.vendor_id).toBeNull();
  });

  it("coerces numeric values and clamps quantity to minimum 1", () => {
    const item = normalizeOrderItem({
      product_id: "p3",
      name: "Numeric Product",
      quantity: "0",
      price: "12500.5",
    });

    expect(item.quantity).toBe(1);
    expect(item.price).toBe(12500.5);
  });

  it("normalizes arrays safely", () => {
    expect(normalizeOrderItems(null as any)).toEqual([]);
    expect(normalizeOrderItems([{ name: "X" }])[0].name).toBe("X");
  });
});
