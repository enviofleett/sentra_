import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[delete-all-products] Starting store reset...');

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // First verify the user is an admin using their token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[delete-all-products] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin');
    if (adminError || !isAdmin) {
      console.error('[delete-all-products] Admin check failed:', adminError);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-all-products] Admin verified: ${user.email}`);

    // Use service role client to bypass RLS for deletion
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Delete related cart_items first (foreign key constraint)
    console.log('[delete-all-products] Deleting cart items...');
    const { error: cartError } = await serviceClient
      .from('cart_items')
      .delete()
      .gte('created_at', '1970-01-01');
    
    if (cartError) {
      console.error('[delete-all-products] Failed to delete cart items:', cartError);
      // Continue anyway - might be empty
    }
    console.log('[delete-all-products] Cart items deleted');

    // Step 2: Delete price_intelligence records (foreign key constraint)
    console.log('[delete-all-products] Deleting price intelligence records...');
    const { error: priceIntelError } = await serviceClient
      .from('price_intelligence')
      .delete()
      .gte('created_at', '1970-01-01');

    if (priceIntelError) {
      console.error('[delete-all-products] Failed to delete price intelligence:', priceIntelError);
      // Continue anyway - might be empty
    }
    console.log('[delete-all-products] Price intelligence deleted');

    // Step 3: Delete product_analytics records
    console.log('[delete-all-products] Deleting product analytics...');
    const { error: analyticsError } = await serviceClient
      .from('product_analytics')
      .delete()
      .gte('created_at', '1970-01-01');

    if (analyticsError) {
      console.error('[delete-all-products] Failed to delete analytics:', analyticsError);
      // Continue anyway
    }
    console.log('[delete-all-products] Product analytics deleted');

    // Step 4: Delete product_pricing_audit records
    console.log('[delete-all-products] Deleting pricing audit...');
    const { error: auditError } = await serviceClient
      .from('product_pricing_audit')
      .delete()
      .gte('created_at', '1970-01-01');

    if (auditError) {
      console.error('[delete-all-products] Failed to delete pricing audit:', auditError);
      // Continue anyway
    }
    console.log('[delete-all-products] Pricing audit deleted');

    // Step 5: Clear active_group_buy_id references in products (self-reference)
    console.log('[delete-all-products] Clearing group buy references...');
    const { error: clearRefError } = await serviceClient
      .from('products')
      .update({ active_group_buy_id: null })
      .not('active_group_buy_id', 'is', null);

    if (clearRefError) {
      console.error('[delete-all-products] Failed to clear group buy refs:', clearRefError);
    }

    // Step 6: Delete group_buy_commitments (references products via orders)
    console.log('[delete-all-products] Deleting group buy commitments...');
    const { error: commitmentsError } = await serviceClient
      .from('group_buy_commitments')
      .delete()
      .gte('created_at', '1970-01-01');

    if (commitmentsError) {
      console.error('[delete-all-products] Failed to delete commitments:', commitmentsError);
    }

    // Step 7: Delete group_buy_campaigns (references products)
    console.log('[delete-all-products] Deleting group buy campaigns...');
    const { error: campaignsError } = await serviceClient
      .from('group_buy_campaigns')
      .delete()
      .gte('created_at', '1970-01-01');

    if (campaignsError) {
      console.error('[delete-all-products] Failed to delete campaigns:', campaignsError);
    }

    // Step 8: Get product count before deletion
    const { count: productCount } = await serviceClient
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Step 9: Finally delete all products
    console.log('[delete-all-products] Deleting all products...');
    const { error: productsError } = await serviceClient
      .from('products')
      .delete()
      .gte('created_at', '1970-01-01');

    if (productsError) {
      console.error('[delete-all-products] Failed to delete products:', productsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete products: ${productsError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-all-products] Successfully deleted ${productCount || 0} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Store reset complete. Deleted ${productCount || 0} products and all related data.`,
        deleted_count: productCount || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[delete-all-products] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
