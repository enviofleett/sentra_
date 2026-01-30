import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderId } = await req.json();
    console.log(`[Debug Order] Searching for order: ${orderId}`);

    // Construct UUID range for prefix search
    const startUuid = `${orderId}-0000-0000-0000-000000000000`;
    const endUuid = `${orderId}-ffff-ffff-ffff-ffffffffffff`;

    // 1. Fetch Order
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .gte('id', startUuid)
      .lte('id', endUuid)
      .limit(5);

    if (orderError) throw orderError;

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = orders[0]; // Take the first match
    console.log(`[Debug Order] Found order: ${order.id}`);

    // 2. Fetch User Wallet
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', order.user_id)
      .single();

    // 3. Fetch Wallet Transactions for this order
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', order.user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Fetch Products details to check margin
    const items = order.items || [];
    const productIds = Array.isArray(items) ? items.map((item: any) => item.product_id) : [];
    
    let products = [];
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, cost_price, vendor_id')
        .in('id', productIds);
      products = productsData || [];
    }

    return new Response(JSON.stringify({
      order,
      wallet,
      transactions,
      products,
      errors: { walletError, txError }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
