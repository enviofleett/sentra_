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
        // --- GROUP BUY LOGIC (Pay-to-Book) ---
        // CRITICAL FIX: Only update commitment status to 'committed_paid'
        // Order creation is deferred to process-group-buy-goals when campaign goal is met
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

        // ONLY update commitment status - do NOT create order yet
        // Order will be created by process-group-buy-goals when campaign succeeds
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
        
        console.log(`[Paystack Webhook] Commitment ${commitmentId} updated to 'committed_paid'. Order will be created when campaign goal is met.`);

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
      
      // For group buy commitments, update status to payment_failed
      if (metadata?.type === 'group_buy_commitment' && metadata?.commitment_id) {
        await supabase
          .from("group_buy_commitments")
          .update({ status: "payment_failed" })
          .eq("id", metadata.commitment_id);
      }
    }

    console.log(`[Paystack Webhook] Event ${webhookData.event} received and acknowledged`);
    return new Response(JSON.stringify({ message: "Event received" }), { status: 200 });

  } catch (error: any) {
    console.error("[Paystack Webhook] Processing error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
