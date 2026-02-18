import { getRecentRuntimeErrors } from "@/hooks/useRuntimeErrorBuffer";

export type PageContext = {
  url: string;
  path: string;
  title: string;
  headings: string[];
  primaryActions: string[];
  visibleErrors: string[];
  recentRuntimeErrors: string[];
  capturedAt: string;
};

type CapturePageContextOptions = {
  path?: string;
  url?: string;
};

const MAX_ITEMS = 6;
const MAX_TEXT_LEN = 160;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LEN);
}

function uniqueNormalized(values: string[], max = MAX_ITEMS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= max) break;
  }
  return out;
}

function collectText(selector: string, max = MAX_ITEMS): string[] {
  if (typeof document === "undefined") return [];
  const nodes = Array.from(document.querySelectorAll(selector));
  const texts = nodes
    .map((node) => (node as HTMLElement).innerText || node.textContent || "")
    .map((text) => normalizeText(text))
    .filter(Boolean);
  return uniqueNormalized(texts, max);
}

function collectVisibleErrors(max = MAX_ITEMS): string[] {
  if (typeof document === "undefined") return [];
  const selector = [
    "[role='alert']",
    ".text-destructive",
    ".error",
    ".alert",
    "[data-error='true']",
    "[data-sonner-toast]",
  ].join(",");

  const fromSelectors = collectText(selector, max * 2);
  const keywordRegex = /(error|failed|unable|warning|invalid|timeout|denied)/i;
  const fromKeywords = fromSelectors.filter((text) => keywordRegex.test(text));
  return uniqueNormalized(fromKeywords, max);
}

export function capturePageContext(options: CapturePageContextOptions = {}): PageContext {
  const path = options.path || (typeof window !== "undefined" ? window.location.pathname : "");
  const url = options.url || (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : path);
  const title = typeof document !== "undefined" ? normalizeText(document.title || "Current page") : "Current page";

  return {
    url,
    path,
    title,
    headings: collectText("h1, h2, h3"),
    primaryActions: collectText("button, [role='button'], input[type='submit'], input[type='button']"),
    visibleErrors: collectVisibleErrors(),
    recentRuntimeErrors: uniqueNormalized(getRecentRuntimeErrors(), MAX_ITEMS),
    capturedAt: new Date().toISOString(),
  };
}
