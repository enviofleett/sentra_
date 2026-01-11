import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  product_id: string;
  product_name: string;
  old_price: number;
  new_price: number;
  competitor_average: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category_id, user_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting bulk price matching...', category_id ? `Category: ${category_id}` : 'All products');

    // Build query to fetch products with their price intelligence
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        cost_price,
        price_intelligence!inner (
          average_market_price,
          lowest_market_price,
          highest_market_price
        )
      `)
      .not('price_intelligence.average_market_price', 'is', null);

    if (category_id) {
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
          message: 'No products with price intelligence found',
          updates: [],
          summary: { total: 0, updated: 0, skipped: 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${products.length} products with price intelligence`);

    const updates: PriceUpdate[] = [];
    const skipped: { product_id: string; reason: string }[] = [];

    for (const product of products) {
      const intelligence = product.price_intelligence as any;
      const avgMarketPrice = intelligence.average_market_price;
      const costPrice = product.cost_price || 0;
      const currentPrice = product.price;

      // Calculate minimum safe price (cost + 10% margin)
      const minSafePrice = Math.round(costPrice * 1.10 * 100) / 100;

      // Skip if our price is already competitive
      if (currentPrice <= avgMarketPrice) {
        skipped.push({
          product_id: product.id,
          reason: 'Already competitive',
        });
        continue;
      }

      // Determine the new price
      let newPrice: number;
      let reason: string;

      if (avgMarketPrice >= minSafePrice) {
        // Safe to match competitor price
        newPrice = avgMarketPrice;
        reason = 'matched_competitor';
      } else if (minSafePrice < currentPrice) {
        // Competitor price is below our safe margin, use minimum safe price
        newPrice = minSafePrice;
        reason = 'minimum_safe_price';
      } else {
        // Current price is already at or below minimum safe price
        skipped.push({
          product_id: product.id,
          reason: 'Price already at minimum safe margin',
        });
        continue;
      }

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;

      // Skip if no meaningful change (less than ₦1 difference)
      if (Math.abs(newPrice - currentPrice) < 1) {
        skipped.push({
          product_id: product.id,
          reason: 'Price change too small',
        });
        continue;
      }

      updates.push({
        product_id: product.id,
        product_name: product.name,
        old_price: currentPrice,
        new_price: newPrice,
        competitor_average: avgMarketPrice,
        reason,
      });
    }

    console.log(`Processing ${updates.length} price updates, skipping ${skipped.length}`);

    // Apply updates
    for (const update of updates) {
      // Update product price
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: update.new_price, updated_at: new Date().toISOString() })
        .eq('id', update.product_id);

      if (updateError) {
        console.error(`Failed to update product ${update.product_id}:`, updateError);
        continue;
      }

      // Log the change to audit table
      const { error: auditError } = await supabase
        .from('product_pricing_audit')
        .insert({
          product_id: update.product_id,
          old_price: update.old_price,
          new_price: update.new_price,
          change_reason: update.reason === 'matched_competitor' 
            ? 'Auto-matched competitor average price' 
            : 'Set to minimum safe price (10% margin)',
          change_source: 'bulk_match',
          triggered_by: user_id || null,
          competitor_average: update.competitor_average,
        });

      if (auditError) {
        console.error(`Failed to log audit for ${update.product_id}:`, auditError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updates,
        summary: {
          total: products.length,
          updated: updates.length,
          skipped: skipped.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in bulk match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process bulk match';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
