import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  const requestSecret = req.headers.get('X-Cron-Secret');

  if (!cronSecret || requestSecret !== cronSecret) {
    console.warn('[process-influencer-compliance] Unauthorized: Invalid or missing X-Cron-Secret header');
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid cron secret' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: activeInfluencers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_influencer', true)
      .eq('influencer_moq_enabled', true);

    if (fetchError) {
      throw fetchError;
    }

    const users = activeInfluencers || [];
    let processed = 0;
    let emailsSent = 0;
    const failures: string[] = [];

    for (const user of users) {
      const { data, error } = await supabase.rpc('evaluate_influencer_compliance', {
        p_user_id: user.id,
      });

      if (error) {
        failures.push(`${user.id}: ${error.message}`);
        continue;
      }

      processed += 1;

      const result = Array.isArray(data) ? data[0] : null;

      if (result && result.influencer_moq_enabled === false && user.email) {
        try {
          const currentMoq = Number(result.required_moq || 4);
          const paidOrders = Number(result.paid_orders_last_30d || 0);
          const dashboardLink = `${Deno.env.get('APP_BASE_URL') || 'https://sentra.ng'}/profile`;

          await supabase.functions.invoke('send-email', {
            body: {
              to: user.email,
              templateId: 'INFLUENCER_MOQ_FAILURE',
              data: {
                name: user.full_name || user.email,
                email: user.email,
                required_moq: String(currentMoq),
                paid_orders_30d: String(paidOrders),
                dashboard_link: dashboardLink,
                current_year: String(new Date().getFullYear()),
              },
            },
          });

          emailsSent += 1;

          if (emailsSent % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (emailError: any) {
          failures.push(`${user.id}: email_failed:${emailError.message || 'unknown error'}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        targeted: users.length,
        processed,
        emailsSent,
        failed: failures.length,
        failures,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[process-influencer-compliance] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
