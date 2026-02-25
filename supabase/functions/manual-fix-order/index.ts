
/// <reference path="../_types/deno-modules.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id, payment_reference } = await req.json();

    if (!order_id && !payment_reference) {
      return new Response(JSON.stringify({ error: "order_id or payment_reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Global Search Logic
    const searchString = order_id || payment_reference;
    let foundRecord = null;
    let foundTable = "";

    // 1. Search Orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(1000); // Fetch recent 1000 to search in memory

    if (orders) {
        foundRecord = orders.find((o: any) => 
            o.id.includes(searchString) || 
            (o.payment_reference && o.payment_reference.includes(searchString))
        );
        if (foundRecord) foundTable = "orders";
    }

    // 2. Search Commitments if not found
    if (!foundRecord) {
        const { data: commitments } = await supabase
            .from("group_buy_commitments")
            .select("*")
            .order('created_at', { ascending: false })
            .limit(1000);
            
        if (commitments) {
            foundRecord = commitments.find((c: any) => 
                c.id.includes(searchString) || 
                (c.payment_reference && c.payment_reference.includes(searchString))
            );
            if (foundRecord) foundTable = "group_buy_commitments";
        }
    }

    if (!foundRecord) {
      return new Response(JSON.stringify({ error: "Order/Commitment not found in recent records" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If found, update
     if (foundTable === "orders") {
         const order = foundRecord;
         // Update both status AND payment_reference to ensure consistency
         const { error: updateError } = await supabase
           .from("orders")
           .update({
             status: "processing", // changed from 'completed' to 'processing' based on enum
             payment_status: "paid",
             paystack_status: "success",
             // If we searched by reference, ensure it's set. If searched by ID, keep existing or set if missing.
             // Here we just ensure it matches what we found or what was passed if it was a reference search
             updated_at: new Date().toISOString(),
           })
           .eq("id", order.id);

         if (updateError) {
           return new Response(JSON.stringify({ error: "Failed to update order", details: updateError }), {
             status: 500,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
           });
         }

         const { data: userProfile } = await supabase
           .from('profiles')
           .select('email, full_name')
           .eq('id', order.user_id)
           .single();

         let emailSent = false;
         if (userProfile?.email) {
           const emailRes = await supabase.functions.invoke('send-email', {
             body: {
               to: userProfile.email,
               templateId: 'order_update',
               data: {
                 customerName: userProfile.full_name || 'Customer',
                 orderId: order.id.slice(0, 8),
                 status: 'Payment Successful - Order Processing'
               }
             }
           });
           if (!emailRes.error) emailSent = true;
         }

         return new Response(JSON.stringify({ 
           message: "Order updated successfully", 
           order_id: order.id,
           new_status: "processing",
           email_sent: emailSent
         }), {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
     } else if (foundTable === "group_buy_commitments") {
        // Handle commitment update if needed (similar logic)
        const commitment = foundRecord;
        const { error: updateError } = await supabase
            .from("group_buy_commitments")
            .update({
                status: "active", // or whatever successful status is
                updated_at: new Date().toISOString()
            })
            .eq("id", commitment.id);
            
        if (updateError) {
            return new Response(JSON.stringify({ error: "Failed to update commitment", details: updateError }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        return new Response(JSON.stringify({
            message: "Group Buy Commitment updated successfully",
            commitment_id: commitment.id,
            new_status: "active"
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } else {
        return new Response(JSON.stringify({ error: "Unknown table type found" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
