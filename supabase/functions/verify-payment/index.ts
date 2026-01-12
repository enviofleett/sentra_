import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log(`[Verify Payment] Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference, orderId } = await req.json();
    
    if (!reference && !orderId) {
      return new Response(JSON.stringify({ error: "Reference or orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Verify Payment] Verifying reference: ${reference}, orderId: ${orderId}`);

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[Verify Payment] PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get order to find payment reference
    let paymentReference = reference;
    let order = null;
    
    if (orderId && !paymentReference) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, payment_reference, payment_status, paystack_status, total_amount, user_id")
        .eq("id", orderId)
        .single();
      
      if (orderError || !orderData) {
        console.error("[Verify Payment] Order not found:", orderError);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      order = orderData;
      paymentReference = orderData.payment_reference;
    }

    if (!paymentReference) {
      return new Response(JSON.stringify({ error: "No payment reference found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already paid, return success immediately
    if (order && (order.payment_status === 'paid' || order.paystack_status === 'success')) {
      console.log(`[Verify Payment] Order already marked as paid`);
      return new Response(JSON.stringify({ 
        verified: true, 
        status: "success",
        message: "Payment already verified" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Verify Payment] Calling Paystack verify API for: ${paymentReference}`);

    // Call Paystack verify endpoint
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackResponse.json();
    console.log(`[Verify Payment] Paystack response:`, JSON.stringify(paystackData));

    if (!paystackData.status) {
      console.error("[Verify Payment] Paystack API error:", paystackData.message);
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "error",
        message: paystackData.message || "Verification failed" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txData = paystackData.data;
    const txStatus = txData.status; // success, failed, abandoned
    const txAmount = txData.amount; // in kobo
    const txReference = txData.reference;

    console.log(`[Verify Payment] Transaction status: ${txStatus}, Amount: ${txAmount} kobo`);

    if (txStatus === "success") {
      // Get order if we don't have it yet
      if (!order) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, total_amount, user_id, payment_status, paystack_status")
          .eq("payment_reference", txReference)
          .single();
        order = orderData;
      }

      if (order && order.payment_status !== 'paid') {
        // Verify amount matches
        const expectedAmount = Math.round(order.total_amount * 100);
        // Allow some tolerance for fees
        const amountMatches = Math.abs(txAmount - expectedAmount) <= expectedAmount * 0.05; // 5% tolerance for fees
        
        console.log(`[Verify Payment] Amount check - Expected: ~${expectedAmount}, Got: ${txAmount}, Matches: ${amountMatches}`);

        if (amountMatches) {
          // Update order status
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: "processing",
              payment_status: "paid",
              paystack_status: "success",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          if (updateError) {
            console.error("[Verify Payment] Failed to update order:", updateError);
          } else {
            console.log(`[Verify Payment] ✓ Order ${order.id} updated to paid/processing`);
            
            // Record profit split
            try {
              await supabase.rpc('record_profit_split', {
                p_order_id: order.id,
                p_commitment_id: null,
                p_payment_reference: txReference,
                p_total_amount: order.total_amount
              });
              console.log(`[Verify Payment] Profit split recorded`);
            } catch (e) {
              console.error("[Verify Payment] Profit split error (non-blocking):", e);
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        verified: true, 
        status: "success",
        message: "Payment verified successfully",
        amount: txAmount / 100
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (txStatus === "failed" || txStatus === "abandoned") {
      // Update order to failed if needed
      if (order && order.payment_status === 'pending') {
        await supabase
          .from("orders")
          .update({
            paystack_status: txStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }

      return new Response(JSON.stringify({ 
        verified: false, 
        status: txStatus,
        message: `Payment ${txStatus}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Still pending
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "pending",
        message: "Payment still processing" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: any) {
    console.error("[Verify Payment] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
