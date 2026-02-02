import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * VERIFY-PAYMENT Edge Function
 * 
 * SECURITY ARCHITECTURE:
 * - This function is READ-ONLY - it does NOT update the database
 * - The Paystack webhook is the ONLY source of truth for payment updates
 * - This function is authenticated - users can only verify their own orders
 * - Safe to call repeatedly (idempotent, spam-proof)
 */
Deno.serve(async (req: Request) => {
  console.log(`[Verify Payment] Received ${req.method} request at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================
    // AUTHENTICATION ENFORCEMENT
    // ========================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[Verify Payment] SECURITY: No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's token for auth verification
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await userSupabase.auth.getUser(token);

    if (authError || !authData?.user) {
      console.error("[Verify Payment] SECURITY: Invalid or expired token:", authError?.message);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    console.log(`[Verify Payment] Authenticated user: ${userId}`);

    // Parse request body
    const { reference, orderId } = await req.json();
    
    if (!reference && !orderId) {
      return new Response(JSON.stringify({ error: "Reference or orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Verify Payment] Verifying - reference: ${reference}, orderId: ${orderId}`);

    // Service role client for database reads
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ========================
    // FETCH AND VERIFY ORDER OWNERSHIP
    // ========================
    let paymentReference = reference;
    let order = null;
    
    if (orderId) {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, payment_reference, payment_status, paystack_status, total_amount, user_id, promo_discount_applied")
        .eq("id", orderId)
        .single();
      
      if (orderError || !orderData) {
        console.error("[Verify Payment] Order not found:", orderError);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // SECURITY: Verify the order belongs to the authenticated user
      if (orderData.user_id !== userId) {
        console.error(`[Verify Payment] SECURITY: User ${userId} attempted to access order owned by ${orderData.user_id}`);
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
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

    // ========================
    // CHECK CURRENT STATUS (READ-ONLY)
    // ========================
    // If order is already marked as paid in our database, return success
    if (order && (order.payment_status === 'paid' || order.paystack_status === 'success')) {
      console.log(`[Verify Payment] Order ${order.id} already marked as paid in database`);
      return new Response(JSON.stringify({ 
        verified: true, 
        status: "success",
        message: "Payment already verified" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================
    // VERIFY WITH PAYSTACK API (READ-ONLY)
    // ========================
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("[Verify Payment] PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Verify Payment] Calling Paystack verify API for: ${paymentReference}`);

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
    console.log(`[Verify Payment] Paystack API response status: ${paystackData.status}`);

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
    const txStatus = txData.status; // success, failed, abandoned, pending

    console.log(`[Verify Payment] Paystack transaction status: ${txStatus}`);

    // ========================
    // RETURN READ-ONLY STATUS
    // ========================
    // IMPORTANT: We do NOT update the database here. That is the webhook's job.
    // This function only reports the current status from Paystack.

    if (txStatus === "success") {
      // Verify amount matches (sanity check)
      if (order) {
        const orderTotal = Number(order.total_amount);
        const promoDiscount = Number(order.promo_discount_applied || 0);
        const expectedAmount = Math.round((orderTotal - promoDiscount) * 100);
        
        const amountMatches = txData.amount === expectedAmount;
        console.log(`[Verify Payment] Amount check - Expected: ${expectedAmount}, Got: ${txData.amount}, Matches: ${amountMatches}`);
        
        if (!amountMatches) {
          console.error(`[Verify Payment] SECURITY: Amount mismatch detected`);
          return new Response(JSON.stringify({ 
            verified: false, 
            status: "error",
            message: "Payment amount mismatch - please contact support" 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ 
        verified: true, 
        status: "success",
        message: "Payment confirmed by Paystack"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (txStatus === "failed" || txStatus === "abandoned") {
      return new Response(JSON.stringify({ 
        verified: false, 
        status: txStatus,
        message: `Payment ${txStatus}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // Still pending or unknown status
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
    console.error("[Verify Payment] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
