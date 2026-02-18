import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useRuntimeErrorBuffer", () => ({
  getRecentRuntimeErrors: vi.fn(() => ["TypeError: Boom"]),
}));

import { capturePageContext } from "./pageContext";

type FakeNode = { innerText?: string; textContent?: string };

describe("capturePageContext", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        title: "Checkout Page",
        querySelectorAll: (selector: string) => {
          if (selector === "h1, h2, h3") {
            return [{ innerText: "Checkout" }, { innerText: "Shipping Address" }];
          }
          if (selector.includes("button")) {
            return [{ innerText: "Pay Now" }, { innerText: "Apply Coupon" }];
          }
          if (selector.includes("alert") || selector.includes("destructive") || selector.includes("error")) {
            return [{ innerText: "Payment failed. Try again." }, { innerText: "Unable to initialize payment" }];
          }
          return [];
        },
      },
    });
  });

  it("captures path, title, headings, actions, and error signals", () => {
    const result = capturePageContext({ path: "/checkout", url: "/checkout?step=shipping" });

    expect(result.path).toBe("/checkout");
    expect(result.url).toBe("/checkout?step=shipping");
    expect(result.title).toBe("Checkout Page");
    expect(result.headings).toContain("Checkout");
    expect(result.headings).toContain("Shipping Address");
    expect(result.primaryActions).toContain("Pay Now");
    const errorText = result.visibleErrors.join(" ").toLowerCase();
    expect(/failed|unable|warning/.test(errorText)).toBe(true);
    expect(result.recentRuntimeErrors[0]).toContain("TypeError: Boom");
    expect(typeof result.capturedAt).toBe("string");
  });

  it("deduplicates and truncates noisy values", () => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        title: "Products",
        querySelectorAll: (selector: string) => {
          if (selector === "h1, h2, h3") {
            return [{ innerText: "Very long heading ".repeat(20) }, { innerText: "Very long heading ".repeat(20) }];
          }
          if (selector.includes("button")) {
            return [{ innerText: "Proceed" }, { innerText: "Proceed" }];
          }
          return [{ innerText: "Warning: Something failed" }, { innerText: "Warning: Something failed" }];
        },
      },
    });

    const result = capturePageContext({ path: "/products", url: "/products" });

    expect(result.headings.length).toBe(1);
    expect(result.primaryActions).toEqual(["Proceed"]);
    expect(result.visibleErrors.length).toBe(1);
    expect(result.headings[0].length).toBeLessThanOrEqual(160);
  });
});
