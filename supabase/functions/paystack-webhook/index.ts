import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to process affiliate commission
async function processAffiliateCommission(
  supabase: any, 
  userId: string, 
  orderId: string, 
  orderAmount: number
): Promise<void> {
  try {
    console.log(`[Paystack Webhook] Checking affiliate commission for user ${userId}`);
    
    // Check if user was referred by someone
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", userId)
      .single();
    
    if (profileError || !profile?.referred_by) {
      console.log(`[Paystack Webhook] No referrer found for user ${userId}`);
      return;
    }
    
    const referrerId = profile.referred_by;
    console.log(`[Paystack Webhook] User ${userId} was referred by ${referrerId}`);
    
    // Get commission percentage from affiliate_config
    const { data: config } = await supabase
      .from("affiliate_config")
      .select("value")
      .eq("key", "commission_percentage")
      .single();
    
    const commissionPercentage = config?.value ?? 5; // Default 5%
    console.log(`[Paystack Webhook] Commission percentage: ${commissionPercentage}%`);
    
    // Call the add_affiliate_commission function
    const { data: transactionId, error: commissionError } = await supabase
      .rpc('add_affiliate_commission', {
        p_referrer_id: referrerId,
        p_order_id: orderId,
        p_order_amount: orderAmount,
        p_commission_percentage: commissionPercentage
      });
    
    if (commissionError) {
      console.error(`[Paystack Webhook] Affiliate commission error:`, commissionError);
      return;
    }
    
    console.log(`[Paystack Webhook] Affiliate commission credited - Transaction: ${transactionId}`);
    
    // Update referral status if exists
    await supabase
      .from("referrals")
      .update({ 
        status: 'converted',
        first_order_id: orderId,
        commission_paid: orderAmount * commissionPercentage / 100,
        updated_at: new Date().toISOString()
      })
      .eq("referred_id", userId)
      .eq("referrer_id", referrerId)
      .eq("status", 'pending');
      
  } catch (error: any) {
    console.error(`[Paystack Webhook] Affiliate commission processing error (non-blocking):`, error.message);
  }
}

// Helper function to verify signature
async function verifySignature(paystackSecretKey: string, rawBody: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(paystackSecretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const hashBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === signature;
}

serve(async (req: Request) => {
  console.log(`[Paystack Webhook] Received ${req.method} request at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[Paystack Webhook] CRITICAL: PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    console.log(`[Paystack Webhook] Signature verification - Present: ${!!signature}`);

    if (!signature || !await verifySignature(paystackSecretKey, rawBody, signature)) {
      console.error("[Paystack Webhook] SECURITY: Invalid webhook signature rejected");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    console.log("[Paystack Webhook] Signature verification: PASSED");

    const webhookData = JSON.parse(rawBody);
    const { event, data } = webhookData;
    const { reference, amount, metadata } = data;

    console.log(`[Paystack Webhook] Event: ${event}`);
    console.log(`[Paystack Webhook] Reference: ${reference}`);
    console.log(`[Paystack Webhook] Amount (kobo): ${amount}`);
    console.log(`[Paystack Webhook] Metadata:`, JSON.stringify(metadata));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event === "charge.success") {
      const paymentType = metadata?.type || 'standard_order';
      console.log(`[Paystack Webhook] Processing SUCCESS - Type: ${paymentType}`);

      if (paymentType === 'standard_order') {
        // --- STANDARD ORDER LOGIC ---
        const orderId = metadata?.order_id;
        console.log(`[Paystack Webhook] Standard Order - Looking up by reference: ${reference}`);

        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, paystack_status, user_id")
          .eq("payment_reference", reference)
          .single();

        if (fetchError || !order) {
          console.error(`[Paystack Webhook] ERROR: Order not found for reference: ${reference}`, fetchError);
          return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
        }

        console.log(`[Paystack Webhook] Found order: ${order.id}`);
        console.log(`[Paystack Webhook] Amount check - Expected: ${order.total_amount * 100} kobo, Received: ${amount} kobo`);

        const expectedAmount = Math.round(order.total_amount * 100);
        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] SECURITY: Amount mismatch for order ${order.id} - Expected ${expectedAmount}, Got ${amount}`);
          await supabase.from("orders").update({ paystack_status: "amount_mismatch" }).eq("payment_reference", reference);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }
        console.log(`[Paystack Webhook] Amount verification: PASSED`);

        if (order.paystack_status === 'success') {
          console.log(`[Paystack Webhook] Order ${order.id} already processed (idempotency check), skipping`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "processing",
            payment_status: "paid",
            paystack_status: "success",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_reference", reference);

        if (updateError) {
          console.error(`[Paystack Webhook] ERROR: Failed to update order ${order.id}:`, updateError);
          return new Response(JSON.stringify({ error: "Failed to update order" }), { status: 500 });
        }
        
        // Record 4-way profit split
        console.log(`[Paystack Webhook] Recording profit split for order ${order.id}`);
        const { data: allocationId, error: splitError } = await supabase
          .rpc('record_profit_split', {
            p_order_id: order.id,
            p_commitment_id: null,
            p_payment_reference: reference,
            p_total_amount: order.total_amount
          });

        if (splitError) {
          console.error(`[Paystack Webhook] Profit split error (non-blocking):`, splitError);
        } else {
          console.log(`[Paystack Webhook] Profit split recorded: ${allocationId}`);
        }
        
        // Process affiliate commission if user was referred
        await processAffiliateCommission(supabase, order.user_id, order.id, order.total_amount);
        
        console.log(`[Paystack Webhook] SUCCESS: Order ${order.id} updated to 'processing'`);
        return new Response(JSON.stringify({ message: "Order processed successfully" }), { status: 200 });

      } else if (paymentType === 'group_buy_commitment') {
        // --- GROUP BUY PAY-TO-BOOK LOGIC ---
        const commitmentId = metadata?.commitment_id;
        if (!commitmentId) {
          console.error("[Paystack Webhook] ERROR: group_buy_commitment payment missing commitment_id");
          return new Response(JSON.stringify({ error: "Missing commitment ID" }), { status: 400 });
        }

        console.log(`[Paystack Webhook] Group Buy Commitment - ID: ${commitmentId}`);

        // Fetch commitment with profile data
        const { data: commitment, error: fetchError } = await supabase
          .from("group_buy_commitments")
          .select(`
            id, committed_price, quantity, status, campaign_id, user_id,
            profiles:user_id(email, full_name, default_shipping_address, default_billing_address)
          `)
          .eq("id", commitmentId)
          .single();
        
        if (fetchError || !commitment) {
          console.error(`[Paystack Webhook] ERROR: Commitment not found: ${commitmentId}`, fetchError);
          return new Response(JSON.stringify({ error: "Commitment not found" }), { status: 404 });
        }

        const expectedAmount = Math.round(commitment.committed_price * commitment.quantity * 100);
        console.log(`[Paystack Webhook] Amount check - Expected: ${expectedAmount} kobo, Received: ${amount} kobo`);

        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] SECURITY: Amount mismatch for commitment ${commitmentId}`);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }
        console.log(`[Paystack Webhook] Amount verification: PASSED`);

        if (commitment.status === 'committed_paid' || commitment.status === 'paid_finalized') {
          console.log(`[Paystack Webhook] Commitment ${commitmentId} already processed (idempotency), skipping`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        // Update commitment to paid
        const { error: updateError } = await supabase
          .from("group_buy_commitments")
          .update({
            status: "committed_paid",
            payment_ref: reference,
            payment_reference: reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commitmentId);

        if (updateError) {
          console.error(`[Paystack Webhook] ERROR: Failed to update commitment ${commitmentId}:`, updateError);
          return new Response(JSON.stringify({ error: "Failed to update commitment" }), { status: 500 });
        }
        
        console.log(`[Paystack Webhook] Commitment ${commitmentId} updated to 'committed_paid'`);

        // Fetch campaign to check if goal is already met
        const { data: campaign, error: campaignError } = await supabase
          .from("group_buy_campaigns")
          .select(`*, products!group_buy_campaigns_product_id_fkey(id, name, price, vendor_id, image_url)`)
          .eq("id", commitment.campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`[Paystack Webhook] Campaign fetch error:`, campaignError);
          // Still return success - commitment was updated
          return new Response(JSON.stringify({ message: "Commitment processed, campaign check skipped" }), { status: 200 });
        }

        // Check if campaign goal is already reached (create order immediately)
        const goalReached = campaign.current_quantity >= campaign.goal_quantity;
        const isGoalMetStatus = ['goal_reached', 'goal_met_pending_payment', 'goal_met_paid_finalized'].includes(campaign.status);
        
        if (goalReached || isGoalMetStatus) {
          console.log(`[Paystack Webhook] Campaign goal already reached - creating order immediately`);
          
          const profile = commitment.profiles as any;
          const product = campaign.products as any;
          const totalAmount = Number(commitment.committed_price) * commitment.quantity;

          const orderData = {
            user_id: commitment.user_id,
            customer_email: profile?.email || '',
            status: 'processing' as const,
            payment_status: 'paid' as const,
            paystack_status: 'success',
            payment_reference: reference,
            items: [{
              product_id: product?.id,
              name: product?.name,
              price: Number(commitment.committed_price),
              quantity: commitment.quantity,
              vendor_id: product?.vendor_id,
              image_url: product?.image_url,
              commitment_id: commitmentId,
            }],
            subtotal: totalAmount,
            tax: 0,
            shipping_cost: 0,
            total_amount: totalAmount,
            shipping_address: profile?.default_shipping_address || {},
            billing_address: profile?.default_billing_address || {},
          };

          const { data: newOrder, error: orderError } = await supabase
            .from("orders")
            .insert([orderData])
            .select("id")
            .single();

          if (orderError) {
            console.error(`[Paystack Webhook] Order creation failed:`, orderError);
            // Commitment is paid, but order failed - log but don't fail webhook
            return new Response(JSON.stringify({ 
              message: "Commitment processed, order creation pending",
              warning: "Order will be created by scheduled job" 
            }), { status: 200 });
          }

          // Update commitment to finalized with order linkage
          await supabase
            .from("group_buy_commitments")
            .update({
              status: "paid_finalized",
              order_id: newOrder.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", commitmentId);

          // Record 4-way profit split for group buy order
          console.log(`[Paystack Webhook] Recording profit split for group buy order ${newOrder.id}`);
          const { data: allocationId, error: splitError } = await supabase
            .rpc('record_profit_split', {
              p_order_id: newOrder.id,
              p_commitment_id: commitmentId,
              p_payment_reference: reference,
              p_total_amount: totalAmount
            });

          if (splitError) {
            console.error(`[Paystack Webhook] Profit split error (non-blocking):`, splitError);
          } else {
            console.log(`[Paystack Webhook] Profit split recorded: ${allocationId}`);
          }
          
          // Process affiliate commission for group buy order
          await processAffiliateCommission(supabase, commitment.user_id, newOrder.id, totalAmount);

          console.log(`[Paystack Webhook] SUCCESS: Order ${newOrder.id} created for commitment ${commitmentId}`);

          // Send confirmation email
          supabase.functions.invoke('send-email', {
            body: {
              to: profile?.email,
              templateId: 'GROUPBUY_SUCCESS_PAID_FINALIZED',
              data: {
                customer_name: profile?.full_name || 'Customer',
                product_name: product?.name,
                order_id: newOrder.id.slice(0, 8),
              }
            }
          }).catch(err => console.error('[Paystack Webhook] Email error (non-blocking):', err));

          return new Response(JSON.stringify({ 
            message: "Commitment processed and order created",
            order_id: newOrder.id 
          }), { status: 200 });
        }

        // Goal not yet reached - order will be created when goal is met
        console.log(`[Paystack Webhook] SUCCESS: Commitment ${commitmentId} paid, awaiting campaign goal`);
        return new Response(JSON.stringify({ message: "Commitment processed successfully" }), { status: 200 });

      } else if (paymentType === 'group_buy_final_payment') {
        // --- GROUP BUY FINAL PAYMENT (pay_on_success mode) ---
        // Campaign goal is already met, CREATE ORDER IMMEDIATELY
        const commitmentId = metadata?.commitment_id;
        if (!commitmentId) {
          console.error("[Paystack Webhook] ERROR: group_buy_final_payment missing commitment_id");
          return new Response(JSON.stringify({ error: "Missing commitment ID" }), { status: 400 });
        }

        console.log(`[Paystack Webhook] Group Buy Final Payment - Commitment ID: ${commitmentId}`);

        // Fetch commitment with campaign and product details using explicit FK hint
        const { data: commitment, error: fetchError } = await supabase
          .from("group_buy_commitments")
          .select(`
            id, committed_price, quantity, status, user_id, campaign_id,
            profiles:user_id(email, full_name, default_shipping_address, default_billing_address)
          `)
          .eq("id", commitmentId)
          .single();
        
        if (fetchError || !commitment) {
          console.error(`[Paystack Webhook] ERROR: Commitment not found: ${commitmentId}`, fetchError);
          return new Response(JSON.stringify({ error: "Commitment not found" }), { status: 404 });
        }

        // Fetch campaign and product separately to avoid ambiguity
        const { data: campaign, error: campaignError } = await supabase
          .from("group_buy_campaigns")
          .select(`*, products!group_buy_campaigns_product_id_fkey(id, name, price, vendor_id, image_url)`)
          .eq("id", commitment.campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`[Paystack Webhook] ERROR: Campaign not found for commitment: ${commitmentId}`, campaignError);
          return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404 });
        }

        const expectedAmount = Math.round(commitment.committed_price * commitment.quantity * 100);
        console.log(`[Paystack Webhook] Amount check - Expected: ${expectedAmount} kobo, Received: ${amount} kobo`);

        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] SECURITY: Amount mismatch for final payment ${commitmentId}`);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }
        console.log(`[Paystack Webhook] Amount verification: PASSED`);

        if (commitment.status === 'paid_finalized' || commitment.status === 'completed') {
          console.log(`[Paystack Webhook] Final payment ${commitmentId} already processed, skipping`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        // CREATE ORDER for final payment
        const profile = commitment.profiles as any;
        const product = campaign.products as any;
        const totalAmount = Number(commitment.committed_price) * commitment.quantity;

        console.log(`[Paystack Webhook] Creating order for user ${commitment.user_id}, product: ${product?.name}`);

        const orderData = {
          user_id: commitment.user_id,
          customer_email: profile?.email || '',
          status: 'processing' as const,
          payment_status: 'paid' as const,
          paystack_status: 'success',
          payment_reference: reference,
          items: [{
            product_id: product?.id,
            name: product?.name,
            price: Number(commitment.committed_price),
            quantity: commitment.quantity,
            vendor_id: product?.vendor_id,
            image_url: product?.image_url,
            commitment_id: commitmentId,
          }],
          subtotal: totalAmount,
          tax: 0,
          shipping_cost: 0,
          total_amount: totalAmount,
          shipping_address: profile?.default_shipping_address || {},
          billing_address: profile?.default_billing_address || {},
        };

        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert([orderData])
          .select("id")
          .single();

        if (orderError) {
          console.error(`[Paystack Webhook] ERROR: Failed to create order:`, orderError);
          return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500 });
        }

        console.log(`[Paystack Webhook] Order created: ${newOrder.id}`);

        // Update commitment to finalized with order linkage
        const { error: updateError } = await supabase
          .from("group_buy_commitments")
          .update({
            status: "paid_finalized",
            payment_ref: reference,
            payment_reference: reference,
            order_id: newOrder.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commitmentId);

        if (updateError) {
          console.error(`[Paystack Webhook] ERROR: Failed to update commitment ${commitmentId}:`, updateError);
          // Order was created, log but don't fail
        }

        // Record 4-way profit split for final payment
        console.log(`[Paystack Webhook] Recording profit split for final payment order ${newOrder.id}`);
        const { data: allocationId, error: splitError } = await supabase
          .rpc('record_profit_split', {
            p_order_id: newOrder.id,
            p_commitment_id: commitmentId,
            p_payment_reference: reference,
            p_total_amount: totalAmount
          });

        if (splitError) {
          console.error(`[Paystack Webhook] Profit split error (non-blocking):`, splitError);
        } else {
          console.log(`[Paystack Webhook] Profit split recorded: ${allocationId}`);
        }
        
        // Process affiliate commission for final payment order
        await processAffiliateCommission(supabase, commitment.user_id, newOrder.id, totalAmount);
        
        console.log(`[Paystack Webhook] SUCCESS: Final payment processed - Order ${newOrder.id} created, Commitment ${commitmentId} finalized`);

        // Send confirmation email (fire and forget)
        supabase.functions.invoke('send-email', {
          body: {
            to: profile?.email,
            templateId: 'GROUPBUY_SUCCESS_PAID_FINALIZED',
            data: {
              customer_name: profile?.full_name || 'Customer',
              product_name: product?.name,
              order_id: newOrder.id.slice(0, 8),
            }
          }
        }).catch(err => console.error('[Paystack Webhook] Email error (non-blocking):', err));

        return new Response(JSON.stringify({ 
          message: "Final payment processed successfully",
          order_id: newOrder.id 
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ message: "Webhook processed" }), { status: 200 });
    }

    if (event === "charge.failed") {
      console.log(`[Paystack Webhook] Processing FAILED payment - Reference: ${reference}`);
      
      if (metadata?.type === 'standard_order') {
        console.log(`[Paystack Webhook] Updating standard order to failed`);
        await supabase
          .from("orders")
          .update({ 
            paystack_status: "failed",
            payment_status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("payment_reference", reference);
      }
      
      if ((metadata?.type === 'group_buy_commitment' || metadata?.type === 'group_buy_final_payment') && metadata?.commitment_id) {
        console.log(`[Paystack Webhook] Updating commitment ${metadata.commitment_id} to payment_failed`);
        await supabase
          .from("group_buy_commitments")
          .update({ 
            status: "payment_failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", metadata.commitment_id);
      }

      return new Response(JSON.stringify({ message: "Failed payment recorded" }), { status: 200 });
    }

    console.log(`[Paystack Webhook] Event ${event} acknowledged (no action required)`);
    return new Response(JSON.stringify({ message: "Event received" }), { status: 200 });

  } catch (error: any) {
    console.error("[Paystack Webhook] CRITICAL ERROR:", error.message);
    console.error("[Paystack Webhook] Stack:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
