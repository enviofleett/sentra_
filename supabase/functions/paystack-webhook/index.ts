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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature || !await verifySignature(paystackSecretKey, rawBody, signature)) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    console.log("Verified Paystack webhook:", webhookData.event);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (webhookData.event === "charge.success") {
      const { reference, amount, metadata } = webhookData.data;
      const paymentType = metadata?.type || 'standard_order';

      console.log(`Processing successful payment for type: ${paymentType}`);

      if (paymentType === 'standard_order') {
        // --- STANDARD ORDER LOGIC ---
        const orderId = reference;
        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_amount, paystack_status")
          .eq("id", orderId)
          .single();

        if (fetchError || !order) {
          console.error("Order not found:", orderId);
          return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
        }

        const expectedAmount = order.total_amount * 100;
        if (amount !== expectedAmount) {
          console.error(`Amount mismatch for order ${orderId}: expected ${expectedAmount}, got ${amount}`);
          await supabase.from("orders").update({ paystack_status: "amount_mismatch", paystack_reference: reference }).eq("id", orderId);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }

        if (order.paystack_status === 'success') {
          console.log(`Order ${orderId} already processed`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        await supabase
          .from("orders")
          .update({
            status: "processing",
            paystack_reference: reference,
            paystack_status: "success",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        
        console.log(`Order ${orderId} updated successfully`);

      } else if (paymentType === 'group_buy_commitment' || paymentType === 'group_buy_final_payment') {
        // --- GROUP BUY LOGIC (NEW) ---
        const commitmentId = metadata?.commitment_id;
        if (!commitmentId) {
          console.error("Group buy payment received without commitment_id in metadata");
          return new Response(JSON.stringify({ error: "Missing commitment ID" }), { status: 400 });
        }

        const { data: commitment, error: fetchError } = await supabase
          .from("group_buy_commitments")
          .select("id, committed_price, quantity, status")
          .eq("id", commitmentId)
          .single();
        
        if (fetchError || !commitment) {
          console.error("Group buy commitment not found:", commitmentId);
          return new Response(JSON.stringify({ error: "Commitment not found" }), { status: 404 });
        }

        const expectedAmount = (commitment.committed_price * commitment.quantity) * 100;
        if (amount !== expectedAmount) {
          console.error(`Amount mismatch for commitment ${commitmentId}: expected ${expectedAmount}, got ${amount}`);
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }

        if (commitment.status === 'committed_paid') {
          console.log(`Commitment ${commitmentId} already processed`);
          return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
        }

        await supabase
          .from("group_buy_commitments")
          .update({
            status: "committed_paid",
            payment_ref: reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", commitmentId);
        
        console.log(`Group buy commitment ${commitmentId} updated successfully`);
      }

      return new Response(JSON.stringify({ message: "Webhook processed successfully" }), { status: 200 });
    }

    if (webhookData.event === "charge.failed") {
      // You could also add logic here to update commitment status if needed
      console.log(`Failed payment for reference: ${webhookData.data.reference}`);
    }

    return new Response(JSON.stringify({ message: "Event received" }), { status: 200 });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

