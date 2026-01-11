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
      if (price >= 1000 && price <= 10000000) {
        prices.push(price);
      }
    }
  }
  
  return prices;
}

function parseSearchResults(results: any[]): CompetitorData[] {
  const competitors: CompetitorData[] = [];
  
  for (const result of results) {
    const text = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`;
    const prices = extractPrices(text);
    
    if (prices.length > 0) {
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

function extractStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const cleaned = hostname.replace(/^(www\.|shop\.|store\.)/i, '');
    const parts = cleaned.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return cleaned;
  } catch {
    return 'Unknown Store';
  }
}

async function scanSingleProduct(
  firecrawlApiKey: string,
  supabase: any,
  product: { id: string; name: string }
): Promise<{ success: boolean; product_id: string; product_name: string; competitors_found: number; error?: string }> {
  try {
    console.log(`Scanning: ${product.name}`);
    
    const searchQuery = `price of ${product.name} perfume online store Nigeria buy`;
    
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
        lang: 'en',
        country: 'ng',
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error(`Firecrawl error for ${product.name}:`, searchData);
      return { 
        success: false, 
        product_id: product.id, 
        product_name: product.name, 
        competitors_found: 0,
        error: searchData.error || 'Search failed'
      };
    }

    const results = searchData.data || [];
    const competitorData = parseSearchResults(results);

    if (competitorData.length === 0) {
      await supabase
        .from('price_intelligence')
        .upsert({
          product_id: product.id,
          average_market_price: null,
          lowest_market_price: null,
          highest_market_price: null,
          competitor_data: [],
          last_scraped_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });

      return { 
        success: true, 
        product_id: product.id, 
        product_name: product.name, 
        competitors_found: 0 
      };
    }

    const prices = competitorData.map(c => c.price);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    await supabase
      .from('price_intelligence')
      .upsert({
        product_id: product.id,
        average_market_price: avgPrice,
        lowest_market_price: minPrice,
        highest_market_price: maxPrice,
        competitor_data: competitorData,
        last_scraped_at: new Date().toISOString(),
      }, { onConflict: 'product_id' });

    return { 
      success: true, 
      product_id: product.id, 
      product_name: product.name, 
      competitors_found: competitorData.length 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error scanning ${product.name}:`, errorMessage);
    return { 
      success: false, 
      product_id: product.id, 
      product_name: product.name, 
      competitors_found: 0,
      error: errorMessage
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category_id, product_ids } = await req.json();

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

    console.log('Starting bulk price scan...');

    // Build query to fetch products
    let query = supabase.from('products').select('id, name').eq('is_active', true);
    
    if (product_ids && product_ids.length > 0) {
      query = query.in('id', product_ids);
    } else if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No products found to scan',
          summary: { total: 0, scanned: 0, with_data: 0, failed: 0 },
          results: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scanning ${products.length} products...`);

    const results: { 
      success: boolean; 
      product_id: string; 
      product_name: string; 
      competitors_found: number; 
      error?: string 
    }[] = [];

    // Process products with rate limiting (2 second delay between requests)
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Add delay between requests to respect API rate limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const result = await scanSingleProduct(firecrawlApiKey, supabase, product);
      results.push(result);
      
      console.log(`Progress: ${i + 1}/${products.length} - ${product.name}: ${result.competitors_found} competitors`);
    }

    const summary = {
      total: products.length,
      scanned: results.filter(r => r.success).length,
      with_data: results.filter(r => r.success && r.competitors_found > 0).length,
      failed: results.filter(r => !r.success).length,
    };

    console.log('Bulk scan complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in bulk scan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process bulk scan';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
