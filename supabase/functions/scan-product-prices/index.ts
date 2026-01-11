import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorData {
  store: string;
  price: number;
  url: string;
  currency: string;
}

// Extract prices from text using regex patterns
function extractPrices(text: string): number[] {
  const prices: number[] = [];
  
  // Match Naira prices: ₦5,000 or NGN 5000 or N5,000 or 5000 naira
  const nairaPatterns = [
    /₦\s*([\d,]+(?:\.\d{2})?)/gi,
    /NGN\s*([\d,]+(?:\.\d{2})?)/gi,
    /N\s*([\d,]+(?:\.\d{2})?)/gi,
    /([\d,]+(?:\.\d{2})?)\s*(?:naira|NGN)/gi,
  ];
  
  for (const pattern of nairaPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      // Filter out unrealistic prices (too low or too high)
      if (price >= 1000 && price <= 10000000) {
        prices.push(price);
      }
    }
  }
  
  return prices;
}

// Parse search results to extract competitor data
function parseSearchResults(results: any[]): CompetitorData[] {
  const competitors: CompetitorData[] = [];
  
  for (const result of results) {
    const text = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`;
    const prices = extractPrices(text);
    
    if (prices.length > 0) {
      // Use the first valid price found
      const url = result.url || result.sourceURL || '';
      const storeName = extractStoreName(url);
      
      competitors.push({
        store: storeName,
        price: prices[0],
        url: url,
        currency: 'NGN',
      });
    }
  }
  
  return competitors;
}

// Extract store name from URL
function extractStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove common prefixes
    const cleaned = hostname.replace(/^(www\.|shop\.|store\.)/i, '');
    // Get the main domain name
    const parts = cleaned.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return cleaned;
  } catch {
    return 'Unknown Store';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, product_name } = await req.json();

    if (!product_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'product_id and product_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Scanning prices for: ${product_name}`);

    // Search for product prices using Firecrawl
    const searchQuery = `price of ${product_name} perfume online store Nigeria buy`;
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        lang: 'en',
        country: 'ng',
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the results
    const results = searchData.data || [];
    console.log(`Found ${results.length} search results`);

    const competitorData = parseSearchResults(results);
    console.log(`Extracted ${competitorData.length} competitor prices`);

    if (competitorData.length === 0) {
      // No prices found, but still update the record
      const { error: upsertError } = await supabase
        .from('price_intelligence')
        .upsert({
          product_id,
          average_market_price: null,
          lowest_market_price: null,
          highest_market_price: null,
          competitor_data: [],
          last_scraped_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No competitor prices found',
          data: {
            competitors_found: 0,
            average_price: null,
            lowest_price: null,
            highest_price: null,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const prices = competitorData.map(c => c.price);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`Prices - Avg: ${avgPrice}, Min: ${minPrice}, Max: ${maxPrice}`);

    // Upsert into price_intelligence table
    const { error: upsertError } = await supabase
      .from('price_intelligence')
      .upsert({
        product_id,
        average_market_price: avgPrice,
        lowest_market_price: minPrice,
        highest_market_price: maxPrice,
        competitor_data: competitorData,
        last_scraped_at: new Date().toISOString(),
      }, { onConflict: 'product_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save intelligence data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          competitors_found: competitorData.length,
          average_price: avgPrice,
          lowest_price: minPrice,
          highest_price: maxPrice,
          competitors: competitorData,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error scanning prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan prices';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
