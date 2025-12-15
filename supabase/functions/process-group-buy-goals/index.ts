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
      .select('*, products!group_buy_campaigns_product_id_fkey(id, name, price, vendor_id, image_url), vendors(rep_full_name)')
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
        
        // Update campaign status
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'goal_met_pending_payment' })
          .eq('id', campaign.id);

        // Fetch ALL relevant commitments: both unpaid (pay_on_success) and paid (pay_to_book)
        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles:user_id(email, full_name, default_shipping_address, default_billing_address)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        if (commitmentsError) {
          console.error(`❌ Error fetching commitments for campaign ${campaign.id}:`, commitmentsError);
          continue;
        }

        const paymentDeadline = new Date();
        paymentDeadline.setHours(paymentDeadline.getHours() + (campaign.payment_window_hours || 6));

        for (const commitment of commitments || []) {
          const profile = commitment.profiles as any;
          
          if (commitment.status === 'committed_paid') {
            // PAID COMMITMENTS (pay_to_book mode): Create order now
            console.log(`💳 Creating order for paid commitment ${commitment.id}`);
            
            const product = campaign.products as any;
            const totalAmountInNaira = Number(commitment.committed_price) * commitment.quantity;

            const orderData = {
              user_id: commitment.user_id,
              customer_email: profile?.email || '',
              status: 'processing',
              payment_status: 'paid',
              paystack_status: 'success',
              payment_reference: commitment.payment_ref,
              items: [{
                product_id: product?.id,
                name: product?.name,
                price: Number(commitment.committed_price),
                quantity: commitment.quantity,
                vendor_id: product?.vendor_id,
                image_url: product?.image_url,
              }],
              subtotal: totalAmountInNaira,
              tax: 0,
              shipping_cost: 0,
              total_amount: totalAmountInNaira,
              shipping_address: profile?.default_shipping_address || {},
              billing_address: profile?.default_billing_address || {},
            };

            const { data: newOrder, error: orderCreationError } = await supabase
              .from('orders')
              .insert([orderData])
              .select('id')
              .single();

            if (orderCreationError) {
              console.error(`❌ Failed to create order for commitment ${commitment.id}:`, orderCreationError);
              continue;
            }

            // Update commitment to finalized state with order_id
            await supabase
              .from('group_buy_commitments')
              .update({ 
                status: 'paid_finalized', 
                order_id: newOrder.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', commitment.id);

            // Send success email
            await supabase.functions.invoke('send-email', {
              body: {
                to: profile?.email,
                templateId: 'GROUPBUY_SUCCESS_PAID_FINALIZED',
                data: {
                  customer_name: profile?.full_name || 'Customer',
                  product_name: product?.name,
                  order_id: newOrder.id.slice(0, 8),
                }
              }
            });
            
            console.log(`✅ Order ${newOrder.id} created and commitment ${commitment.id} finalized`);

          } else if (commitment.status === 'committed_unpaid') {
            // UNPAID COMMITMENTS (pay_on_success mode): Set payment deadline and notify
            console.log(`⏳ Setting payment deadline for unpaid commitment ${commitment.id}`);
            
            await supabase
              .from('group_buy_commitments')
              .update({ 
                payment_deadline: paymentDeadline.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', commitment.id);

            const paymentLink = `${Deno.env.get('APP_BASE_URL')}/profile/groupbuys`;
            
            await supabase.functions.invoke('send-email', {
              body: {
                to: profile?.email,
                templateId: 'GROUPBUY_SUCCESS_PAYMENT_REQUIRED',
                data: {
                  customer_name: profile?.full_name || 'Customer',
                  product_name: campaign.products.name,
                  discount_price: campaign.discount_price.toString(),
                  payment_deadline: paymentDeadline.toLocaleString(),
                  payment_link: paymentLink
                }
              }
            });
            console.log(`📧 Sent payment notification to ${profile?.email}`);
          }
        }

        // Check if all commitments are now finalized (all were paid)
        const { data: remainingUnpaid } = await supabase
          .from('group_buy_commitments')
          .select('id')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid'])
          .limit(1);

        if (!remainingUnpaid || remainingUnpaid.length === 0) {
          // All commitments are finalized, update campaign status
          await supabase
            .from('group_buy_campaigns')
            .update({ status: 'goal_met_paid_finalized' })
            .eq('id', campaign.id);
          console.log(`🎉 Campaign ${campaign.id} fully finalized - all payments complete`);
        }

      } else {
        // Campaign failed to reach goal
        console.log(`❌ Campaign ${campaign.id} failed to reach goal`);
        
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'failed_expired' })
          .eq('id', campaign.id);

        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles:user_id(email, full_name)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        if (commitmentsError) continue;

        for (const commitment of commitments || []) {
          const profile = commitment.profiles as any;
          
          // If payment was made (payment_ref exists), initiate refund
          if (commitment.payment_ref && paystackSecretKey) {
            console.log(`💰 Initiating refund for payment ${commitment.payment_ref}`);
            
            try {
              const refundResponse = await fetch('https://api.paystack.co/refund', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${paystackSecretKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction: commitment.payment_ref,
                  reason: 'Group buy campaign failed to reach goal'
                })
              });
              
              if (!refundResponse.ok) {
                console.error(`Failed to process refund for ${commitment.payment_ref}:`, await refundResponse.text());
              } else {
                console.log(`✅ Refund processed for ${commitment.payment_ref}`);
              }
              
            } catch (refundError) {
              console.error(`Error during refund API call:`, refundError);
            }
            
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
              to: profile?.email,
              templateId: 'GROUPBUY_FAILED_REFUND',
              data: {
                customer_name: profile?.full_name || 'Customer',
                product_name: campaign.products.name,
                reason: 'Campaign did not reach its minimum goal quantity'
              }
            }
          });
          console.log(`📧 Sent failure/refund notification to ${profile?.email}`);
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
