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

    console.log('🔄 Processing group buy goals...');

    // Find campaigns that are active and either expired or reached goal
    const { data: campaigns, error: campaignsError } = await supabase
      .from('group_buy_campaigns')
      .select('*, products!group_buy_campaigns_product_id_fkey(name), vendors(rep_full_name)')
      .eq('status', 'active')
      .or(`expiry_at.lte.${new Date().toISOString()},current_quantity.gte.goal_quantity`);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`📊 Found ${campaigns?.length || 0} campaigns to process`);

    for (const campaign of campaigns || []) {
      const goalMet = campaign.current_quantity >= campaign.goal_quantity;
      
      if (goalMet) {
        console.log(`✅ Campaign ${campaign.id} reached its goal!`);
        
        // Update campaign status
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'goal_met_pending_payment' })
          .eq('id', campaign.id);

        // Get all unpaid commitments for this campaign
        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles!inner(email, full_name)')
          .eq('campaign_id', campaign.id)
          .eq('status', 'committed_unpaid');

        if (commitmentsError) {
          console.error('Error fetching commitments:', commitmentsError);
          continue;
        }

        // Set payment deadline and send emails
        const paymentDeadline = new Date();
        paymentDeadline.setHours(paymentDeadline.getHours() + campaign.payment_window_hours);

        for (const commitment of commitments || []) {
          // Update commitment with payment deadline
          await supabase
            .from('group_buy_commitments')
            .update({ payment_deadline: paymentDeadline.toISOString() })
            .eq('id', commitment.id);

          // Send payment required email
          const paymentLink = `${Deno.env.get('SUPABASE_URL')?.replace('https://deggysidjvpyervagpra.supabase.co', 'https://deggysidjvpyervagpra.lovableproject.com')}/profile/groupbuys`;
          
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
        
        // Update campaign status to failed
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'failed_expired' })
          .eq('id', campaign.id);

        // Get all commitments for this campaign
        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles!inner(email, full_name)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        if (commitmentsError) {
          console.error('Error fetching commitments:', commitmentsError);
          continue;
        }

        for (const commitment of commitments || []) {
          // Update commitment status
          await supabase
            .from('group_buy_commitments')
            .update({ status: 'refunded' })
            .eq('id', commitment.id);

          // Send refund email
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

          // If payment was made (payment_ref exists), initiate refund
          if (commitment.payment_ref) {
            console.log(`💰 Initiating refund for payment ${commitment.payment_ref}`);
            // TODO: Implement Paystack refund API call here
          }

          console.log(`📧 Sent refund notification to ${commitment.profiles.email}`);
        }
      }
    }

    console.log('✅ Group buy goals processing completed');

    return new Response(JSON.stringify({ 
      success: true,
      processedCampaigns: campaigns?.length || 0
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
