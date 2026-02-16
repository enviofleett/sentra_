import { describe, it, expect } from "vitest";
import { applyCurrentProduct, loadConversationState, ConversationState, ProductConversationContext } from "./ConversationContext";

describe("ConversationContext helpers", () => {
  it("loadConversationState returns empty defaults for null or invalid payload", () => {
    const empty = loadConversationState(null);
    expect(empty.lastSessionByKey).toEqual({});
    expect(empty.lastProduct).toBeNull();
    expect(empty.browsingHistory).toEqual([]);

    const invalid = loadConversationState("not-json");
    expect(invalid.lastSessionByKey).toEqual({});
    expect(invalid.lastProduct).toBeNull();
    expect(invalid.browsingHistory).toEqual([]);
  });

  it("loadConversationState normalizes partial payloads", () => {
    const payload = JSON.stringify({
      lastSessionByKey: { global: "abc" },
      lastProduct: { id: "p1", name: "Test" },
      browsingHistory: [{ id: "p1", name: "Test" }],
    });
    const state = loadConversationState(payload);
    expect(state.lastSessionByKey.global).toBe("abc");
    expect(state.lastProduct?.id).toBe("p1");
    expect(state.browsingHistory.length).toBe(1);
  });

  it("applyCurrentProduct promotes product to front and deduplicates by id", () => {
    const base: ConversationState = {
      lastSessionByKey: {},
      lastProduct: null,
      browsingHistory: [
        { id: "p1", name: "Old" } as ProductConversationContext,
        { id: "p2", name: "Other" } as ProductConversationContext,
      ],
    };

    const updated = applyCurrentProduct(base, { id: "p1", name: "Updated" });
    expect(updated.lastProduct?.id).toBe("p1");
    expect(updated.browsingHistory[0].id).toBe("p1");
    expect(updated.browsingHistory[0].name).toBe("Updated");
    expect(updated.browsingHistory[1].id).toBe("p2");
  });

  it("applyCurrentProduct caps history to 20 entries", () => {
    const many: ProductConversationContext[] = [];
    for (let i = 0; i < 25; i++) {
      many.push({ id: `p${i}`, name: `P ${i}` });
    }
    const base: ConversationState = {
      lastSessionByKey: {},
      lastProduct: null,
      browsingHistory: many,
    };
    const updated = applyCurrentProduct(base, { id: "px", name: "Newest" });
    expect(updated.browsingHistory.length).toBe(20);
    expect(updated.browsingHistory[0].id).toBe("px");
  });
});
