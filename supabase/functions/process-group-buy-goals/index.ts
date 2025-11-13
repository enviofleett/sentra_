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
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

    console.log('🔄 Processing group buy goals...');

    // Find campaigns that are active
    const { data: campaigns, error: campaignsError } = await supabase
      .from('group_buy_campaigns')
      .select('*, products!group_buy_campaigns_product_id_fkey(name), vendors(rep_full_name)')
      .eq('status', 'active');

    if (campaignsError) throw campaignsError;

    const now = new Date();
    const campaignsToProcess = campaigns?.filter(campaign => {
      const isExpired = new Date(campaign.expiry_at) <= now;
      const goalReached = campaign.current_quantity >= campaign.goal_quantity;
      return isExpired || goalReached;
    }) || [];

    console.log(`📊 Found ${campaignsToProcess.length} campaigns to process`);

    for (const campaign of campaignsToProcess) {
      const goalMet = campaign.current_quantity >= campaign.goal_quantity;
      
      if (goalMet) {
        console.log(`✅ Campaign ${campaign.id} reached its goal!`);
        
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'goal_met_pending_payment' })
          .eq('id', campaign.id);

        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles!inner(email, full_name)')
          .eq('campaign_id', campaign.id)
          .eq('status', 'committed_unpaid');

        if (commitmentsError) continue;

        const paymentDeadline = new Date();
        paymentDeadline.setHours(paymentDeadline.getHours() + campaign.payment_window_hours);

        for (const commitment of commitments || []) {
          await supabase
            .from('group_buy_commitments')
            .update({ payment_deadline: paymentDeadline.toISOString() })
            .eq('id', commitment.id);

          const paymentLink = `${Deno.env.get('SUPABASE_URL')?.replace('https://oczsddmantovkqfwczqk.supabase.co', 'https://oczsddmantovkqfwczqk.lovableproject.com')}/profile/groupbuys`;
          
          await supabase.functions.invoke('send-email', {
            body: {
              to: commitment.profiles.email,
              templateId: 'GROUPBUY_SUCCESS_PAYMENT_REQUIRED',
              data: {
                customer_name: commitment.profiles.full_name || 'Customer',
                product_name: campaign.products.name,
                discount_price: campaign.discount_price.toString(),
                payment_deadline: paymentDeadline.toLocaleString(),
                payment_link: paymentLink
              }
            }
          });
          console.log(`📧 Sent payment notification to ${commitment.profiles.email}`);
        }

      } else {
        console.log(`❌ Campaign ${campaign.id} failed to reach goal`);
        
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'failed_expired' })
          .eq('id', campaign.id);

        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles!inner(email, full_name)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        if (commitmentsError) continue;

        for (const commitment of commitments || []) {
          // If payment was made (payment_ref exists), initiate refund
          if (commitment.payment_ref && paystackSecretKey) {
            console.log(`💰 Initiating refund for payment ${commitment.payment_ref}`);
            
            // --- BEGIN PAYSTACK REFUND LOGIC ---
            try {
              const refundResponse = await fetch('https://api.paystack.co/refund', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${paystackSecretKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction: commitment.payment_ref,
                  reason: 'Group buy campaign failed'
                })
              });
              
              if (!refundResponse.ok) {
                console.error(`Failed to process refund for ${commitment.payment_ref}:`, await refundResponse.text());
                // Don't stop, just log. Continue to update status.
              } else {
                console.log(`✅ Refund processed for ${commitment.payment_ref}`);
              }
              
            } catch (refundError) {
              console.error(`Error during refund API call:`, refundError);
            }
            // --- END PAYSTACK REFUND LOGIC ---
            
            await supabase
              .from('group_buy_commitments')
              .update({ status: 'refunded' })
              .eq('id', commitment.id);

          } else {
            // No payment was made, just cancel the commitment
            await supabase
              .from('group_buy_commitments')
              .update({ status: 'cancelled' })
              .eq('id', commitment.id);
          }

          // Send refund/failure notification
          await supabase.functions.invoke('send-email', {
            body: {
              to: commitment.profiles.email,
              templateId: 'GROUPBUY_FAILED_REFUND',
              data: {
                customer_name: commitment.profiles.full_name || 'Customer',
                product_name: campaign.products.name,
                reason: 'Campaign did not reach its minimum goal quantity'
              }
            }
          });
          console.log(`📧 Sent failure/refund notification to ${commitment.profiles.email}`);
        }
      }
    }

    console.log('✅ Group buy goals processing completed');

    return new Response(JSON.stringify({ 
      success: true,
      processedCampaigns: campaignsToProcess.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in process-group-buy-goals:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
