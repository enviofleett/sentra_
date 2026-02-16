import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  days: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Check for missing environment variables
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userSupabase.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerId = authData.user.id;

    const body = (await req.json()) as Body;
    const days = Number(body.days) || 7;
    if (days <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid days" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let { data: trialPlan } = await supabase
      .from("agent_plans")
      .select("id")
      .eq("name", "Free Trial")
      .maybeSingle();

    if (!trialPlan) {
      const { data: created } = await supabase
        .from("agent_plans")
        .insert({
          name: "Free Trial",
          description: "Experience the AI Business Consultant risk-free.",
          price: 0,
          duration_days: days,
          features: ["Full AI Access", "Trial Period"],
          is_active: false,
        })
        .select("id")
        .single();
      trialPlan = created || null;
    }
    if (!trialPlan) {
      return new Response(
        JSON.stringify({ success: false, error: "Free Trial plan missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profiles } = await supabase.from("profiles").select("id");
    const { data: subs } = await supabase.from("user_agent_subscriptions").select("user_id");
    const subscribed = new Set<string>((subs || []).map((s: any) => s.user_id));
    const eligible = (profiles || []).map((p: any) => p.id).filter((id: string) => !subscribed.has(id));

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ success: true, granted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = eligible.map((userId: string) => ({
      user_id: userId,
      plan_id: trialPlan.id,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      is_active: true,
      payment_reference: "ADMIN_TRIAL_GRANT",
    }));

    const { error: insertError } = await supabase
      .from("user_agent_subscriptions")
      .insert(rows);
    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, granted: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
