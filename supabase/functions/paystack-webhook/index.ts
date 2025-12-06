import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  console.log(`[Paystack Webhook] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[Paystack Webhook] PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    console.log(`[Paystack Webhook] Signature present: ${!!signature}`);

    if (!signature || !await verifySignature(paystackSecretKey, rawBody, signature)) {
      console.error("[Paystack Webhook] Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    console.log(`[Paystack Webhook] Event: ${webhookData.event}, Reference: ${webhookData.data?.reference}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (webhookData.event === "charge.success") {
      const { reference, amount, metadata } = webhookData.data;
      const paymentType = metadata?.type || 'standard_order';

      console.log(`[Paystack Webhook] Processing successful payment - Type: ${paymentType}, Amount: ${amount}, Reference: ${reference}`);

      if (paymentType === 'standard_order') {
        // --- STANDARD ORDER LOGIC ---
        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, paystack_status")
          .eq("payment_reference", reference)
          .single();

        if (fetchError || !order) {
          console.error(`[Paystack Webhook] Order not found for reference: ${reference}`, fetchError);
          return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
        }

        console.log(`[Paystack Webhook] Found order: ${order.id}, Expected amount: ${order.total_amount * 100}, Received: ${amount}`);

        const expectedAmount = order.total_amount * 100;
        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] Amount mismatch for order ${order.id}: expected ${expectedAmount}, got ${amount}`);
          await supabase.from("orders").update({ paystack_status: "amount_mismatch" }).eq("payment_reference", reference);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }

        if (order.paystack_status === 'success') {
          console.log(`[Paystack Webhook] Order ${order.id} already processed, skipping`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "processing",
            paystack_status: "success",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_reference", reference);

        if (updateError) {
          console.error(`[Paystack Webhook] Failed to update order ${order.id}:`, updateError);
          return new Response(JSON.stringify({ error: "Failed to update order" }), { status: 500 });
        }
        
        console.log(`[Paystack Webhook] Order ${order.id} updated successfully to 'processing'`);

      } else if (paymentType === 'group_buy_commitment' || paymentType === 'group_buy_final_payment') {
        // --- GROUP BUY LOGIC ---
        const commitmentId = metadata?.commitment_id;
        if (!commitmentId) {
          console.error("[Paystack Webhook] Group buy payment received without commitment_id in metadata");
          return new Response(JSON.stringify({ error: "Missing commitment ID" }), { status: 400 });
        }

        console.log(`[Paystack Webhook] Processing group buy payment for commitment: ${commitmentId}`);

        const { data: commitment, error: fetchError } = await supabase
          .from("group_buy_commitments")
          .select("id, committed_price, quantity, status")
          .eq("id", commitmentId)
          .single();
        
        if (fetchError || !commitment) {
          console.error(`[Paystack Webhook] Group buy commitment not found: ${commitmentId}`, fetchError);
          return new Response(JSON.stringify({ error: "Commitment not found" }), { status: 404 });
        }

        const expectedAmount = (commitment.committed_price * commitment.quantity) * 100;
        console.log(`[Paystack Webhook] Commitment ${commitmentId} - Expected: ${expectedAmount}, Received: ${amount}`);

        if (amount !== expectedAmount) {
          console.error(`[Paystack Webhook] Amount mismatch for commitment ${commitmentId}: expected ${expectedAmount}, got ${amount}`);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }

        if (commitment.status === 'committed_paid' || commitment.status === 'paid_finalized') {
          console.log(`[Paystack Webhook] Commitment ${commitmentId} already processed, skipping`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        // 1. UPDATE COMMITMENT STATUS to intermediate state
        const { error: updateError } = await supabase
          .from("group_buy_commitments")
          .update({
            status: "committed_paid",
            payment_ref: reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commitmentId);

        if (updateError) {
          console.error(`[Paystack Webhook] Failed to update commitment ${commitmentId}:`, updateError);
          return new Response(JSON.stringify({ error: "Failed to update commitment" }), { status: 500 });
        }
        
        console.log(`[Paystack Webhook] Commitment ${commitmentId} updated to 'committed_paid'`);

        // 2. CRITICAL: CREATE THE FINAL ORDER RECORD
        const { data: commitmentData, error: fetchCommitmentDataError } = await supabase
          .from('group_buy_commitments')
          .select(`
            campaign_id, quantity, committed_price, user_id,
            group_buy_campaigns(
              products(id, name, price, vendor_id, image_url)
            )
          `)
          .eq('id', commitmentId)
          .single();

        if (fetchCommitmentDataError || !commitmentData) {
          console.error('❌ Failed to refetch commitment data for order creation:', fetchCommitmentDataError);
          return new Response(JSON.stringify({ error: "Refetch failed, manual fix needed" }), { status: 200 }); 
        }
        
        // Fetch profile separately
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, default_shipping_address, default_billing_address')
          .eq('id', commitmentData.user_id)
          .single();
        
        const campaign = commitmentData.group_buy_campaigns as any;
        const product = campaign?.products;
        const totalAmountInNaira = Number(commitmentData.committed_price) * commitmentData.quantity;

        const orderData = {
          user_id: commitmentData.user_id,
          customer_email: profile?.email || '',
          status: 'processing',
          payment_status: 'paid',
          paystack_status: 'success',
          payment_reference: reference,
          items: [{
            product_id: product?.id,
            name: product?.name,
            price: Number(commitmentData.committed_price),
            quantity: commitmentData.quantity,
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
          console.error('❌ Failed to create final order:', orderCreationError);
        } else {
          // 3. Update commitment to final state and link order_id
          await supabase
            .from('group_buy_commitments')
            .update({ status: 'paid_finalized', order_id: newOrder.id })
            .eq('id', commitmentId);

          // 4. Send email notification
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
          
          console.log(`✅ Final Order ${newOrder.id} created and commitment finalized.`);
        }

        return new Response(JSON.stringify({ message: "Webhook processed successfully" }), { status: 200 });
      }

      return new Response(JSON.stringify({ message: "Webhook processed successfully" }), { status: 200 });
    }

    if (webhookData.event === "charge.failed") {
      const { reference, metadata } = webhookData.data;
      console.log(`[Paystack Webhook] Failed payment - Reference: ${reference}, Type: ${metadata?.type || 'unknown'}`);
      
      if (metadata?.type === 'standard_order') {
        await supabase
          .from("orders")
          .update({ paystack_status: "failed" })
          .eq("payment_reference", reference);
      }
    }

    console.log(`[Paystack Webhook] Event ${webhookData.event} received and acknowledged`);
    return new Response(JSON.stringify({ message: "Event received" }), { status: 200 });

  } catch (error: any) {
    console.error("[Paystack Webhook] Processing error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
