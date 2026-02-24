import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const checks = {
    openrouter_api_key: Boolean(Deno.env.get("OPENROUTER_API_KEY")),
    supabase_url: Boolean(Deno.env.get("SUPABASE_URL")),
    supabase_service_role_key: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
  };

  const status = Object.values(checks).every(Boolean) ? "active" : "misconfigured";
  const statusCode = status === "active" ? 200 : 500;

  return new Response(
    JSON.stringify({
      service: "ai-business-consultant",
      status,
      checks,
      timestamp: new Date().toISOString(),
    }),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
