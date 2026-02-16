import { describe, expect, it } from "vitest";
import { normalizeNotes, normalizeSizes } from "./resellerSalesBrief";

describe("resellerSalesBrief normalization", () => {
  it("normalizes and dedups sizes", () => {
    expect(normalizeSizes(["3.4 oz", "100 ml", "100ml", ""])).toEqual(["100ml"]);
  });

  it("keeps unknown size tokens as-is", () => {
    expect(normalizeSizes(["Tester", "100ml"])).toEqual(["Tester", "100ml"]);
  });

  it("normalizes notes with title-case and dedup", () => {
    const out = normalizeNotes({
      top: ["bergamot", "Bergamot ", "pink-pepper"],
      heart: ["rose", "ROSE"],
      base: ["amber", "white musk"],
    });
    expect(out.top).toEqual(["Bergamot", "Pink-Pepper"]);
    expect(out.heart).toEqual(["Rose"]);
    expect(out.base).toEqual(["Amber", "White Musk"]);
  });
});

