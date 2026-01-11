import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, user_id } = await req.json();

    if (!product_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'product_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Auto-matching price for product: ${product_id}`);

    // Fetch product with price intelligence
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        cost_price,
        price_intelligence (
          average_market_price,
          lowest_market_price,
          highest_market_price
        )
      `)
      .eq('id', product_id)
      .single();

    if (fetchError || !product) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const intelligence = product.price_intelligence as any;
    
    if (!intelligence || !intelligence.average_market_price) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No competitor price data available. Please scan first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const avgMarketPrice = intelligence.average_market_price;
    const costPrice = product.cost_price || 0;
    const currentPrice = product.price;

    // Calculate minimum safe price (cost + 10% margin)
    const minSafePrice = Math.round(costPrice * 1.10 * 100) / 100;

    // Determine the new price
    let newPrice: number;
    let reason: string;

    if (avgMarketPrice >= minSafePrice) {
      // Safe to match competitor price
      newPrice = avgMarketPrice;
      reason = 'Matched competitor average price';
    } else {
      // Competitor price is below our safe margin
      newPrice = minSafePrice;
      reason = 'Set to minimum safe price (10% margin) - competitor price too low';
    }

    // Round to 2 decimal places
    newPrice = Math.round(newPrice * 100) / 100;

    // Check if price actually changed
    if (Math.abs(newPrice - currentPrice) < 1) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Price is already optimal',
          data: {
            current_price: currentPrice,
            new_price: newPrice,
            competitor_average: avgMarketPrice,
            no_change: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update product price
    const { error: updateError } = await supabase
      .from('products')
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', product_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update price' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change to audit table
    await supabase
      .from('product_pricing_audit')
      .insert({
        product_id,
        old_price: currentPrice,
        new_price: newPrice,
        change_reason: reason,
        change_source: 'auto_match',
        triggered_by: user_id || null,
        competitor_average: avgMarketPrice,
      });

    console.log(`Price updated: ${currentPrice} -> ${newPrice} (${reason})`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          old_price: currentPrice,
          new_price: newPrice,
          competitor_average: avgMarketPrice,
          minimum_safe_price: minSafePrice,
          reason,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error auto-matching price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to auto-match price';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
