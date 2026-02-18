import { afterEach, describe, expect, it } from "vitest";
import { clearRuntimeErrorsForTest, getRecentRuntimeErrors, recordRuntimeError } from "./useRuntimeErrorBuffer";

describe("runtime error buffer", () => {
  afterEach(() => {
    clearRuntimeErrorsForTest();
  });

  it("records normalized runtime errors", () => {
    recordRuntimeError("  Failed   to load resource   ");
    recordRuntimeError("Promise failed");

    const logs = getRecentRuntimeErrors();
    expect(logs).toEqual(["Failed to load resource", "Promise failed"]);
  });

  it("caps stored runtime errors to ring buffer size", () => {
    for (let i = 0; i < 15; i++) {
      recordRuntimeError(`Error #${i}`);
    }

    const logs = getRecentRuntimeErrors();
    expect(logs.length).toBe(10);
    expect(logs[0]).toBe("Error #5");
    expect(logs[9]).toBe("Error #14");
  });
});
