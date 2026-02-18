import { describe, expect, it } from "vitest";
import { resolveStartupMode } from "./startupMode";

describe("resolveStartupMode", () => {
  it("returns initial_message when initial message exists and conversation is empty", () => {
    const mode = resolveStartupMode({
      hasAccess: true,
      hasUser: true,
      hasSession: true,
      messageCount: 0,
      hasInitialMessage: true,
      proactiveStarter: true,
      hasTriggered: false,
    });

    expect(mode).toBe("initial_message");
  });

  it("returns assistant_starter when no initial message and proactive starter enabled", () => {
    const mode = resolveStartupMode({
      hasAccess: true,
      hasUser: true,
      hasSession: true,
      messageCount: 0,
      hasInitialMessage: false,
      proactiveStarter: true,
      hasTriggered: false,
    });

    expect(mode).toBe("assistant_starter");
  });

  it("returns none when startup already triggered or messages already exist", () => {
    expect(
      resolveStartupMode({
        hasAccess: true,
        hasUser: true,
        hasSession: true,
        messageCount: 1,
        hasInitialMessage: true,
        proactiveStarter: true,
        hasTriggered: false,
      }),
    ).toBe("none");

    expect(
      resolveStartupMode({
        hasAccess: true,
        hasUser: true,
        hasSession: true,
        messageCount: 0,
        hasInitialMessage: false,
        proactiveStarter: true,
        hasTriggered: true,
      }),
    ).toBe("none");
  });
});
