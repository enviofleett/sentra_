import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SourcePrice {
  store: string;
  price: number;
  url: string;
  currency: "NGN";
  matched_size: boolean;
  evidence: string;
}

interface Body {
  product_id?: string;
  product_name: string;
  size?: string; // "100ml", "50 ml", "3.4 oz"
  limit?: number; // search results limit
  force?: boolean; // bypass cache
}

function normalizeSizeToken(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const lower = s.toLowerCase().replace(/\s+/g, "");

  const ozMatch = lower.match(/(\d+(?:\.\d+)?)(?:fl)?oz/);
  if (ozMatch) {
    const oz = Number(ozMatch[1]);
    if (!Number.isFinite(oz) || oz <= 0) return s;
    let ml = Math.round(oz * 29.5735);
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

function textMentionsSize(text: string, normalizedSize: string): boolean {
  if (!normalizedSize) return true;
  const t = (text || "").toLowerCase();
  const size = normalizedSize.toLowerCase();
  if (size.endsWith("ml")) {
    const ml = size.replace("ml", "");
    // match "100ml", "100 ml", "100ML"
    const rx = new RegExp(`\\b${ml}\\s*ml\\b`, "i");
    return rx.test(t);
  }
  return t.includes(size);
}

// Extract prices from text using regex patterns (NGN only).
function extractPrices(text: string): number[] {
  const prices: number[] = [];
  const nairaPatterns = [
    /₦\s*([\d,]+(?:\.\d{2})?)/gi,
    /NGN\s*([\d,]+(?:\.\d{2})?)/gi,
    /\bN\s*([\d,]+(?:\.\d{2})?)\b/gi,
    /([\d,]+(?:\.\d{2})?)\s*(?:naira|NGN)\b/gi,
  ];

  for (const pattern of nairaPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseFloat(priceStr);
      if (price >= 1000 && price <= 10000000) prices.push(price);
    }
  }
  return prices;
}

function extractStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const cleaned = hostname.replace(/^(www\.|shop\.|store\.)/i, "");
    const parts = cleaned.split(".");
    if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return cleaned;
  } catch {
    return "Unknown Store";
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

function computeBand(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { filtered: [], p25: null as number | null, p50: null as number | null, p75: null as number | null };
  }

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const filtered = sorted.filter((p) => p >= low && p <= high);
  const sortedF = filtered.length ? filtered : sorted;

  return {
    filtered: sortedF,
    p25: Math.round(quantile(sortedF, 0.25) * 100) / 100,
    p50: Math.round(quantile(sortedF, 0.5) * 100) / 100,
    p75: Math.round(quantile(sortedF, 0.75) * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!firecrawlApiKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Service configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth?.user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = auth.user.id;
    const { data: hasSub } = await supabase.rpc("has_active_agent_subscription", { p_user_id: authenticatedUserId });
    const { data: isAdmin } = await supabase.rpc("has_role", { _role: "admin", _user_id: authenticatedUserId });
    if (!hasSub && !isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Subscription required",
          code: "NO_SUBSCRIPTION",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    const product_id = body.product_id ? String(body.product_id).trim() : null;
    const product_name = String(body.product_name || "").trim();
    const requestedSizeRaw = body.size ? String(body.size).trim() : "";
    const requestedSize = normalizeSizeToken(requestedSizeRaw);
    const limit = Math.max(5, Math.min(20, Number(body.limit || 15)));
    const force = body.force === true;

    if (!product_name) {
      return new Response(JSON.stringify({ success: false, error: "product_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache hit
    if (product_id && !force) {
      const { data: intel } = await supabase
        .from("price_intelligence")
        .select("average_market_price, lowest_market_price, highest_market_price, competitor_data, last_scraped_at")
        .eq("product_id", product_id)
        .maybeSingle();

      // Consider cache valid for 7 days.
      if (intel?.last_scraped_at) {
        const ageMs = Date.now() - new Date(intel.last_scraped_at).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (ageMs >= 0 && ageMs < sevenDays) {
          return new Response(
            JSON.stringify({
              success: true,
              cached: true,
              scanned_at: intel.last_scraped_at,
              currency: "NGN",
              stats: {
                p25: null,
                p50: intel.average_market_price,
                p75: null,
                min: intel.lowest_market_price,
                max: intel.highest_market_price,
                count: Array.isArray(intel.competitor_data) ? intel.competitor_data.length : 0,
              },
              sources: intel.competitor_data || [],
              note: "Cache hit (quartiles not stored on price_intelligence). Run with force=true to recompute p25/p75.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const queryParts = [
      product_name,
      requestedSize ? requestedSize : null,
      "price",
      "Nigeria",
      "₦",
      "NGN",
    ].filter(Boolean);
    const searchQuery = queryParts.join(" ");

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit,
        lang: "en",
        country: "ng",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResponse.json().catch(() => ({}));
    if (!searchResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: searchData.error || "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = Array.isArray(searchData.data) ? searchData.data : [];
    const sources: SourcePrice[] = [];
    const allPrices: number[] = [];

    for (const result of results) {
      const url = String(result.url || result.sourceURL || "");
      if (!url) continue;

      const text = `${result.title || ""} ${result.description || ""} ${result.markdown || ""}`;
      const matchedSize = textMentionsSize(text, requestedSize);
      if (requestedSize && !matchedSize) {
        // If size is specified, only accept sources that mention it.
        continue;
      }

      const prices = extractPrices(text);
      if (prices.length === 0) continue;

      const store = extractStoreName(url);
      const price = prices[0];
      allPrices.push(price);

      const evidence = text.replace(/\s+/g, " ").slice(0, 240);
      sources.push({
        store,
        price,
        url,
        currency: "NGN",
        matched_size: matchedSize,
        evidence,
      });
    }

    if (allPrices.length === 0) {
      // Still upsert with empty competitor list if product_id exists.
      if (product_id) {
        await supabase
          .from("price_intelligence")
          .upsert(
            {
              product_id,
              average_market_price: null,
              lowest_market_price: null,
              highest_market_price: null,
              competitor_data: [],
              last_scraped_at: new Date().toISOString(),
            },
            { onConflict: "product_id" },
          );
      }

      return new Response(
        JSON.stringify({
          success: true,
          cached: false,
          scanned_at: new Date().toISOString(),
          currency: "NGN",
          stats: { count: 0, p25: null, p50: null, p75: null, min: null, max: null },
          sources: [],
          message: "No competitor prices found (try force=false with cached intelligence, or adjust size/query).",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const band = computeBand(allPrices);
    const filtered = band.filtered;
    const min = filtered[0];
    const max = filtered[filtered.length - 1];
    const mean = Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 100) / 100;

    // For storage, keep a compact competitor_data structure compatible with existing code.
    const competitorData = sources.map((s) => ({ store: s.store, price: s.price, url: s.url, currency: s.currency }));

    if (product_id) {
      await supabase
        .from("price_intelligence")
        .upsert(
          {
            product_id,
            average_market_price: band.p50,
            lowest_market_price: min,
            highest_market_price: max,
            competitor_data: competitorData,
            last_scraped_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        product_id,
        product_name,
        requested_size: requestedSize || null,
        scanned_at: new Date().toISOString(),
        query: searchQuery,
        currency: "NGN",
        stats: {
          count: filtered.length,
          p25: band.p25,
          p50: band.p50,
          p75: band.p75,
          min,
          max,
          mean,
        },
        sources,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[search-market-prices-ng] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

