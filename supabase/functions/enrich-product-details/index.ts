import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  description: string;
  gender: "Men" | "Women" | "Unisex";
  brand: string;
  size: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, product_name } = await req.json();

    if (!product_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, error: "product_id and product_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[enrich-product-details] Starting enrichment for: ${product_name} (${product_id})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlApiKey) {
      console.error("[enrich-product-details] FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      console.error("[enrich-product-details] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Search for product info using Firecrawl
    console.log(`[enrich-product-details] Searching for product info...`);
    const searchQuery = `${product_name} perfume fragrance description notes size ml`;
    
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[enrich-product-details] Firecrawl search failed: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: "Web search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    console.log(`[enrich-product-details] Found ${searchData.data?.length || 0} search results`);

    // Compile search results into context
    let searchContext = "";
    if (searchData.data && searchData.data.length > 0) {
      for (const result of searchData.data) {
        searchContext += `\n--- Source: ${result.url} ---\n`;
        searchContext += result.markdown?.substring(0, 2000) || result.description || "";
        searchContext += "\n";
      }
    }

    if (!searchContext.trim()) {
      searchContext = "No web search results found. Generate based on the product name alone.";
    }

    // Step 2: Use AI to analyze and generate product details
    console.log(`[enrich-product-details] Sending to AI for analysis...`);
    
    const aiPrompt = `You are a luxury fragrance expert. Analyze the following search results about "${product_name}" and extract/generate product details.

SEARCH RESULTS:
${searchContext}

Based on the above information, provide the following in JSON format:
{
  "description": "A 2-sentence luxury marketing description for this fragrance. Be evocative and appealing.",
  "gender": "Men" or "Women" or "Unisex" (determine the target audience),
  "brand": "The brand name extracted from the product name (e.g., 'Dior' from 'Dior Sauvage')",
  "size": "The size if found (e.g., '100ml', '3.4oz'), or 'N/A' if not found"
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a luxury fragrance expert assistant. Always respond with valid JSON only." },
          { role: "user", content: aiPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      console.error(`[enrich-product-details] AI request failed: ${aiError}`);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "AI rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log(`[enrich-product-details] AI response received, parsing...`);

    // Parse the AI response
    let enrichment: EnrichmentResult;
    try {
      // Clean up potential markdown code blocks
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      enrichment = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`[enrich-product-details] Failed to parse AI response: ${aiContent}`);
      // Fallback to basic enrichment
      enrichment = {
        description: `${product_name} - A sophisticated fragrance for discerning tastes. Experience luxury in every spray.`,
        gender: "Unisex",
        brand: product_name.split(" ")[0] || "Unknown",
        size: "N/A",
      };
    }

    // Step 3: Find matching category based on gender
    console.log(`[enrich-product-details] Finding category for gender: ${enrichment.gender}`);
    
    let categoryId: string | null = null;
    const genderLower = enrichment.gender?.toLowerCase() || "unisex";
    
    // Try to find a category matching the gender
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true);

    if (categories && categories.length > 0) {
      // Look for category with gender in name
      const matchingCategory = categories.find(c => {
        const nameLower = c.name.toLowerCase();
        if (genderLower === "men" || genderLower === "male") {
          return nameLower.includes("men") || nameLower.includes("male") || nameLower.includes("homme");
        }
        if (genderLower === "women" || genderLower === "female") {
          return nameLower.includes("women") || nameLower.includes("female") || nameLower.includes("femme");
        }
        return nameLower.includes("unisex") || nameLower.includes("all");
      });

      if (matchingCategory) {
        categoryId = matchingCategory.id;
        console.log(`[enrich-product-details] Found matching category: ${matchingCategory.name}`);
      } else {
        // Fall back to first available category
        categoryId = categories[0].id;
        console.log(`[enrich-product-details] Using default category: ${categories[0].name}`);
      }
    }

    // Step 4: Update the product
    console.log(`[enrich-product-details] Updating product in database...`);
    
    const updateData: Record<string, any> = {
      description: enrichment.description,
      gender: enrichment.gender,
      brand: enrichment.brand,
      is_active: true, // Mark as active after enrichment
    };

    if (enrichment.size && enrichment.size !== "N/A") {
      updateData.size = enrichment.size;
    }

    if (categoryId) {
      updateData.category_id = categoryId;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", product_id);

    if (updateError) {
      console.error(`[enrich-product-details] Failed to update product: ${updateError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Database update failed: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[enrich-product-details] Successfully enriched product: ${product_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        enrichment: {
          ...enrichment,
          category_id: categoryId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[enrich-product-details] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
