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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { orderData, cartTotal } = await req.json();

    if (!orderData || !cartTotal || cartTotal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Pay with Membership] User: ${user.id}, Cart Total: ${cartTotal}`);

    // MOQ VALIDATION: Verify minimum order quantities per vendor
    const orderItems = orderData.items as any[];
    if (!orderItems || orderItems.length === 0) {
      return new Response(JSON.stringify({ error: "No items in order" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const productIds = orderItems.map((item: any) => item.product_id).filter(Boolean);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, vendor_id, vendor:vendors(id, rep_full_name, min_order_quantity)')
      .in('id', productIds);

    if (productsError) {
      console.error('[Pay with Membership] Products fetch error:', productsError);
      return new Response(JSON.stringify({ error: 'Failed to verify products' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by vendor and check MOQ
    const vendorQuantities: Record<string, {
      vendorName: string;
      moq: number;
      totalQty: number;
    }> = {};

    for (const item of orderItems) {
      const product = products?.find(p => p.id === item.product_id);
      if (!product) continue;

      const vendorId = product.vendor_id;
      const vendor = (product as any).vendor;

      if (vendorId && vendor) {
        if (!vendorQuantities[vendorId]) {
          vendorQuantities[vendorId] = {
            vendorName: vendor.rep_full_name || 'Unknown Vendor',
            moq: vendor.min_order_quantity || 1,
            totalQty: 0
          };
        }
        vendorQuantities[vendorId].totalQty += item.quantity;
      }
    }

    // Check if any vendor's MOQ is not met
    const moqViolations: string[] = [];
    for (const [vendorId, data] of Object.entries(vendorQuantities)) {
      if (data.totalQty < data.moq) {
        const shortage = data.moq - data.totalQty;
        moqViolations.push(`${data.vendorName}: need ${shortage} more item(s) to meet minimum of ${data.moq}`);
        console.error(`[Pay with Membership] MOQ violation - ${data.vendorName}: ${data.totalQty}/${data.moq}`);
      }
    }

    if (moqViolations.length > 0) {
      return new Response(JSON.stringify({
        error: 'Minimum order quantity not met',
        details: moqViolations.join('; ')
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[Pay with Membership] MOQ validation passed');

    // Check membership balance
    const { data: wallet, error: walletError } = await supabase
      .from("membership_wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "No membership wallet found" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (wallet.balance < cartTotal) {
      return new Response(JSON.stringify({ 
        error: "Insufficient membership balance",
        balance: wallet.balance,
        required: cartTotal
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Generate a unique reference for this wallet payment
    const paymentReference = `MBRSHIP_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create the order first
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([{
        ...orderData,
        user_id: user.id,
        status: 'processing',
        payment_status: 'paid',
        paystack_status: 'membership_wallet',
        payment_reference: paymentReference,
      }])
      .select("id")
      .single();

    if (orderError) {
      console.error("[Pay with Membership] Order creation failed:", orderError);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[Pay with Membership] Order created: ${newOrder.id}`);

    // Debit the membership wallet atomically
    const { data: transactionId, error: debitError } = await supabase
      .rpc('debit_membership_wallet', {
        p_user_id: user.id,
        p_amount: cartTotal,
        p_order_id: newOrder.id,
        p_description: `Purchase - Order #${newOrder.id.slice(0, 8)}`
      });

    if (debitError) {
      console.error("[Pay with Membership] Wallet debit failed:", debitError);
      // Rollback: delete the order since payment failed
      await supabase.from("orders").delete().eq("id", newOrder.id);
      return new Response(JSON.stringify({ error: "Failed to process payment" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[Pay with Membership] Wallet debited - Transaction: ${transactionId}`);

    // Record profit split
    await supabase.rpc('record_profit_split', {
      p_order_id: newOrder.id,
      p_commitment_id: null,
      p_payment_reference: paymentReference,
      p_total_amount: cartTotal
    });

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    // Send confirmation email (fire and forget)
    if (profile?.email) {
      supabase.functions.invoke('send-email', {
        body: {
          to: profile.email,
          templateId: 'ORDER_CONFIRMATION',
          data: {
            customer_name: profile.full_name || 'Customer',
            order_id: newOrder.id.slice(0, 8),
            total_amount: cartTotal.toLocaleString(),
            payment_method: 'Membership Credit',
          }
        }
      }).catch(err => console.error('[Pay with Membership] Email error:', err));
    }

    return new Response(JSON.stringify({ 
      success: true,
      order_id: newOrder.id,
      transaction_id: transactionId,
      message: "Order placed successfully using membership credit"
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[Pay with Membership] Error:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
