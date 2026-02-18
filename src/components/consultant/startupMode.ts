export type StartupMode = "none" | "initial_message" | "assistant_starter";

export function resolveStartupMode(params: {
  hasAccess: boolean;
  hasUser: boolean;
  hasSession: boolean;
  messageCount: number;
  hasInitialMessage: boolean;
  proactiveStarter: boolean;
  hasTriggered: boolean;
}): StartupMode {
  if (!params.hasUser || !params.hasAccess || !params.hasSession) return "none";
  if (params.messageCount > 0) return "none";
  if (params.hasTriggered) return "none";
  if (params.hasInitialMessage) return "initial_message";
  if (params.proactiveStarter) return "assistant_starter";
  return "none";
}
