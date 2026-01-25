import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product_id: string;
  quantity: number;
}

interface PromoBreakdown {
  product_id: string;
  name: string;
  gross_margin: number;
  max_discount: number;
}

interface PromoCalculationResult {
  eligible_discount: number;
  applicable_discount: number;
  promo_balance: number;
  promo_percentage: number;
  breakdown: PromoBreakdown[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items } = await req.json() as { items: CartItem[] };

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({
        eligible_discount: 0,
        applicable_discount: 0,
        promo_balance: 0,
        promo_percentage: 0,
        breakdown: []
      } as PromoCalculationResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Calculate Promo] User: ${user.id}, Items: ${items.length}`);

    // Fetch promo margin percentage from config
    const { data: configData } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "promo_margin_percentage")
      .maybeSingle();

    const promoPercentage = (configData?.value as any)?.percentage || 50;
    console.log(`[Calculate Promo] Promo percentage: ${promoPercentage}%`);

    // Fetch user's promo wallet balance
    const { data: wallet } = await supabase
      .from("user_wallets")
      .select("balance_promo")
      .eq("user_id", user.id)
      .maybeSingle();

    const promoBalance = wallet?.balance_promo || 0;
    console.log(`[Calculate Promo] Promo balance: ₦${promoBalance}`);

    if (promoBalance <= 0) {
      return new Response(JSON.stringify({
        eligible_discount: 0,
        applicable_discount: 0,
        promo_balance: 0,
        promo_percentage: promoPercentage,
        breakdown: []
      } as PromoCalculationResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch products with cost_price
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, cost_price")
      .in("id", productIds);

    if (productsError) {
      console.error("[Calculate Promo] Products fetch error:", productsError);
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate eligible discount for each item
    const breakdown: PromoBreakdown[] = [];
    let totalEligibleDiscount = 0;

    for (const item of items) {
      const product = products?.find(p => p.id === item.product_id);
      if (!product) continue;

      const price = Number(product.price) || 0;
      const costPrice = Number(product.cost_price) || 0;
      const quantity = item.quantity || 1;

      // Gross margin = (price - cost) × quantity
      const grossMargin = Math.max(0, (price - costPrice) * quantity);
      
      // Max discount = gross_margin × promo_percentage / 100
      const maxDiscount = Math.round((grossMargin * promoPercentage / 100) * 100) / 100;

      breakdown.push({
        product_id: product.id,
        name: product.name,
        gross_margin: Math.round(grossMargin * 100) / 100,
        max_discount: maxDiscount
      });

      totalEligibleDiscount += maxDiscount;
    }

    // Round total eligible discount
    totalEligibleDiscount = Math.round(totalEligibleDiscount * 100) / 100;

    // Applicable discount is the minimum of eligible and balance
    const applicableDiscount = Math.min(totalEligibleDiscount, promoBalance);

    console.log(`[Calculate Promo] Eligible: ₦${totalEligibleDiscount}, Applicable: ₦${applicableDiscount}`);

    const result: PromoCalculationResult = {
      eligible_discount: totalEligibleDiscount,
      applicable_discount: Math.round(applicableDiscount * 100) / 100,
      promo_balance: promoBalance,
      promo_percentage: promoPercentage,
      breakdown
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Calculate Promo] Error:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
