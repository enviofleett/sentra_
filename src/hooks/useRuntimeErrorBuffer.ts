import { useEffect } from "react";

const MAX_RUNTIME_ERRORS = 10;
const runtimeErrors: string[] = [];

function normalizeRuntimeError(value: unknown): string {
  if (value instanceof Error) return value.message || value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "message" in value) {
    return String((value as { message?: unknown }).message || "Unknown error");
  }
  return String(value ?? "Unknown error");
}

export function recordRuntimeError(message: string) {
  const cleaned = String(message || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  runtimeErrors.push(cleaned);
  if (runtimeErrors.length > MAX_RUNTIME_ERRORS) {
    runtimeErrors.splice(0, runtimeErrors.length - MAX_RUNTIME_ERRORS);
  }
}

export function getRecentRuntimeErrors(): string[] {
  return [...runtimeErrors];
}

export function clearRuntimeErrorsForTest() {
  runtimeErrors.splice(0, runtimeErrors.length);
}

export function useRuntimeErrorBuffer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      const fromMessage = event.message || "";
      const fromError = normalizeRuntimeError(event.error);
      recordRuntimeError(fromMessage || fromError);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordRuntimeError(normalizeRuntimeError(event.reason));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
}
