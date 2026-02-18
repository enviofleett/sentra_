
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { enrichProducts, buildCombos, describeDeal, RawProduct } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function streamTextAsSse(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunkSize = 80;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let i = 0; i < text.length; i += chunkSize) {
          const piece = text.slice(i, i + chunkSize);
          const payload = { choices: [{ delta: { content: piece } }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          await new Promise((r) => setTimeout(r, 0));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      messages,
      session_id,
      image_url,
      preferences,
      cart_context,
      product_context,
      page_url,
      browsing_history,
      assistant_starter,
      page_context,
    } = await req.json();

    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Verify User Subscription
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !authUser?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authenticatedUserId = authUser.id;

    // Check subscription
    const { data: hasSub } = await supabase.rpc('has_active_agent_subscription', { p_user_id: authenticatedUserId });
    const { data: isAdmin } = await supabase.rpc('has_role', { _role: 'admin', _user_id: authenticatedUserId });
    
    if (!hasSub && !isAdmin) {
      return new Response(
        JSON.stringify({ 
          error: "Subscription required", 
          code: "NO_SUBSCRIPTION",
          message: "You need an active Consultant Access Pass to use this service." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2.1 Persistence: Save User Message with context
    if (session_id && !assistant_starter && Array.isArray(messages) && messages.length > 0) {
        const lastUser = messages[messages.length - 1];
        const deriveSessionSubject = (raw: string) => {
          const cleaned = String(raw || "")
            .replace(/\s+/g, " ")
            .replace(/[*_`#>[\]()]/g, "")
            .trim();
          if (!cleaned) return "New Conversation";
          const firstSentence = cleaned.split(/[.!?\n]/)[0]?.trim() || cleaned;
          const words = firstSentence.split(" ").filter(Boolean).slice(0, 10);
          const subject = words.join(" ").trim();
          return subject || "New Conversation";
        };
        const userMsg = {
            session_id,
            role: 'user',
            content: lastUser?.content ?? "",
            image_url: image_url || null,
            product_id: product_context?.id ?? null,
            page_url: page_url || null,
            context: {
              product_context: product_context || null,
              cart_context: cart_context || null,
              browsing_history: Array.isArray(browsing_history) ? browsing_history : null,
              page_context: page_context && typeof page_context === "object" ? page_context : null,
            },
        };
        await supabase.from('consultant_messages').insert(userMsg);

        const lastUserTextForTitle = typeof lastUser?.content === "string" ? lastUser.content.trim() : "";
        const { data: existingSession } = await supabase
          .from("consultant_sessions")
          .select("title")
          .eq("id", session_id)
          .maybeSingle();

        const normalizedTitle = String(existingSession?.title || "").trim().toLowerCase();
        const shouldSetTitle = Boolean(lastUserTextForTitle) && (!normalizedTitle || normalizedTitle === "new conversation");
        const nextTitle = shouldSetTitle ? deriveSessionSubject(lastUserTextForTitle) : null;

        await supabase
          .from("consultant_sessions")
          .update({
            updated_at: new Date().toISOString(),
            ...(nextTitle ? { title: nextTitle } : {}),
          })
          .eq("id", session_id);
    }

    const STOPWORDS = new Set([
      "the","and","for","with","from","this","that","have","has","had","you","your","yours","their","they","them",
      "what","which","who","how","when","where","why","can","could","would","should","will","want","need","looking",
      "buy","purchase","recommend","recommendation","suggest","suggestion","please","help","show","give","tell",
      "perfume","fragrance","scent","smell","edp","edt","parfum","extrait","cologne","elixir",
      "men","man","male","women","woman","female","unisex","daily","office","party","date","night","budget","price",
      "under","over","between","cheap","best","top","good","nice","like","love","similar","alternative"
    ]);

    const lastUserText = (() => {
      if (!Array.isArray(messages)) return "";
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m?.role === "user" && typeof m?.content === "string") return m.content;
        if (m?.role === "user" && Array.isArray(m?.content)) {
          const t = m.content.find((x: any) => x?.type === "text" && typeof x?.text === "string");
          if (t?.text) return t.text;
        }
      }
      return "";
    })();

    const keywords = (() => {
      const cleaned = (lastUserText || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const parts = cleaned.split(" ").filter(Boolean);
      const out: string[] = [];
      const seen = new Set<string>();
      for (const p of parts) {
        if (p.length < 3) continue;
        if (STOPWORDS.has(p)) continue;
        if (seen.has(p)) continue;
        seen.add(p);
        out.push(p);
        if (out.length >= 3) break;
      }
      return out;
    })();

    const priceTier = (price: number | null | undefined) => {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) return "Unknown";
      if (p <= 15000) return "Budget";
      if (p <= 35000) return "Mid";
      if (p <= 70000) return "Premium";
      return "Luxury";
    };

    const normalizeGender = (g: any): "Men" | "Women" | "Unisex" | "Unknown" => {
      const s = String(g || "").toLowerCase().trim();
      if (s === "men" || s === "man" || s === "male") return "Men";
      if (s === "women" || s === "woman" || s === "female") return "Women";
      if (s === "unisex") return "Unisex";
      return "Unknown";
    };

    const capList = (arr: any, max: number) =>
      Array.isArray(arr) ? arr.map((x) => String(x)).filter(Boolean).slice(0, max) : [];

    const extractNotes = (metadata: any) => {
      const sn = metadata?.scentNotes;
      return {
        top: capList(sn?.top, 6),
        heart: capList(sn?.heart, 6),
        base: capList(sn?.base, 6),
      };
    };

    const formatCatalogItem = (p: any) => {
      const notes = extractNotes(p?.metadata);
      const topNotes = notes.top.length ? notes.top.join(", ") : "Unknown";
      const middleNotes = notes.heart.length ? notes.heart.join(", ") : "Unknown";
      const baseNotes = notes.base.length ? notes.base.join(", ") : "Unknown";
      const sizes = [p?.size].filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
      const stockQty = Number(p?.stock_quantity ?? 0);
      const stockStatus = stockQty > 0 ? "In Stock" : "Out of Stock";
      return [
        `Product ID: ${String(p.id).toLowerCase()}`,
        `Fragrance Name: ${p.name}`,
        `Brand: ${p.brand || "Unknown"}`,
        `Category (Men / Women / Unisex): ${normalizeGender(p.gender)}`,
        `Fragrance Family: ${p.scent_profile || "Unknown"}`,
        `Top Notes: ${topNotes}`,
        `Middle Notes: ${middleNotes}`,
        `Base Notes: ${baseNotes}`,
        `Price Tier: ${priceTier(p.price)}`,
        `Stock Status: ${stockStatus}`,
        `Best For: Unknown`,
        `Tags: Unknown`,
        sizes.length ? `Size(s): ${sizes.join(", ")}` : `Size(s): Unknown`,
      ].join("\n");
    };

    const baseSelect =
      "id, name, brand, price, cost_price, stock_quantity, scent_profile, gender, size, active_group_buy_id, metadata, price_intelligence (average_market_price, lowest_market_price, highest_market_price)";
    let keywordMatches: RawProduct[] = [];
    if (keywords.length > 0) {
      const orParts: string[] = [];
      for (const kw of keywords) {
        const like = `%${kw}%`;
        orParts.push(`name.ilike.${like}`);
        orParts.push(`brand.ilike.${like}`);
        orParts.push(`scent_profile.ilike.${like}`);
      }
      const { data } = await supabase
        .from("products")
        .select(baseSelect as any)
        .eq("is_active", true)
        .or(orParts.join(","))
        .order("stock_quantity", { ascending: false })
        .limit(25);
      keywordMatches = (data as any) || [];
    }

    const picked = new Map<string, any>();
    for (const p of keywordMatches) picked.set(String(p.id).toLowerCase(), p);

    const { data: topStock } = await supabase
      .from("products")
      .select(baseSelect as any)
      .eq("is_active", true)
      .order("stock_quantity", { ascending: false })
      .limit(80);

    for (const p of topStock || []) {
      if (picked.size >= 40) break;
      const pid = String(p.id).toLowerCase();
      if (!picked.has(pid)) picked.set(pid, p);
    }

    const catalogSlice = Array.from(picked.values()).slice(0, 40) as RawProduct[];
    const enriched = enrichProducts(catalogSlice);
    const combos = buildCombos(enriched, 40).slice(0, 10);
    const topDealsNarratives: string[] = [];
    for (const combo of combos) {
      const items = combo.productIds
        .map((id) => enriched.find((p) => p.id.toLowerCase() === id.toLowerCase()))
        .filter((p): p is ReturnType<typeof enrichProducts>[number] => !!p);
      if (items.length === 0) continue;
      const narrative = describeDeal({ items, combo });
      topDealsNarratives.push(narrative);
    }
    const allowedIds = new Set<string>(catalogSlice.map((p: any) => String(p.id).toLowerCase()));
    const catalogText =
      "CATALOG (ONLY SOURCE OF RECOMMENDATIONS):\n\n" +
      enriched
        .map((p) => formatCatalogItem(p as any))
        .join("\n\n---\n\n");

    const pref = preferences || {};
    const prefLine = [
      pref.language ? `Language: ${pref.language}` : null,
      pref.budget ? `Budget: ${pref.budget}` : null,
      pref.mode ? `Mode: ${pref.mode}` : null,
    ].filter(Boolean).join(" | ");

    const detectIntent = (text: string): "business" | "recommendation" => {
      const t = (text || "").toLowerCase();
      const businessRx =
        /\b(margin|profit|pricing|price|wholesale|resell|reseller|inventory|stock|supplier|packaging|branding|decant|decants|oil\s*perfume|spray|scaling|influencer|marketing|ads|sell|sales|start|business)\b/;
      return businessRx.test(t) ? "business" : "recommendation";
    };

    const extractSlots = (msgs: any[]) => {
      const allUserText = (Array.isArray(msgs) ? msgs : [])
        .filter((m: any) => m?.role === "user")
        .map((m: any) => {
          if (typeof m?.content === "string") return m.content;
          if (Array.isArray(m?.content)) {
            const t = m.content.find((x: any) => x?.type === "text" && typeof x?.text === "string");
            return t?.text || "";
          }
          return "";
        })
        .join(" \n ")
        .toLowerCase();

      const hasPurpose =
        /\b(resale|resell|reseller|for\s+sale|to\s+sell|business)\b/.test(allUserText) ||
        /\bpersonal\s+use\b/.test(allUserText);
      const hasGender = /\b(men|male|man|women|female|woman|unisex)\b/.test(allUserText);
      const hasOccasion =
        /\b(daily|everyday|office|work|church|mosque|wedding|party|date\s*night|date|signature|special|event)\b/.test(
          allUserText,
        );
      const hasBudget =
        /\b(₦|ngn|naira)\s*\d[\d,]*/.test(allUserText) ||
        /\bunder\s+\d[\d,]*\b/.test(allUserText) ||
        /\bbetween\s+\d[\d,]*\s*(and|to)\s*\d[\d,]*\b/.test(allUserText);
      const hasStyle =
        /\b(sweet|fresh|woody|spicy|gourmand|floral|oriental|amber|citrus|clean|powdery|musky|vanilla)\b/.test(
          allUserText,
        );

      const hasTargetAudience =
        /\b(target\s+audience|customers?|buyers?|students?|professionals?|men|women|unisex)\b/.test(allUserText);
      const hasSalesModel =
        /\b(wholesale|retail|decant|decants|oil\s*perfume|spray|online|offline|instagram|whatsapp|store|shop)\b/.test(
          allUserText,
        );
      const hasExperience =
        /\b(beginner|new|starting|experienced|intermediate|advanced|i\s+sell|i\s+sell\s+already)\b/.test(allUserText);

      return {
        allUserText,
        // recommendation slots
        hasPurpose,
        hasGender,
        hasOccasion,
        hasBudget,
        hasStyle,
        // business slots
        hasTargetAudience,
        hasSalesModel,
        hasExperience,
      };
    };

    const buildIntakeQuestions = (intent: "business" | "recommendation", slots: ReturnType<typeof extractSlots>) => {
      const qs: string[] = [];
      if (intent === "business") {
        if (!slots.hasTargetAudience) qs.push("Who are you selling to (men/women/unisex, age range, and your city)?");
        if (!slots.hasBudget) qs.push("What is your starting budget for inventory (₦ range)?");
        if (!slots.hasSalesModel)
          qs.push("What sales model are you using (retail, wholesale, decants, oil perfumes)? Online or offline?");
        if (!slots.hasExperience) qs.push("Are you just starting, or have you sold perfumes before?");
        return qs.slice(0, 4);
      }
      if (!slots.hasPurpose) qs.push("Is this for personal use or resale?");
      if (!slots.hasGender) qs.push("Men, women, or unisex?");
      if (!slots.hasOccasion) qs.push("Daily wear or special occasions (office, party, date night, signature)?");
      if (!slots.hasBudget) qs.push("What budget range (₦)?");
      if (!slots.hasStyle) qs.push("What style do you want: sweet, fresh, woody, spicy, floral, gourmand?");
      return qs.slice(0, 4);
    };

    const intent = detectIntent(lastUserText);
    const slots = extractSlots(messages);
    const intakeQs = buildIntakeQuestions(intent, slots);

    const safeProductContext = product_context && typeof product_context === "object" ? product_context : null;
    const safeHistory = Array.isArray(browsing_history) ? browsing_history : [];
    const safePageContext = page_context && typeof page_context === "object"
      ? page_context as Record<string, unknown>
      : null;

    const toStringArray = (value: unknown, max = 5): string[] =>
      Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, max) : [];

    const productContextLines = (() => {
      if (!safeProductContext) return "";
      const parts: string[] = [];
      if (safeProductContext.name || safeProductContext.brand) {
        parts.push(
          `Name: ${(safeProductContext.brand ? safeProductContext.brand + " " : "") + (safeProductContext.name || "")}`.trim(),
        );
      }
      if (safeProductContext.category) parts.push(`Category: ${safeProductContext.category}`);
      if (typeof safeProductContext.price === "number") parts.push(`Price: ₦${safeProductContext.price.toLocaleString()}`);
      if (safeProductContext.attributes && typeof safeProductContext.attributes === "object") {
        const scent = (safeProductContext.attributes as any).scent_profile;
        if (scent) parts.push(`Scent Profile: ${scent}`);
      }
      if (safeProductContext.url) parts.push(`Page: ${safeProductContext.url}`);
      return parts.length ? `CURRENT PRODUCT CONTEXT\n${parts.join("\n")}\n\n` : "";
    })();

    const historyLines = (() => {
      if (!safeHistory.length) return "";
      const items = safeHistory.slice(-10).map((p: any, idx: number) => {
        const label = [p.brand, p.name].filter(Boolean).join(" ");
        const price =
          typeof p.price === "number"
            ? ` — ₦${Number(p.price).toLocaleString()}`
            : "";
        return `${idx + 1}. ${label || p.id || "Unknown"}${price}`;
      });
      return items.length
        ? `USER BROWSING HISTORY (MOST RECENT FIRST)\n${items.join("\n")}\n\n`
        : "";
    })();

    const pageContextLines = (() => {
      if (!safePageContext) return "";
      const lines: string[] = [];
      const title = String(safePageContext.title || "").trim();
      const path = String(safePageContext.path || "").trim();
      const headings = toStringArray(safePageContext.headings);
      const actions = toStringArray(safePageContext.primaryActions);
      const visibleErrors = toStringArray(safePageContext.visibleErrors);
      const runtimeErrors = toStringArray(safePageContext.recentRuntimeErrors);

      if (title) lines.push(`Title: ${title}`);
      if (path) lines.push(`Path: ${path}`);
      if (headings.length) lines.push(`Headings: ${headings.join(" | ")}`);
      if (actions.length) lines.push(`Primary actions: ${actions.join(" | ")}`);
      if (visibleErrors.length) lines.push(`Visible errors: ${visibleErrors.join(" | ")}`);
      if (runtimeErrors.length) lines.push(`Runtime errors: ${runtimeErrors.join(" | ")}`);

      return lines.length ? `PAGE CONTEXT\n${lines.join("\n")}\n\n` : "";
    })();

    const systemPrompt = `ROLE
You are Iris, a professional fragrance consultant and perfume business advisor working exclusively for Sentra.
You:
Help users choose fragrances from our catalog only.
Help entrepreneurs build and grow perfume businesses.
Provide education about fragrance types, notes, and positioning.
Speak in a friendly, polite, professional tone.
Focus on practical and actionable guidance.
Never recommend or reference fragrances outside our catalog.

PRIMARY OBJECTIVE
Your primary job is to give business advice and guide resellers to make the best decision (profit, sell-through, positioning, and inventory risk).
If the user is buying for personal use, keep it practical but include a brief resale angle when relevant.

CORE RULES
You must ONLY recommend fragrances that exist inside the provided catalog.
If a user asks for a perfume not in the catalog:
Politely inform them it is not currently available.
Suggest the closest alternative from our catalog.
Do not invent fragrances.
Do not hallucinate SKUs, notes, or availability.
If information is missing, ask clarifying questions before recommending.
Always aim to guide toward a purchase or business decision.

CATALOG ACCESS
You will receive a structured catalog in this format:
Fragrance Name
Brand
Category (Men / Women / Unisex)
Fragrance Family
Top Notes
Middle Notes
Base Notes
Price Tier
Stock Status
Best For
Tags
You may only recommend from this list.
When recommending a product, always include its Product ID exactly as shown in the catalog.

CONSULTATION FLOW
If User Wants a Fragrance Recommendation
Ask 2–4 clarifying questions:
- Is this for personal use or resale?
- Male, female, or unisex?
- Daily wear or special occasions?
- Budget range?
- Sweet, fresh, woody, spicy?
Narrow to 3 strong options from the catalog.
For each fragrance include:
- Product ID
- Short positioning statement
- Why it fits their need
- Who typically buys it
- Business resale angle (if relevant)
Offer a next step:
- Add to cart
- Request wholesale pricing
- Compare two options
- Build a starter bundle

If User Is Building a Perfume Business
Ask about:
- Target audience
- Budget
- Sales model (retail / wholesale / decants / oil perfumes)
- Online or offline
- Experience level
Provide:
- Starter fragrance mix (from catalog only)
- Suggested pricing strategy
- Simple margin explanation
- Best-seller positioning
- Upsell strategy
- Inventory planning advice
Encourage:
- Starting with 5–10 strong SKUs
- Mix of crowd pleasers + signature scents
- Repeat purchase drivers

SHIPPING AND CHECKOUT GUIDANCE
When the user asks about delivery, shipping fees, checkout, or placing an order:
- Explain that shipping is calculated at checkout based on cart weight, vendor, and the delivery region.
- Remind them that shipping is only calculated after they choose a shipping address on the checkout page.
- Explain that they can ship everything to one address, or split items to multiple addresses if they want.
- In single-address mode, all items go to one address and shipping is calculated once for the full cart.
- In multi-address mode, items are assigned to separate shipments and shipping is calculated per shipment, then added together.
- Make it clear that shipping is not free unless the store explicitly shows a free-shipping promotion.
- Do not invent exact shipping prices. If the user has not told you what they see on their screen, say “shipping will be calculated at checkout based on your address.”
- If the user shares the shipping total they see, you may use that number to explain the logic in simple terms.
- Mention that checkout will not proceed if the store’s minimum order quantity is not met. In that case, advise them to add a few more units.
- When guiding checkout, walk them step by step: confirm cart items, choose or add address, review shipping and tax, then continue to payment.
- Explain that payment happens on a secure Paystack page and you never see their card details. Focus on reassuring them about safety and what to expect on each screen.

LIVE CART CONTEXT (WHEN PROVIDED)
Sometimes you will receive a short summary of the user’s current cart and checkout state.
It will be provided in plain text under this heading:

LIVE CART SNAPSHOT
<cart summary here>

When present:
- Treat it as the single source of truth for their items, quantities, subtotal, shipping cost, and mode (single or multi address).
- If a shipping total is given (for example “Shipping: ₦4,500 (single-address to Lagos)”), you may use that exact number in your explanation.
- Help the user understand why the total looks that way, using simple language tied to weight, vendors, and region.
- Do not change or “fix” the numbers. Explain them and guide next actions (adjust cart, change address, proceed to payment).
- If there is no live cart snapshot, fall back to general guidance and do not guess exact amounts.

BUSINESS ADVISOR MODE
When asked about margins, branding, packaging, decants, scaling, influencer marketing:
- Use structured bullet points
- Clear cost vs revenue logic
- Realistic advice
- No exaggeration
- No generic motivation talk
- Focus on execution

TONE AND LANGUAGE
Polite. Professional. Friendly. Confident. Clear. Not robotic. Not overly casual.
Use very simple English, roughly 5th-grade level.
Prefer short sentences and everyday words.
Avoid technical terms like "margin", "ROI", "optimize", "conversion".
Avoid percentages in explanations; use counts and simple money comparisons instead.
When explaining deals, use vivid pictures and stories. Say things like:
- "Imagine getting two bottles for the price you usually pay for one and a half."
- "Picture a shelf where this scent brings people back again and again."
Make the user feel like you are beside them in a small shop, talking plainly.

PRODUCT CONTEXT AND HISTORY
Use the current product and the user's browsing history as strong hints:
- If a current product is provided, anchor your advice and suggestions around it first.
- If browsing history is provided, look for patterns (brands, price levels, scent families) and reflect them in your recommendations.
- Do not assume you see the full history; treat it as a helpful sample only.

PRODUCT SUGGESTION FORMAT
When you recommend specific products, always:
- Keep your explanation in normal sentences.
- In addition, include one or more blocks formatted exactly like this:

[PRODUCT_CARD]
id: <Product ID from catalog>
name: <Fragrance Name>
price: <Price with currency symbol if known>
image: <Image URL if provided, otherwise leave blank>
reason: <One or two short sentences explaining why it fits, tied to their needs or history>
[/PRODUCT_CARD]

Rules:
- The id must always be a Product ID from the catalog section.
- The reason must be specific (mention season, style, price, or business use).
- You may include up to 5 PRODUCT_CARD blocks in a single response.
- Never invent IDs or prices; only use what you see in the catalog or cart snapshot.

416→User preferences: ${prefLine || "none"}

${productContextLines}${historyLines}${pageContextLines}${
      cart_context?.summary ? `LIVE CART SNAPSHOT\n${cart_context.summary}\n\n` : ""
    }TOP DEAL SNAPSHOTS
The following lines describe some of the best-value single products and bundles based on price, savings, stock, and margin.
Use them as hints when you recommend or build bundles. Rewrite them in your own words, do not copy them exactly:

${topDealsNarratives.map((t) => `- ${t}`).join("\n")}
`;

    const userMessageCount = Array.isArray(messages)
      ? messages.filter((m: { role?: string }) => m?.role === "user").length
      : 0;
    const isConversationStart = userMessageCount <= 1;

    // Enforce "intake first": do not recommend until key context is provided.
    if (assistant_starter) {
      const pageTitle = String(safePageContext?.title || "this page").trim();
      const pagePath = String(safePageContext?.path || page_url || "").trim();
      const visibleErrors = toStringArray(safePageContext?.visibleErrors);
      const runtimeErrors = toStringArray(safePageContext?.recentRuntimeErrors);
      const topError = visibleErrors[0] || runtimeErrors[0] || "";
      const contextLine = pagePath && pagePath !== pageTitle ? `${pageTitle} (${pagePath})` : pageTitle;
      const isConsultantRoute = pagePath.startsWith("/consultant");

      const starterText = isConsultantRoute
        ? [
            "Hi, I’m Iris.",
            "Welcome.",
            "How can I help you today?",
          ].join("\n\n")
        : [
            "Hi, I’m Iris.",
            `I can see you're on ${contextLine}.`,
            topError ? `I noticed this issue on the page: "${topError}".` : null,
            "Are you having any challenge on this page?",
            "What were you trying to do, and what happened when you clicked?",
          ]
            .filter(Boolean)
            .join("\n\n");

      if (session_id && starterText) {
        await supabase.from("consultant_messages").insert({
          session_id,
          role: "assistant",
          content: starterText,
          product_id: safeProductContext?.id ?? null,
          page_url: page_url || null,
          context: {
            product_context: safeProductContext || null,
            cart_context: cart_context || null,
            browsing_history: safeHistory.length ? safeHistory : null,
            page_context: safePageContext || null,
          },
        });
      }

      return new Response(streamTextAsSse(starterText), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (intakeQs.length > 0) {
      if (isConversationStart) {
        const welcomeText = [
          "Hi, I’m Iris.",
          "How can I help you today?",
          "Tell me what you want to solve, and I’ll guide you step by step.",
        ].join("\n\n");

        if (session_id) {
          await supabase.from("consultant_messages").insert({
            session_id,
            role: "assistant",
            content: welcomeText,
            product_id: safeProductContext?.id ?? null,
            page_url: page_url || null,
            context: {
              product_context: safeProductContext || null,
              cart_context: cart_context || null,
              browsing_history: safeHistory.length ? safeHistory : null,
              page_context: safePageContext || null,
            },
          });
        }

        return new Response(streamTextAsSse(welcomeText), {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      const intro =
        intent === "business"
          ? "Before I advise you, I need a few details so the plan fits your business."
          : "Before I recommend from our catalog, I need a few details so the picks are accurate.";
      const finalText = [intro, "", ...intakeQs.map((q, i) => `${i + 1}. ${q}`), "", "Reply with your answers and I’ll proceed."].join("\n");

      if (session_id && finalText) {
        await supabase.from("consultant_messages").insert({
          session_id,
          role: "assistant",
          content: finalText,
          product_id: safeProductContext?.id ?? null,
          page_url: page_url || null,
          context: {
            product_context: safeProductContext || null,
            cart_context: cart_context || null,
            browsing_history: safeHistory.length ? safeHistory : null,
            page_context: safePageContext || null,
          },
        });
      }

      return new Response(streamTextAsSse(finalText), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // 5. Prepare Messages for OpenRouter (Multimodal Support)
    // Gemini supports image_url in content array
    const openRouterMessages = [
        { role: "system", content: systemPrompt },
        { role: "system", content: catalogText },
        ...messages.map((msg: any) => {
            // Transform legacy string content to array if needed, or handle image_url if present
            if (msg.role === 'user' && msg.image_url) {
                return {
                    role: 'user',
                    content: [
                        { type: 'text', text: msg.content },
                        { type: 'image_url', image_url: { url: msg.image_url } }
                    ]
                };
            }
            return msg;
        })
    ];

    // 6. Call OpenRouter API (non-streaming). We'll emit SSE ourselves after applying the catalog-only guard.
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) throw new Error("Missing OpenRouter Key");

    // Expanded model list including non-Google models as fallbacks
    const modelsToTry = [
        "google/gemini-2.0-flash-001", 
        "google/gemini-pro-1.5",
        "meta-llama/llama-3-70b-instruct", // Robust fallback
        "mistralai/mixtral-8x7b-instruct" // Fast fallback
    ];
    
    let response;
    let lastError;

    // Helper for exponential backoff
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2; // Retry each model twice

        while (attempts < maxAttempts) {
            try {
                attempts++;
                console.log(`Trying model: ${model} (Attempt ${attempts}/${maxAttempts})`);
                
                response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "HTTP-Referer": "https://sentra.shop",
                        "X-Title": "Sentra Scent Shop",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: openRouterMessages,
                        stream: false,
                        temperature: 0.7,
                    }),
                });

                if (response.ok) {
                    console.log(`Model ${model} connected successfully.`);
                    break; 
                }
                
                const errText = await response.text();
                console.error(`Model ${model} failed (Attempt ${attempts}): ${response.status} ${errText}`);
                
                // If 401 Unauthorized, break immediately - key is invalid, retries won't help
                if (response.status === 401) {
                    throw new Error(`Authentication failed (401): ${errText}`);
                }

                // If 502/Clerk Auth error, this is a service/account issue. Fail fast.
                if (response.status === 502 && errText.includes("Clerk")) {
                     throw new Error(`OpenRouter Service Error (502): Please check API Key or Credits. (${errText})`);
                }

                lastError = `OpenRouter API Error (${model}): ${response.status} - ${errText}`;
                
                // Wait before retry (exponential backoff: 1s, 2s...)
                if (attempts < maxAttempts) await delay(attempts * 1000);

            } catch (e: any) {
                console.error(`Network error with model ${model}:`, e);
                lastError = e.message;
                
                // Don't retry on fatal auth errors
                if (e.message.includes("Authentication failed") || e.message.includes("Clerk")) {
                    throw e;
                }

                if (attempts < maxAttempts) await delay(attempts * 1000);
            }
        }
        
        if (response && response.ok) break; // Exit model loop if successful
    }

    if (!response || !response.ok) {
        throw new Error(lastError || "All AI models failed to respond.");
    }

    const respJson = await response.json().catch(() => ({}));
    let finalText: string = String(respJson?.choices?.[0]?.message?.content || "");

    const extractUuids = (text: string): string[] => {
      const rx =
        /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;
      return (text.match(rx) || []).map((x) => x.toLowerCase());
    };

    const hasInvalidCatalogIds = (text: string) => {
      const ids = extractUuids(text);
      for (const id of ids) {
        if (!allowedIds.has(id)) return { invalid: true as const, ids, invalidId: id };
      }
      return { invalid: false as const, ids };
    };

    // Guard pass: if model output contains out-of-catalog product IDs, do one rewrite.
    const guard1 = hasInvalidCatalogIds(finalText);
    if (guard1.invalid) {
      console.warn(`[ai-business-consultant] Guard triggered. Invalid id: ${guard1.invalidId}`);
      const allowedList = Array.from(allowedIds.values()).join(", ");
      const rewriteUser = [
        "Rewrite your previous response to recommend ONLY fragrances that exist in the provided catalog.",
        "Strict rules:",
        "- Do not mention any fragrance outside the catalog.",
        "- For each recommendation, include: Product ID, Fragrance Name, and short reasoning.",
        `- Use only these Product IDs: ${allowedList}`,
        "",
        "Return normal text (not JSON). Short sentences and bullet points.",
      ].join("\n");

      const rewriteResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://sentra.shop",
          "X-Title": "Sentra Scent Shop",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelsToTry[0],
          messages: [
            { role: "system", content: systemPrompt },
            { role: "system", content: catalogText },
            ...openRouterMessages.filter((m: any) => m.role !== "system"),
            { role: "assistant", content: finalText },
            { role: "user", content: rewriteUser },
          ],
          stream: false,
          temperature: 0.2,
        }),
      });

      if (rewriteResp.ok) {
        const rewriteJson = await rewriteResp.json().catch(() => ({}));
        const rewritten = String(rewriteJson?.choices?.[0]?.message?.content || "");
        const guard2 = hasInvalidCatalogIds(rewritten);
        if (!guard2.invalid) {
          finalText = rewritten;
        } else {
          finalText = [
            "We don’t currently carry that exact fragrance in our catalog.",
            "Quick questions so I can recommend the closest in-catalog alternatives:",
            "1. Is this for personal use or resale?",
            "2. Men, women, or unisex?",
            "3. Daily wear or special occasions?",
            "4. Budget range (in ₦)?",
            "Reply with those and I’ll give 3 strong options from our catalog only.",
          ].join("\n");
        }
      }
    }

    // Save final assistant response to DB
    if (session_id && finalText) {
      await supabase.from('consultant_messages').insert({
        session_id,
        role: 'assistant',
        content: finalText,
        product_id: safeProductContext?.id ?? null,
        page_url: page_url || null,
        context: {
          product_context: safeProductContext || null,
          cart_context: cart_context || null,
          browsing_history: safeHistory.length ? safeHistory : null,
          page_context: safePageContext || null,
        },
      });
    }

    // Emit SSE in the same delta format the client expects.
    const encoder = new TextEncoder();
    const chunkSize = 80;
    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (let i = 0; i < finalText.length; i += chunkSize) {
            const piece = finalText.slice(i, i + chunkSize);
            const payload = { choices: [{ delta: { content: piece } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            await new Promise((r) => setTimeout(r, 0));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
          console.error("SSE stream error:", e);
          controller.enqueue(encoder.encode(`data: {"error":"Stream interrupted"}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });

  } catch (error: any) {
    console.error("Error in ai-business-consultant:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
