import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Concentration = "EDT" | "EDP" | "Parfum" | "Extrait" | "Cologne" | "EDC" | "Elixir" | "Unknown";

interface NotesInput {
  top?: string[];
  heart?: string[];
  base?: string[];
}

interface Constraints {
  max_bullets_per_section?: number;
  region?: "NG" | "Global";
}

interface Body {
  product_id: string;
  fragrance_name: string;
  brand: string;
  concentration: Concentration;
  sizes: string[];
  known_notes?: NotesInput;
  inspiration_or_style?: string | null;
  constraints?: Constraints;
  force?: boolean;
}

type ResellerSalesBrief = {
  version: "1.0";
  product: {
    name: string;
    brand: string;
    concentration: string;
    sizes: string[];
  };
  positioning_one_liner: string;
  who_to_sell_to: string[];
  how_it_smells_fast: {
    top: string[];
    heart: string[];
    base: string[];
    plain_english: string[];
  };
  why_it_sells: string[];
  best_use_cases: string[];
  price_positioning_tips: string[];
  objections_and_replies: { objection: string; reply: string }[];
  bundle_and_upsell_ideas: string[];
  sales_scripts: {
    whatsapp_dm: string[];
    store_pitch: string[];
  };
  compliance: {
    claims_made: string[];
    unknowns: string[];
  };
};

function normalizeSizeToken(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const lower = s.toLowerCase().replace(/\s+/g, "");

  // 3.4oz / 3.4fl.oz -> ml
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

function normalizeSizes(sizes: string[]): string[] {
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

function titleCaseNote(note: string): string {
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

function normalizeNotes(notes?: NotesInput): NotesInput {
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

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number" || t === "boolean") return JSON.stringify(value);
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stripCodeFences(s: string): string {
  let out = (s || "").trim();
  if (out.startsWith("```json")) out = out.slice(7);
  if (out.startsWith("```")) out = out.slice(3);
  if (out.endsWith("```")) out = out.slice(0, -3);
  return out.trim();
}

function validateBrief(
  brief: any,
  opts: {
    maxBullets: number;
    inputNotes: NotesInput;
    inputHasNotes: boolean;
  },
): string[] {
  const errors: string[] = [];
  const maxBullets = opts.maxBullets;

  const isStr = (v: any) => typeof v === "string" && v.trim().length > 0;
  const isStrArr = (v: any) => Array.isArray(v) && v.every((x) => typeof x === "string");
  const clamp = (arr: any, path: string) => {
    if (!Array.isArray(arr)) return;
    if (arr.length > maxBullets) errors.push(`${path} has too many items (${arr.length} > ${maxBullets})`);
  };

  if (!brief || typeof brief !== "object") return ["Output is not an object"];
  if (brief.version !== "1.0") errors.push("version must be \"1.0\"");

  if (!brief.product || typeof brief.product !== "object") errors.push("product missing");
  else {
    if (!isStr(brief.product.name)) errors.push("product.name missing");
    if (!isStr(brief.product.brand)) errors.push("product.brand missing");
    if (!isStr(brief.product.concentration)) errors.push("product.concentration missing");
    if (!isStrArr(brief.product.sizes)) errors.push("product.sizes must be string[]");
  }

  if (!isStr(brief.positioning_one_liner)) errors.push("positioning_one_liner missing");
  else if (brief.positioning_one_liner.length > 140) errors.push("positioning_one_liner too long");

  const listFields = [
    "who_to_sell_to",
    "why_it_sells",
    "best_use_cases",
    "price_positioning_tips",
    "bundle_and_upsell_ideas",
  ];
  for (const f of listFields) {
    if (!isStrArr(brief[f])) errors.push(`${f} must be string[]`);
    clamp(brief[f], f);
  }

  const smells = brief.how_it_smells_fast;
  if (!smells || typeof smells !== "object") errors.push("how_it_smells_fast missing");
  else {
    for (const k of ["top", "heart", "base", "plain_english"] as const) {
      if (!isStrArr(smells[k])) errors.push(`how_it_smells_fast.${k} must be string[]`);
      if (k === "plain_english") clamp(smells[k], `how_it_smells_fast.${k}`);
    }
  }

  // Enforce "only provided notes" rule.
  const allowed = new Set<string>();
  const pushAllowed = (arr?: string[]) => (arr || []).forEach((n) => allowed.add(n.toLowerCase()));
  pushAllowed(opts.inputNotes.top);
  pushAllowed(opts.inputNotes.heart);
  pushAllowed(opts.inputNotes.base);

  const outNoteFields: Array<keyof ResellerSalesBrief["how_it_smells_fast"]> = ["top", "heart", "base"];
  for (const nf of outNoteFields) {
    const outArr: string[] = smells?.[nf] || [];
    if (!opts.inputHasNotes && outArr.length > 0) {
      errors.push(`how_it_smells_fast.${nf} must be empty when notes are not provided`);
      continue;
    }
    for (const n of outArr) {
      if (!allowed.has(String(n).toLowerCase())) errors.push(`how_it_smells_fast.${nf} contains unknown note: "${n}"`);
    }
  }

  if (!Array.isArray(brief.objections_and_replies)) errors.push("objections_and_replies must be array");
  else {
    for (const [i, item] of brief.objections_and_replies.entries()) {
      if (!item || typeof item !== "object") {
        errors.push(`objections_and_replies[${i}] not object`);
        continue;
      }
      if (!isStr(item.objection)) errors.push(`objections_and_replies[${i}].objection missing`);
      if (!isStr(item.reply)) errors.push(`objections_and_replies[${i}].reply missing`);
      else if (String(item.reply).length > 200) errors.push(`objections_and_replies[${i}].reply too long`);
    }
  }

  if (!brief.sales_scripts || typeof brief.sales_scripts !== "object") errors.push("sales_scripts missing");
  else {
    if (!isStrArr(brief.sales_scripts.whatsapp_dm)) errors.push("sales_scripts.whatsapp_dm must be string[]");
    if (!isStrArr(brief.sales_scripts.store_pitch)) errors.push("sales_scripts.store_pitch must be string[]");
    clamp(brief.sales_scripts.whatsapp_dm, "sales_scripts.whatsapp_dm");
    clamp(brief.sales_scripts.store_pitch, "sales_scripts.store_pitch");
  }

  if (!brief.compliance || typeof brief.compliance !== "object") errors.push("compliance missing");
  else {
    if (!isStrArr(brief.compliance.claims_made)) errors.push("compliance.claims_made must be string[]");
    if (!isStrArr(brief.compliance.unknowns)) errors.push("compliance.unknowns must be string[]");
  }

  // Enforce unknowns when notes absent
  if (!opts.inputHasNotes) {
    const unknowns: string[] = brief?.compliance?.unknowns || [];
    if (!unknowns.map((u) => String(u).toLowerCase()).includes("notes")) errors.push("compliance.unknowns must include \"notes\"");
  }

  // Ban obvious exaggeration/performance claims since we don't accept those as inputs.
  const bannedPhrases = [
    "beast mode",
    "guaranteed compliments",
    "compliment monster",
    "panty dropper",
    "nuclear",
  ];
  const bannedRegex = [
    /\b\d+\s*hours?\b/i,
    /\blongevity\b/i,
    /\bprojection\b/i,
    /\bsillage\b/i,
    /\blast(s|ing)?\b/i,
  ];

  const allText = JSON.stringify(brief).toLowerCase();
  for (const p of bannedPhrases) if (allText.includes(p)) errors.push(`Contains banned phrase: "${p}"`);
  for (const rx of bannedRegex) if (rx.test(allText)) errors.push(`Contains banned claim/pattern: ${String(rx)}`);

  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await userSupabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = authData.user.id;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    const product_id = String(body.product_id || "").trim();
    const fragrance_name = String(body.fragrance_name || "").trim();
    const brand = String(body.brand || "").trim();
    const concentration = (body.concentration || "Unknown") as Concentration;
    const sizes = Array.isArray(body.sizes) ? body.sizes.map((s) => String(s)) : [];
    const known_notes = normalizeNotes(body.known_notes);
    const inspiration_or_style = body.inspiration_or_style ? String(body.inspiration_or_style).trim() : null;
    const constraints = body.constraints || {};
    const force = body.force === true;

    if (!product_id || !fragrance_name || !brand || !concentration || sizes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "product_id, fragrance_name, brand, concentration, and sizes are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedSizes = normalizeSizes(sizes);
    const maxBullets = Math.max(2, Math.min(8, Number(constraints.max_bullets_per_section || 6)));
    const inputHasNotes =
      (known_notes.top?.length || 0) + (known_notes.heart?.length || 0) + (known_notes.base?.length || 0) > 0;

    const normalizedInput = {
      fragrance_name,
      brand,
      concentration,
      sizes: normalizedSizes,
      known_notes,
      inspiration_or_style: inspiration_or_style || null,
      constraints: {
        max_bullets_per_section: maxBullets,
        region: constraints.region || "NG",
      },
    };

    const input_hash = await sha256Hex(stableStringify(normalizedInput));

    // Caching check
    const { data: productRow, error: productErr } = await supabase
      .from("products")
      .select("metadata")
      .eq("id", product_id)
      .maybeSingle();
    if (productErr || !productRow) {
      return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = (productRow as any).metadata && typeof (productRow as any).metadata === "object" ? (productRow as any).metadata : {};
    const existing = metadata?.reseller_sales;
    if (!force && existing?.version === "1.0" && existing?.input_hash === input_hash && existing?.content) {
      return new Response(
        JSON.stringify({ success: true, cached: true, input_hash, content: existing.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const system = [
      "Role: You are a fragrance sales strategist writing for a wholesale platform that serves fragrance resellers.",
      "Your job is not to impress with poetry, but to help resellers understand, position, and sell the fragrance quickly and confidently.",
      "",
      "Tone & Rules:",
      "- Clear, direct, practical language",
      "- No fluff, no metaphors",
      "- Short sentences and bullet points",
      "- Focus on how this fragrance sells in real life",
      "- Assume the reader is a reseller, not an end consumer",
      "- Be accurate and realistic, not exaggerated",
      "",
      "Accuracy:",
      "- Use ONLY the facts in INPUT FACTS.",
      "- If a detail is not provided, mark it as unknown in compliance.unknowns.",
      "- Do NOT invent performance claims (longevity/projection/hours).",
      "",
      "Output:",
      "- Return ONLY valid JSON. No markdown. No extra text.",
    ].join("\n");

    const schema = `{
  "version": "1.0",
  "product": {
    "name": "string",
    "brand": "string",
    "concentration": "string",
    "sizes": ["string"]
  },
  "positioning_one_liner": "string (<= 140 chars, no metaphors)",
  "who_to_sell_to": ["bullet", "bullet"],
  "how_it_smells_fast": {
    "top": ["note", "note"],
    "heart": ["note", "note"],
    "base": ["note", "note"],
    "plain_english": ["bullet", "bullet"]
  },
  "why_it_sells": ["bullet", "bullet"],
  "best_use_cases": ["bullet", "bullet"],
  "price_positioning_tips": ["bullet", "bullet"],
  "objections_and_replies": [
    { "objection": "string", "reply": "string (<= 200 chars)" }
  ],
  "bundle_and_upsell_ideas": ["bullet", "bullet"],
  "sales_scripts": {
    "whatsapp_dm": ["line", "line"],
    "store_pitch": ["line", "line"]
  },
  "compliance": {
    "claims_made": ["string"],
    "unknowns": ["string"]
  }
}`;

    const userMsg = [
      "INPUT FACTS:",
      `- Fragrance name: ${fragrance_name}`,
      `- Brand: ${brand}`,
      `- Concentration: ${concentration}`,
      `- Sizes: ${normalizedSizes.join(", ")}`,
      `- Known notes (top): ${(known_notes.top || []).join(", ") || "NONE PROVIDED"}`,
      `- Known notes (heart): ${(known_notes.heart || []).join(", ") || "NONE PROVIDED"}`,
      `- Known notes (base): ${(known_notes.base || []).join(", ") || "NONE PROVIDED"}`,
      `- Inspiration/style reference: ${inspiration_or_style || "NONE PROVIDED"}`,
      "",
      "CONSTRAINTS:",
      `- Max bullets per section: ${maxBullets}`,
      "- No metaphors. No exaggeration. No performance claims.",
      inputHasNotes
        ? "- Notes in output must only use provided notes."
        : "- Notes were not provided. Set how_it_smells_fast.top/heart/base to empty arrays and include \"notes\" in compliance.unknowns.",
      "",
      "OUTPUT JSON SCHEMA (follow exactly):",
      schema,
    ].join("\n");

    const callModel = async (messages: { role: string; content: string }[]) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          temperature: 0.2,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = json?.error || json?.message || "AI request failed";
        throw new Error(msg);
      }
      return String(json?.choices?.[0]?.message?.content || "");
    };

    const firstContent = await callModel([
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ]);

    const parseAndValidate = (raw: string) => {
      const cleaned = stripCodeFences(raw);
      const parsed = JSON.parse(cleaned);
      const errs = validateBrief(parsed, { maxBullets, inputNotes: known_notes, inputHasNotes });
      return { parsed, errs, cleaned };
    };

    let parsedBrief: ResellerSalesBrief | null = null;
    let errs: string[] = [];
    try {
      const out = parseAndValidate(firstContent);
      errs = out.errs;
      if (errs.length === 0) parsedBrief = out.parsed as ResellerSalesBrief;
    } catch (e) {
      errs = [`Parse error: ${e instanceof Error ? e.message : String(e)}`];
    }

    if (!parsedBrief) {
      const repairMsg = [
        "Your previous output failed validation.",
        "Fix it and return corrected JSON only, matching the schema exactly.",
        "",
        "VALIDATION ERRORS:",
        ...errs.map((x) => `- ${x}`),
        "",
        "SCHEMA:",
        schema,
        "",
        "RULES REMINDER:",
        "- Use ONLY INPUT FACTS.",
        "- No performance claims (longevity/projection/hours).",
        inputHasNotes ? "- Notes must only use provided notes." : "- Notes arrays must be empty and unknowns must include \"notes\".",
      ].join("\n");

      const repaired = await callModel([
        { role: "system", content: system },
        { role: "user", content: userMsg },
        { role: "assistant", content: firstContent },
        { role: "user", content: repairMsg },
      ]);

      const out2 = parseAndValidate(repaired);
      if (out2.errs.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "Validation failed", details: out2.errs }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsedBrief = out2.parsed as ResellerSalesBrief;
    }

    const nextMetadata = {
      ...(metadata || {}),
      reseller_sales: {
        version: "1.0",
        generated_at: new Date().toISOString(),
        input_hash,
        content: parsedBrief,
      },
    };

    const { error: updateError } = await supabase.from("products").update({ metadata: nextMetadata }).eq("id", product_id);
    if (updateError) {
      return new Response(JSON.stringify({ success: false, error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, cached: false, input_hash, content: parsedBrief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[generate-reseller-sales-brief] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
