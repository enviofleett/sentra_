import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  console.log('[Process-Group-Buy-Goals] Function invoked at', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // === SECURITY: Validate cron secret header ===
  const cronSecret = Deno.env.get('CRON_SECRET');
  const requestSecret = req.headers.get('X-Cron-Secret');

  if (!cronSecret || requestSecret !== cronSecret) {
    console.warn('[Process-Group-Buy-Goals] Unauthorized: Invalid or missing X-Cron-Secret header');
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
    
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');

    console.log('[Process-Group-Buy-Goals] APP_BASE_URL:', appBaseUrl ? 'configured' : 'MISSING');

    // Fetch active campaigns with explicit FK hint
    const { data: campaigns, error: campaignsError } = await supabase
      .from('group_buy_campaigns')
      .select('*, products!group_buy_campaigns_product_id_fkey(id, name, price, vendor_id, image_url)')
      .eq('status', 'active');

    if (campaignsError) {
      console.error('[Process-Group-Buy-Goals] Campaign fetch error:', campaignsError);
      throw campaignsError;
    }

    const now = new Date();
    const campaignsToProcess = campaigns?.filter(campaign => {
      const isExpired = new Date(campaign.expiry_at) <= now;
      const goalReached = campaign.current_quantity >= campaign.goal_quantity;
      return isExpired || goalReached;
    }) || [];

    console.log(`[Process-Group-Buy-Goals] Found ${campaignsToProcess.length} campaigns to process`);

    for (const campaign of campaignsToProcess) {
      const goalMet = campaign.current_quantity >= campaign.goal_quantity;
      
      console.log(`[Process-Group-Buy-Goals] Processing campaign ${campaign.id} - Goal Met: ${goalMet}`);

      if (goalMet) {
        // === GOAL REACHED ===
        console.log(`[Process-Group-Buy-Goals] Campaign ${campaign.id} reached goal!`);
        
        // Update campaign status
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'goal_met_pending_payment', updated_at: new Date().toISOString() })
          .eq('id', campaign.id);

        // Clear the active_group_buy_id on product (campaign is no longer active)
        await supabase
          .from('products')
          .update({ active_group_buy_id: null, updated_at: new Date().toISOString() })
          .eq('active_group_buy_id', campaign.id);

        // Fetch all commitments
        const { data: commitments, error: commitmentsError } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles:user_id(email, full_name, default_shipping_address, default_billing_address)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        if (commitmentsError) {
          console.error(`[Process-Group-Buy-Goals] Commitments fetch error:`, commitmentsError);
          continue;
        }

        const paymentDeadline = new Date();
        paymentDeadline.setHours(paymentDeadline.getHours() + (campaign.payment_window_hours || 6));

        for (const commitment of commitments || []) {
          const profile = commitment.profiles as any;
          
          if (commitment.status === 'committed_paid') {
            // PAID COMMITMENTS: Create order immediately
            console.log(`[Process-Group-Buy-Goals] Creating order for paid commitment ${commitment.id}`);
            
            const product = campaign.products as any;
            const totalAmount = Number(commitment.committed_price) * commitment.quantity;

            const orderData = {
              user_id: commitment.user_id,
              customer_email: profile?.email || '',
              status: 'processing' as const,
              payment_status: 'paid' as const,
              paystack_status: 'success',
              payment_reference: commitment.payment_ref,
              items: [{
                product_id: product?.id,
                name: product?.name,
                price: Number(commitment.committed_price),
                quantity: commitment.quantity,
                vendor_id: product?.vendor_id,
                image_url: product?.image_url,
                commitment_id: commitment.id,
              }],
              subtotal: totalAmount,
              tax: 0,
              shipping_cost: 0,
              total_amount: totalAmount,
              shipping_address: profile?.default_shipping_address || {},
              billing_address: profile?.default_billing_address || {},
            };

            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert([orderData])
              .select('id')
              .single();

            if (orderError) {
              console.error(`[Process-Group-Buy-Goals] Order creation failed:`, orderError);
              continue;
            }

            // Update commitment
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
            }).catch(err => console.error('[Process-Group-Buy-Goals] Email error:', err));
            
            console.log(`[Process-Group-Buy-Goals] Order ${newOrder.id} created for commitment ${commitment.id}`);

          } else if (commitment.status === 'committed_unpaid') {
            // UNPAID COMMITMENTS: Set deadline and notify
            console.log(`[Process-Group-Buy-Goals] Setting deadline for unpaid commitment ${commitment.id}`);
            
            await supabase
              .from('group_buy_commitments')
              .update({ 
                payment_deadline: paymentDeadline.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', commitment.id);

            // Use APP_BASE_URL for payment link - no hardcoded URLs
            const paymentLink = `${appBaseUrl}/profile/groupbuys`;
            
            await supabase.functions.invoke('send-email', {
              body: {
                to: profile?.email,
                templateId: 'GROUPBUY_SUCCESS_PAYMENT_REQUIRED',
                data: {
                  customer_name: profile?.full_name || 'Customer',
                  product_name: campaign.products?.name,
                  discount_price: campaign.discount_price.toString(),
                  payment_deadline: paymentDeadline.toLocaleString(),
                  payment_link: paymentLink
                }
              }
            }).catch(err => console.error('[Process-Group-Buy-Goals] Email error:', err));

            console.log(`[Process-Group-Buy-Goals] Payment notification sent to ${profile?.email}`);
          }
        }

        // Check if all finalized
        const { data: remainingUnpaid } = await supabase
          .from('group_buy_commitments')
          .select('id')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid'])
          .limit(1);

        if (!remainingUnpaid || remainingUnpaid.length === 0) {
          await supabase
            .from('group_buy_campaigns')
            .update({ status: 'goal_met_paid_finalized', updated_at: new Date().toISOString() })
            .eq('id', campaign.id);
          console.log(`[Process-Group-Buy-Goals] Campaign ${campaign.id} fully finalized`);
        }

      } else {
        // === CAMPAIGN FAILED (expired without reaching goal) ===
        console.log(`[Process-Group-Buy-Goals] Campaign ${campaign.id} failed - did not reach goal`);
        
        await supabase
          .from('group_buy_campaigns')
          .update({ status: 'failed_expired', updated_at: new Date().toISOString() })
          .eq('id', campaign.id);

        // Clear product link
        await supabase
          .from('products')
          .update({ active_group_buy_id: null, updated_at: new Date().toISOString() })
          .eq('active_group_buy_id', campaign.id);

        const { data: commitments } = await supabase
          .from('group_buy_commitments')
          .select('*, profiles:user_id(email, full_name)')
          .eq('campaign_id', campaign.id)
          .in('status', ['committed_unpaid', 'committed_paid']);

        for (const commitment of commitments || []) {
          const profile = commitment.profiles as any;
          
          // Process refund if payment was made
          if (commitment.payment_ref && paystackSecretKey) {
            console.log(`[Process-Group-Buy-Goals] Initiating refund for ${commitment.payment_ref}`);
            
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
              
              if (refundResponse.ok) {
                console.log(`[Process-Group-Buy-Goals] Refund processed for ${commitment.payment_ref}`);
              } else {
                console.error(`[Process-Group-Buy-Goals] Refund failed:`, await refundResponse.text());
              }
            } catch (err) {
              console.error(`[Process-Group-Buy-Goals] Refund error:`, err);
            }
            
            await supabase
              .from('group_buy_commitments')
              .update({ status: 'refunded', updated_at: new Date().toISOString() })
              .eq('id', commitment.id);

          } else {
            await supabase
              .from('group_buy_commitments')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', commitment.id);
          }

          // Send failure notification
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile?.email,
              templateId: 'GROUPBUY_FAILED_REFUND',
              data: {
                customer_name: profile?.full_name || 'Customer',
                product_name: campaign.products?.name,
                reason: 'Campaign did not reach its minimum goal quantity'
              }
            }
          }).catch(err => console.error('[Process-Group-Buy-Goals] Email error:', err));
        }
      }
    }

    console.log('[Process-Group-Buy-Goals] Processing completed');

    return new Response(JSON.stringify({ 
      success: true,
      processedCampaigns: campaignsToProcess.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Process-Group-Buy-Goals] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
