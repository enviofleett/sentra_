import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the raw request body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("Missing Paystack signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature using Web Crypto API
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

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the verified webhook data
    const webhookData = JSON.parse(rawBody);
    console.log("Verified Paystack webhook:", webhookData.event);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different webhook events
    if (webhookData.event === "charge.success") {
      const { data, reference, amount } = webhookData.data;
      
      // The reference is the order ID
      const orderId = reference;

      console.log(`Processing successful payment for order: ${orderId}`);

      // Fetch the order to validate amount
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError || !order) {
        console.error("Order not found:", orderId);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate amount (convert from kobo to naira)
      const expectedAmount = order.total_amount * 100;
      if (amount !== expectedAmount) {
        console.error(`Amount mismatch: expected ${expectedAmount}, got ${amount}`);
        
        // Update order with failed status
        await supabase
          .from("orders")
          .update({
            paystack_status: "amount_mismatch",
            paystack_reference: reference,
          })
          .eq("id", orderId);

        return new Response(
          JSON.stringify({ error: "Amount mismatch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for duplicate processing (idempotency)
      if (order.paystack_reference === reference && order.status !== "pending") {
        console.log(`Order ${orderId} already processed`);
        return new Response(
          JSON.stringify({ message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order status to processing
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "processing",
          paystack_reference: reference,
          paystack_status: "success",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update order:", updateError);
        throw updateError;
      }

      console.log(`Order ${orderId} updated successfully`);

      // TODO: Trigger email notification via send-email function
      // await supabase.functions.invoke('send-email', {
      //   body: {
      //     to: order.customer_email,
      //     templateId: 'ORDER_CONFIRMATION',
      //     data: {
      //       customer_name: order.shipping_address.fullName,
      //       order_id: orderId.slice(0, 8),
      //       total_amount: order.total_amount.toLocaleString()
      //     }
      //   }
      // });

      return new Response(
        JSON.stringify({ message: "Webhook processed successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle failed payment
    if (webhookData.event === "charge.failed") {
      const { reference } = webhookData.data;
      const orderId = reference;

      console.log(`Processing failed payment for order: ${orderId}`);

      await supabase
        .from("orders")
        .update({
          paystack_status: "failed",
          paystack_reference: reference,
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ message: "Failed payment recorded" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log unhandled event types
    console.log(`Unhandled Paystack event: ${webhookData.event}`);

    return new Response(
      JSON.stringify({ message: "Event received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
