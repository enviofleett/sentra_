import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('⏰ Processing payment deadlines...');

    // Find commitments with expired payment deadlines
    const { data: expiredCommitments, error } = await supabase
      .from('group_buy_commitments')
      .select('id, campaign_id, user_id')
      .eq('status', 'committed_unpaid')
      .lt('payment_deadline', new Date().toISOString())
      .not('payment_deadline', 'is', null);

    if (error) {
      console.error('Error fetching expired commitments:', error);
      throw error;
    }

    console.log(`📋 Found ${expiredCommitments?.length || 0} expired commitments`);

    for (const commitment of expiredCommitments || []) {
      // Update status to payment_window_expired
      const { error: updateError } = await supabase
        .from('group_buy_commitments')
        .update({ status: 'payment_window_expired' })
        .eq('id', commitment.id);

      if (updateError) {
        console.error(`Error updating commitment ${commitment.id}:`, updateError);
        continue;
      }

      console.log(`⏳ Expired commitment ${commitment.id}`);
    }

    console.log('✅ Payment deadlines processing completed');

    return new Response(JSON.stringify({ 
      success: true,
      expiredCommitments: expiredCommitments?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in process-payment-deadlines:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
