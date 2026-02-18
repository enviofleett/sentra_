
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { plan_id, return_to } = await req.json();
    if (!plan_id) throw new Error("Missing required fields");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !authUser?.id || !authUser.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const effectiveUserId = authUser.id;
    const effectiveUserEmail = authUser.email;

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from("agent_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    // Initialize Paystack Transaction
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Paystack configuration missing");
    }

    const amountKobo = Math.round(plan.price * 100);

    const origin = req.headers.get("origin") || "https://sentra.shop";
    const isValidReturnTo = (v: unknown): v is string => {
      if (typeof v !== "string") return false;
      if (!v.startsWith("/")) return false;
      if (v.startsWith("//")) return false;
      if (v.includes("://")) return false;
      return true;
    };
    const callbackUrl = isValidReturnTo(return_to) ? `${origin}${return_to}` : `${origin}/consultant`;
    
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: effectiveUserEmail,
        amount: amountKobo,
        callback_url: callbackUrl,
        metadata: {
          type: "agent_subscription",
          user_id: effectiveUserId,
          plan_id: plan_id,
          plan_name: plan.name,
          duration_days: plan.duration_days
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Paystack initialization failed");
    }

    return new Response(
      JSON.stringify({ 
        paymentUrl: paystackData.data.authorization_url, 
        reference: paystackData.data.reference 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Payment init error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
