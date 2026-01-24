import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentResult {
  description: string;
  gender: "Men" | "Women" | "Unisex";
  brand: string | null;
  size: string;
  image_url: string | null;
  notes?: {
    top?: string[];
    heart?: string[];
    base?: string[];
  };
}

// Known perfume manufacturer domains - prioritize these for authentic images and specs
const MANUFACTURER_DOMAINS = [
  // Major luxury brands
  'dior.com', 'chanel.com', 'guerlain.com', 'hermes.com', 'givenchy.com',
  'armani.com', 'giorgioarmani.com', 'ysl.com', 'yslbeauty.com', 'yslbeautyus.com',
  'lancome.com', 'tomford.com', 'tomfordbeauty.com', 'versace.com', 
  'dolcegabbana.com', 'dolcegabbanabeauty.com', 'burberry.com', 'prada.com', 'pradabeauty.com',
  'calvinklein.com', 'hugoboss.com', 'montblanc.com', 'carolina-herrera.com', 'carolinaherrera.com',
  'jeanpaulgaultier.com', 'isseymiyake.com', 'parfumsisseymiyake.com',
  'maisonmargiela.com', 'balmain.com', 'kenzo.com', 'kenzoparfums.com',
  'valentino.com', 'valentinobeauty.com', 'balenciaga.com',
  // Niche/premium brands
  'creeddirect.com', 'creedboutique.com', 'maisonfranciskurkdjian.com', 
  'parfumsdemarly.com', 'bypredo.com', 'bfroyaltous.com', 'acquadiparma.com',
  'penhaligons.com', 'amouage.com', 'initioparfums.com', 'nicolaiweb.com',
  'exnihiloparis.com', 'vilhelm.com', 'fredericmalle.com', 'rfrederickmalleparis.com',
  'diptyque.com', 'diptyqueparis.com', 'lelabo.com', 'jomalone.com', 
  'atelier-cologne.com', 'ateliercologne.com', 'kilianparis.com', 'bfroyaltous.com',
  // Other notable brands
  'azzaroparis.com', 'cartier.com', 'bulgari.com', 'ferragamo.com',
  'coach.com', 'coach.com', 'gucci.com', 'ralphlauren.com', 'rfrodeobev.com',
  // Fragrance-focused retailers with authentic images
  'fragrantica.com', 'parfumo.com', 'perfume.com',
];

function isManufacturerUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return MANUFACTURER_DOMAINS.some(domain => hostname.includes(domain.replace('www.', '')));
  } catch {
    return false;
  }
}

function extractBrandFromProductName(productName: string): string | null {
  // Common brand patterns at the start of product names
  const knownBrands = [
    'Dior', 'Chanel', 'Guerlain', 'Hermes', 'Hermès', 'Givenchy', 'Armani', 'Giorgio Armani',
    'Yves Saint Laurent', 'YSL', 'Lancome', 'Lancôme', 'Tom Ford', 'Versace', 
    'Dolce & Gabbana', 'Dolce Gabbana', 'D&G', 'Burberry', 'Prada', 'Calvin Klein',
    'Hugo Boss', 'Boss', 'Montblanc', 'Mont Blanc', 'Carolina Herrera', 'Jean Paul Gaultier',
    'Issey Miyake', 'Maison Margiela', 'Balmain', 'Kenzo', 'Valentino', 'Balenciaga',
    'Creed', 'Maison Francis Kurkdjian', 'MFK', 'Parfums de Marly', 'Byredo', 'PDM',
    'Acqua di Parma', 'Penhaligon', "Penhaligon's", 'Amouage', 'Initio', 'Xerjoff',
    'Nishane', 'Frederic Malle', 'Diptyque', 'Le Labo', 'Jo Malone', 'Atelier Cologne',
    'Kilian', 'By Kilian', 'Azzaro', 'Cartier', 'Bulgari', 'Bvlgari', 'Ferragamo',
    'Coach', 'Gucci', 'Ralph Lauren', 'Polo', 'Narciso Rodriguez', 'Marc Jacobs',
    'Jimmy Choo', 'Michael Kors', 'Elizabeth Arden', 'Estee Lauder', 'Clinique'
  ];
  
  for (const brand of knownBrands) {
    if (productName.toLowerCase().startsWith(brand.toLowerCase())) {
      return brand;
    }
  }
  return null;
}

function getBrandWebsiteDomain(brand: string): string | null {
  const brandDomainMap: Record<string, string> = {
    'dior': 'dior.com',
    'chanel': 'chanel.com',
    'guerlain': 'guerlain.com',
    'hermes': 'hermes.com',
    'hermès': 'hermes.com',
    'givenchy': 'givenchy.com',
    'armani': 'armani.com',
    'giorgio armani': 'armani.com',
    'yves saint laurent': 'ysl.com',
    'ysl': 'ysl.com',
    'lancome': 'lancome.com',
    'lancôme': 'lancome.com',
    'tom ford': 'tomford.com',
    'versace': 'versace.com',
    'dolce & gabbana': 'dolcegabbana.com',
    'dolce gabbana': 'dolcegabbana.com',
    'd&g': 'dolcegabbana.com',
    'burberry': 'burberry.com',
    'prada': 'prada.com',
    'calvin klein': 'calvinklein.com',
    'hugo boss': 'hugoboss.com',
    'boss': 'hugoboss.com',
    'montblanc': 'montblanc.com',
    'mont blanc': 'montblanc.com',
    'carolina herrera': 'carolinaherrera.com',
    'jean paul gaultier': 'jeanpaulgaultier.com',
    'issey miyake': 'isseymiyake.com',
    'creed': 'creedboutique.com',
    'maison francis kurkdjian': 'maisonfranciskurkdjian.com',
    'mfk': 'maisonfranciskurkdjian.com',
    'parfums de marly': 'parfumsdemarly.com',
    'pdm': 'parfumsdemarly.com',
    'byredo': 'byredo.com',
    'acqua di parma': 'acquadiparma.com',
    'penhaligon': 'penhaligons.com',
    "penhaligon's": 'penhaligons.com',
    'amouage': 'amouage.com',
    'initio': 'initioparfums.com',
    'frederic malle': 'fredericmalle.com',
    'diptyque': 'diptyque.com',
    'le labo': 'lelabo.com',
    'jo malone': 'jomalone.com',
    'atelier cologne': 'ateliercologne.com',
    'kilian': 'kilianparis.com',
    'by kilian': 'kilianparis.com',
    'azzaro': 'azzaroparis.com',
    'cartier': 'cartier.com',
    'bulgari': 'bulgari.com',
    'bvlgari': 'bulgari.com',
    'ferragamo': 'ferragamo.com',
    'gucci': 'gucci.com',
    'ralph lauren': 'ralphlauren.com',
    'valentino': 'valentino.com',
    'kenzo': 'kenzo.com',
  };
  
  return brandDomainMap[brand.toLowerCase()] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, product_name, brand: existingBrand } = await req.json();

    if (!product_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, error: "product_id and product_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[enrich-product-details] Starting enrichment for: ${product_name} (${product_id})`);
    console.log(`[enrich-product-details] Existing brand from CSV: ${existingBrand || "not provided"}`);

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

    // Determine the brand for targeted search
    const detectedBrand = existingBrand || extractBrandFromProductName(product_name);
    const brandDomain = detectedBrand ? getBrandWebsiteDomain(detectedBrand) : null;
    
    console.log(`[enrich-product-details] Detected brand: ${detectedBrand || 'unknown'}, domain: ${brandDomain || 'none'}`);

    // Step 1: PRIORITY - Search manufacturer's official website first
    let manufacturerContent = "";
    let manufacturerImageUrls: string[] = [];
    
    if (brandDomain) {
      console.log(`[enrich-product-details] Searching manufacturer site: ${brandDomain}`);
      
      try {
        const manufacturerSearchQuery = `site:${brandDomain} ${product_name} perfume`;
        const manufacturerResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: manufacturerSearchQuery,
            limit: 3,
            scrapeOptions: {
              formats: ["markdown", "links"],
            },
          }),
        });

        if (manufacturerResponse.ok) {
          const manufacturerData = await manufacturerResponse.json();
          console.log(`[enrich-product-details] Found ${manufacturerData.data?.length || 0} results from manufacturer site`);
          
          if (manufacturerData.data && manufacturerData.data.length > 0) {
            for (const result of manufacturerData.data) {
              manufacturerContent += `\n--- OFFICIAL MANUFACTURER SOURCE: ${result.url} ---\n`;
              manufacturerContent += result.markdown?.substring(0, 4000) || result.description || "";
              manufacturerContent += "\n";
              
              // Extract image URLs from manufacturer - these are PRIORITY
              if (result.links) {
                const imageLinks = result.links.filter((link: string) => 
                  /\.(jpg|jpeg|png|webp)(\?|$)/i.test(link) && 
                  !link.includes('icon') && 
                  !link.includes('logo') &&
                  !link.includes('sprite') &&
                  !link.includes('thumb') &&
                  (link.includes('product') || link.includes('fragrance') || link.includes('perfume') || !link.includes('menu'))
                );
                manufacturerImageUrls.push(...imageLinks);
              }
            }
          }
        }
      } catch (err) {
        console.log(`[enrich-product-details] Manufacturer search failed, continuing with general search`);
      }
    }

    // Step 2: Also search Fragrantica for authoritative fragrance notes and details
    console.log(`[enrich-product-details] Searching Fragrantica for fragrance notes...`);
    let fragranticaContent = "";
    
    try {
      const fragranticaQuery = `site:fragrantica.com ${product_name}`;
      const fragranticaResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: fragranticaQuery,
          limit: 2,
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
      });

      if (fragranticaResponse.ok) {
        const fragranticaData = await fragranticaResponse.json();
        if (fragranticaData.data && fragranticaData.data.length > 0) {
          for (const result of fragranticaData.data) {
            fragranticaContent += `\n--- FRAGRANTICA REFERENCE: ${result.url} ---\n`;
            fragranticaContent += result.markdown?.substring(0, 3000) || "";
            fragranticaContent += "\n";
          }
        }
      }
    } catch (err) {
      console.log(`[enrich-product-details] Fragrantica search failed, continuing...`);
    }

    // Step 3: General search as fallback for images if manufacturer didn't have any
    let generalSearchContent = "";
    let generalImageUrls: string[] = [];
    
    if (manufacturerImageUrls.length === 0) {
      console.log(`[enrich-product-details] No manufacturer images found, doing general search...`);
      
      const searchQuery = `${product_name} perfume official product image bottle`;
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
          scrapeOptions: {
            formats: ["markdown", "links"],
          },
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        if (searchData.data && searchData.data.length > 0) {
          for (const result of searchData.data) {
            const isManufacturer = isManufacturerUrl(result.url);
            
            // Collect content
            if (!isManufacturer) {
              generalSearchContent += `\n--- Source: ${result.url} ---\n`;
              generalSearchContent += result.markdown?.substring(0, 2000) || result.description || "";
              generalSearchContent += "\n";
            }
            
            // Collect image URLs, prioritizing manufacturer URLs
            if (result.links) {
              const imageLinks = result.links.filter((link: string) => 
                /\.(jpg|jpeg|png|webp)(\?|$)/i.test(link) && 
                !link.includes('icon') && 
                !link.includes('logo') &&
                !link.includes('sprite') &&
                !link.includes('thumb') &&
                link.length > 20
              );
              
              for (const imgLink of imageLinks) {
                if (isManufacturerUrl(imgLink)) {
                  manufacturerImageUrls.push(imgLink);
                } else {
                  generalImageUrls.push(imgLink);
                }
              }
            }
          }
        }
      }
    }

    // Compile all search context with priority to manufacturer sources
    let searchContext = "";
    
    if (manufacturerContent) {
      searchContext += "\n=== OFFICIAL MANUFACTURER INFORMATION (HIGHEST PRIORITY) ===\n";
      searchContext += manufacturerContent;
    }
    
    if (fragranticaContent) {
      searchContext += "\n=== FRAGRANTICA REFERENCE (AUTHORITATIVE FOR NOTES) ===\n";
      searchContext += fragranticaContent;
    }
    
    if (generalSearchContent) {
      searchContext += "\n=== ADDITIONAL SOURCES ===\n";
      searchContext += generalSearchContent;
    }

    // Compile image URLs with manufacturer priority
    const prioritizedImageUrls = [
      ...manufacturerImageUrls.slice(0, 5),  // Manufacturer images first
      ...generalImageUrls.slice(0, 3)        // Fallback to general images
    ];
    
    if (prioritizedImageUrls.length > 0) {
      searchContext += `\n=== PRODUCT IMAGE URLs (MANUFACTURER IMAGES LISTED FIRST) ===\n`;
      searchContext += prioritizedImageUrls.join("\n");
      searchContext += "\n";
    }

    if (!searchContext.trim()) {
      searchContext = "No web search results found. Generate based on the product name alone.";
    }

    // Step 4: Use AI to analyze and generate product details
    console.log(`[enrich-product-details] Sending to AI for analysis...`);
    
    const brandInstruction = existingBrand 
      ? `The product brand is already known: "${existingBrand}". Do NOT override this - return null for the brand field.`
      : `Extract the brand name from the product name or search results (e.g., 'Dior' from 'Dior Sauvage').`;
    
    const aiPrompt = `You are a luxury fragrance expert. Analyze the following search results about "${product_name}" and extract/generate product details.

CRITICAL INSTRUCTIONS:
1. ONLY use information from OFFICIAL MANUFACTURER sources or FRAGRANTICA for accuracy
2. For image_url, you MUST prioritize URLs from the manufacturer's official website
3. Never use images from random retailers or blogs if manufacturer images are available

EXISTING BRAND: ${existingBrand || "Not provided - you must extract it"}
DETECTED BRAND DOMAIN: ${brandDomain || "Unknown"}

SEARCH RESULTS (PRIORITIZED BY SOURCE):
${searchContext}

Based on the above information, provide the following in JSON format:
{
  "description": "A 2-3 sentence luxury marketing description for this fragrance. Mention the key scent notes and character. Be evocative and sophisticated.",
  "gender": "Men" or "Women" or "Unisex" (determine the target audience based on fragrance type and marketing),
  "brand": ${existingBrand ? 'null (brand already provided)' : '"The brand name extracted from the product name"'},
  "size": "The bottle size if found (e.g., '100ml', '3.4oz', '50ml'), or 'N/A' if not found",
  "image_url": "The BEST high-quality product image URL. MUST PRIORITIZE manufacturer/official brand URLs. Only use other URLs if no manufacturer images available. Must be a direct image URL ending in .jpg, .jpeg, .png, or .webp. Return null if no suitable image found.",
  "notes": {
    "top": ["array of top/head notes if found, e.g., 'Bergamot', 'Pink Pepper'"],
    "heart": ["array of heart/middle notes if found, e.g., 'Rose', 'Jasmine'"],
    "base": ["array of base notes if found, e.g., 'Musk', 'Sandalwood'"]
  }
}

${brandInstruction}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown code blocks or extra text.
2. For image_url, you MUST select from manufacturer/official brand URLs first (check if URL contains the brand domain like ${brandDomain || 'brand domain'}).
3. Avoid small thumbnails, icons, or placeholder images.
4. The description should be elegant and compelling, suitable for a luxury perfume store.
5. Extract fragrance notes accurately from Fragrantica or manufacturer descriptions.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a luxury fragrance expert assistant. Always respond with valid JSON only. Prioritize official manufacturer sources for all information." },
          { role: "user", content: aiPrompt },
        ],
        temperature: 0.5, // Lower temperature for more consistent/accurate extraction
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
      
      // Validate that the image URL is from a manufacturer if we have manufacturer URLs
      if (enrichment.image_url && manufacturerImageUrls.length > 0) {
        const isFromManufacturer = isManufacturerUrl(enrichment.image_url);
        if (!isFromManufacturer) {
          console.log(`[enrich-product-details] AI selected non-manufacturer image, overriding with manufacturer URL`);
          enrichment.image_url = manufacturerImageUrls[0]; // Force use of manufacturer image
        }
      }
      
    } catch (parseError) {
      console.error(`[enrich-product-details] Failed to parse AI response: ${aiContent}`);
      // Fallback to basic enrichment with manufacturer image if available
      enrichment = {
        description: `${product_name} - A sophisticated fragrance for discerning tastes. Experience luxury in every spray.`,
        gender: "Unisex",
        brand: existingBrand ? null : (detectedBrand || product_name.split(" ")[0] || "Unknown"),
        size: "N/A",
        image_url: manufacturerImageUrls[0] || null,
      };
    }

    // Step 5: Find matching category based on gender
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

    // Step 6: Update the product
    console.log(`[enrich-product-details] Updating product in database...`);
    
    // Normalize gender to lowercase to match database constraint (men, women, unisex)
    const normalizedGender = enrichment.gender?.toLowerCase() || "unisex";
    
    // Only activate products that have images - products without images stay inactive
    const hasImage = !!enrichment.image_url;
    
    const updateData: Record<string, any> = {
      description: enrichment.description,
      gender: normalizedGender,
      is_active: hasImage, // Only activate if image was found
    };
    
    if (!hasImage) {
      console.log(`[enrich-product-details] No image found for ${product_name} - keeping product INACTIVE`);
    }

    // Only update brand if CSV didn't provide one and AI extracted one
    if (!existingBrand && enrichment.brand) {
      updateData.brand = enrichment.brand;
    }

    if (enrichment.size && enrichment.size !== "N/A") {
      updateData.size = enrichment.size;
    }

    // Handle image URL - manufacturer images are prioritized
    if (enrichment.image_url) {
      updateData.image_url = enrichment.image_url;
      updateData.images = [enrichment.image_url]; // Store in images array as well
      const imageSource = isManufacturerUrl(enrichment.image_url) ? "MANUFACTURER" : "THIRD-PARTY";
      console.log(`[enrich-product-details] Using ${imageSource} image: ${enrichment.image_url}`);
    }

    // Store fragrance notes if extracted
    if (enrichment.notes) {
      updateData.scent_notes = enrichment.notes;
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
          brand_updated: !existingBrand && enrichment.brand ? true : false,
          image_source: enrichment.image_url ? (isManufacturerUrl(enrichment.image_url) ? "manufacturer" : "third-party") : null,
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
