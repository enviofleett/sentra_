import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSmtpClient, minifyHtml } from "../_shared/email-utils.ts";

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

// Helper function to notify admins
async function notifyAdminsOfNewOrder(
  supabase: any, 
  orderId: string, 
  amount: number, 
  customerName: string
) {
  try {
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      console.warn('[Paystack Webhook] Admin notification skipped: Gmail credentials missing');
      return;
    }

    console.log(`[Paystack Webhook] Notifying admins for order ${orderId}`);
    
    // 1. Fetch admin emails
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
      
    if (!adminRoles || adminRoles.length === 0) {
      console.log('[Paystack Webhook] No admins found');
      return;
    }
    
    const adminIds = adminRoles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .in('id', adminIds);
      
    if (!profiles || profiles.length === 0) return;
    
    const adminEmails = profiles.map((p: any) => p.email).filter((e: any) => e);
    
    if (adminEmails.length === 0) {
      console.log('[Paystack Webhook] No admin emails found');
      return;
    }
    
    console.log(`[Paystack Webhook] Found ${adminEmails.length} admin(s)`);

    // 2. Prepare email content
    const subject = `New Order Received: #${orderId.slice(0, 8)}`;
    const amountFormatted = (amount / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
    
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #d4af37;">New Order Notification</h2>
        <p>A new order has been successfully paid.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Order ID:</strong> #${orderId.slice(0, 8)}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Amount:</strong> ${amountFormatted}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <a href="https://sentra.shop/admin/orders" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
      </div>
    `;

    const minifiedHtml = minifyHtml(htmlContent);
    const client = createSmtpClient(gmailEmail, gmailPassword);

    // 3. Send emails via BCC
    await client.send({
      from: `Sentra Admin <${gmailEmail}>`,
      to: gmailEmail, 
      bcc: adminEmails,
      subject: subject,
      html: minifiedHtml,
    });
    
    await client.close();
    console.log('[Paystack Webhook] Admin notifications sent');
    
  } catch (error) {
    console.error('[Paystack Webhook] Failed to notify admins:', error);
  }
}

Deno.serve(async (req: Request) => {
  const requestTime = new Date().toISOString();
  console.log(`[Paystack Webhook] ========================================`);
  console.log(`[Paystack Webhook] Received ${req.method} request at ${requestTime}`);
  console.log(`[Paystack Webhook] URL: ${req.url}`);
  
  // Log all headers for debugging
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = key.toLowerCase().includes('authorization') ? '[REDACTED]' : value;
  });
  console.log(`[Paystack Webhook] Headers:`, JSON.stringify(headers));

  if (req.method === "OPTIONS") {
    console.log(`[Paystack Webhook] Responding to OPTIONS preflight`);
    return new Response(null, { headers: corsHeaders });
  }
  
  // Handle GET requests (for testing the endpoint)
  if (req.method === "GET") {
    console.log(`[Paystack Webhook] GET request - returning health check`);
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "Paystack webhook endpoint is active",
      timestamp: requestTime 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[Paystack Webhook] CRITICAL: PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    console.log(`[Paystack Webhook] PAYSTACK_SECRET_KEY is configured (length: ${paystackSecretKey.length})`);

    const rawBody = await req.text();
    console.log(`[Paystack Webhook] Raw body length: ${rawBody.length} characters`);
    console.log(`[Paystack Webhook] Raw body preview: ${rawBody.substring(0, 200)}...`);
    
    const signature = req.headers.get("x-paystack-signature");
    console.log(`[Paystack Webhook] Signature present: ${!!signature}`);
    if (signature) {
      console.log(`[Paystack Webhook] Signature value: ${signature.substring(0, 20)}...`);
    }

    if (!signature) {
      console.error("[Paystack Webhook] SECURITY: No signature provided - rejecting request");
      return new Response(JSON.stringify({ error: "Missing signature" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const isValidSignature = await verifySignature(paystackSecretKey, rawBody, signature);
    console.log(`[Paystack Webhook] Signature verification result: ${isValidSignature}`);
    
    if (!isValidSignature) {
      console.error("[Paystack Webhook] SECURITY: Invalid webhook signature rejected");
      console.error("[Paystack Webhook] This could mean the PAYSTACK_SECRET_KEY doesn't match the one in Paystack dashboard");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[Paystack Webhook] ✓ Signature verification: PASSED");

    const webhookData = JSON.parse(rawBody);
    const { event, data } = webhookData;
    const { reference, amount, metadata, status: paystackStatus, gateway_response } = data;

    console.log(`[Paystack Webhook] Event Type: ${event}`);
    console.log(`[Paystack Webhook] Reference: ${reference}`);
    console.log(`[Paystack Webhook] Amount (kobo): ${amount}`);
    console.log(`[Paystack Webhook] Paystack Status: ${paystackStatus}`);
    console.log(`[Paystack Webhook] Gateway Response: ${gateway_response}`);
    console.log(`[Paystack Webhook] Metadata:`, JSON.stringify(metadata));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log(`[Paystack Webhook] Supabase client initialized`);

    if (event === "charge.success") {
      const paymentType = metadata?.type || 'standard_order';
      console.log(`[Paystack Webhook] Processing SUCCESS - Type: ${paymentType}`);

      if (paymentType === 'standard_order') {
        // --- STANDARD ORDER LOGIC ---
        const orderId = metadata?.order_id;
        console.log(`[Paystack Webhook] Standard Order - Looking up by reference: ${reference}`);

        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, paystack_status, user_id, promo_discount_applied")
          .eq("payment_reference", reference)
          .single();

        if (fetchError || !order) {
          console.error(`[Paystack Webhook] ERROR: Order not found for reference: ${reference}`, fetchError);
          // Return 200 to prevent Paystack retries - order may have been deleted
          return new Response(JSON.stringify({ received: true, error: "Order not found" }), { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log(`[Paystack Webhook] Found order: ${order.id}`);
        
        // STRICT EQUALITY: Customer pays exact order total (less promo), merchant absorbs fees
        // Adjust expected amount by subtracting any applied promo discount
        const orderTotal = Number(order.total_amount);
        const promoDiscount = Number(order.promo_discount_applied || 0);
        const expectedAmount = Math.round((orderTotal - promoDiscount) * 100);
        
        console.log(`[Paystack Webhook] Amount check - Order Total: ₦${orderTotal}, Promo: ₦${promoDiscount}`);
        console.log(`[Paystack Webhook] Amount check - Expected: ${expectedAmount} kobo, Received: ${amount} kobo`);

        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] SECURITY: Amount mismatch for order ${order.id} - Expected ${expectedAmount}, Got ${amount}`);
          
          // Update order with mismatch status but return 200 to prevent retries
          await supabase.from("orders").update({ 
            paystack_status: "amount_mismatch",
            updated_at: new Date().toISOString()
          }).eq("payment_reference", reference);

          // Fetch user profile for email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', order.user_id)
            .single();

          // Send discrepancy email (fire and forget)
          if (profile?.email) {
            console.log(`[Paystack Webhook] Sending discrepancy email to ${profile.email}`);
            supabase.functions.invoke('send-email', {
              body: {
                to: profile.email,
                templateId: 'PAYMENT_DISCREPANCY',
                data: {
                  customer_name: profile.full_name || 'Customer',
                  order_id: order.id.slice(0, 8),
                  expected_amount: (expectedAmount / 100).toLocaleString(),
                  paid_amount: (amount / 100).toLocaleString(),
                }
              }
            }).catch(err => console.error('[Paystack Webhook] Discrepancy email error:', err));
          }
          
          return new Response(JSON.stringify({ 
            received: true, 
            error: "Amount mismatch" 
          }), { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
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
        
        // Notify admins
        const { data: profileName } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.user_id)
          .single();
          
        await notifyAdminsOfNewOrder(
          supabase, 
          order.id, 
          amount, // Use the amount from Paystack (kobo)
          profileName?.full_name || 'Customer'
        );

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
          
          const profile = commitment.profiles as any;
          if (profile?.email) {
             console.log(`[Paystack Webhook] Sending discrepancy email to ${profile.email}`);
             supabase.functions.invoke('send-email', {
              body: {
                to: profile.email,
                templateId: 'PAYMENT_DISCREPANCY',
                data: {
                  customer_name: profile.full_name || 'Customer',
                  order_id: commitmentId.slice(0, 8),
                  expected_amount: (expectedAmount / 100).toLocaleString(),
                  paid_amount: (amount / 100).toLocaleString(),
                }
              }
            }).catch((err: any) => console.error('[Paystack Webhook] Discrepancy email error:', err));
          }

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

          // Notify admins
          await notifyAdminsOfNewOrder(
            supabase, 
            newOrder.id, 
            totalAmount * 100, // Convert Naira to Kobo
            profile?.full_name || 'Customer'
          );

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
          
          const profile = commitment.profiles as any;
          if (profile?.email) {
             console.log(`[Paystack Webhook] Sending discrepancy email to ${profile.email}`);
             supabase.functions.invoke('send-email', {
              body: {
                to: profile.email,
                templateId: 'PAYMENT_DISCREPANCY',
                data: {
                  customer_name: profile.full_name || 'Customer',
                  order_id: commitmentId.slice(0, 8),
                  expected_amount: (expectedAmount / 100).toLocaleString(),
                  paid_amount: (amount / 100).toLocaleString(),
                }
              }
            }).catch((err: any) => console.error('[Paystack Webhook] Discrepancy email error:', err));
          }

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
        
        // Notify admins
        await notifyAdminsOfNewOrder(
          supabase, 
          newOrder.id, 
          totalAmount * 100, // Convert Naira to Kobo
          profile?.full_name || 'Customer'
        );

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
      } else if (paymentType === 'membership_deposit') {
        // --- MEMBERSHIP WALLET DEPOSIT ---
        const userId = metadata?.user_id;
        if (!userId) {
          console.error("[Paystack Webhook] ERROR: membership_deposit missing user_id");
          return new Response(JSON.stringify({ error: "Missing user ID" }), { status: 400 });
        }

        console.log(`[Paystack Webhook] Membership Deposit - User ID: ${userId}`);

        // Credit the membership wallet
        const depositAmount = amount / 100; // Convert from kobo
        const { data: transactionId, error: creditError } = await supabase
          .rpc('credit_membership_wallet', {
            p_user_id: userId,
            p_amount: depositAmount,
            p_reference: reference,
            p_description: 'Membership deposit via Paystack'
          });

        if (creditError) {
          console.error(`[Paystack Webhook] Membership credit error:`, creditError);
          return new Response(JSON.stringify({ error: "Failed to credit wallet" }), { status: 500 });
        }

        console.log(`[Paystack Webhook] SUCCESS: Membership wallet credited - Transaction: ${transactionId}`);
        
        // Send confirmation email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              templateId: 'MEMBERSHIP_DEPOSIT_SUCCESS',
              data: {
                customer_name: profile.full_name || 'Member',
                amount: depositAmount.toLocaleString(),
              }
            }
          }).catch(err => console.error('[Paystack Webhook] Email error:', err));
        }

        return new Response(JSON.stringify({ 
          message: "Membership deposit processed",
          transaction_id: transactionId 
        }), { status: 200 });
      } else if (paymentType === 'agent_subscription') {
        // Agent subscription logic has been retired. Acknowledge legacy webhook payloads.
        console.log("[Paystack Webhook] agent_subscription payload received; feature retired, no-op acknowledged.");
        return new Response(JSON.stringify({ 
          message: "Agent subscription flow retired; no-op acknowledged" 
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
    // IMPORTANT: Always return 200 to Paystack to prevent retry storms
    // The error has been logged and can be investigated manually
    return new Response(JSON.stringify({ 
      received: true, 
      error: "Internal processing error - logged for review" 
    }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
