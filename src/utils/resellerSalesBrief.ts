export type Concentration = "EDT" | "EDP" | "Parfum" | "Extrait" | "Cologne" | "EDC" | "Elixir" | "Unknown";

export interface NotesInput {
  top?: string[];
  heart?: string[];
  base?: string[];
}

export function normalizeSizeToken(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const lower = s.toLowerCase().replace(/\s+/g, "");

  const ozMatch = lower.match(/(\d+(?:\.\d+)?)(?:fl)?oz/);
  if (ozMatch) {
    const oz = Number(ozMatch[1]);
    if (!Number.isFinite(oz) || oz <= 0) return s;
    let ml = Math.round(oz * 29.5735);
    // Snap to common retail sizes to avoid awkward values (e.g. 3.4oz -> 101ml).
    const common = [10, 15, 20, 30, 35, 40, 50, 60, 75, 80, 90, 100, 120, 125, 150, 200];
    const snapped = common.find((c) => Math.abs(c - ml) <= 2);
    if (snapped) ml = snapped;
    return `${ml}ml`;
  }

  const mlMatch = lower.match(/(\d+(?:\.\d+)?)ml/);
  if (mlMatch) return `${Math.round(Number(mlMatch[1]))}ml`;

  const numOnly = lower.match(/^(\d+)$/);
  if (numOnly) return `${numOnly[1]}ml`;

  return s;
}

export function normalizeSizes(sizes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of sizes || []) {
    const norm = normalizeSizeToken(raw);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

export function titleCaseNote(note: string): string {
  const s = String(note || "").trim();
  if (!s) return "";
  return s
    .split(" ")
    .map((w) =>
      w
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join("-"),
    )
    .join(" ");
}

export function normalizeNotes(notes?: NotesInput): NotesInput {
  const normList = (arr?: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of arr || []) {
      const n = titleCaseNote(raw);
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  };
  return {
    top: normList(notes?.top),
    heart: normList(notes?.heart),
    base: normList(notes?.base),
  };
}
