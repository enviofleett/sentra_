import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSmtpClient, minifyHtml, stripHtml, sanitizeInput } from "../_shared/email-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreditWalletRequest {
  userId: string;
  amount: number;
  type: 'real' | 'promo';
  description: string;
  adminId: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await userSupabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerId = authData.user.id;

    const { userId, amount, type, description }: CreditWalletRequest = await req.json();

    if (!userId || userId.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Amount must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (type !== "real" && type !== "promo") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid wallet type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!description || description.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: dbResult, error: dbError } = await supabaseClient.rpc('admin_credit_wallet', {
      p_user_id: userId,
      p_amount: Number(amount),
      p_type: type,
      p_description: description,
      p_admin_id: callerId
    });

    if (dbError) {
      return new Response(
        JSON.stringify({ success: false, error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dbResult.success) {
      const err = String(dbResult.error || "Database update failed");
      const status = err.toLowerCase().includes("unauthorized") ? 403 : 400;
      return new Response(
        JSON.stringify({ success: false, error: err }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      profile;
    } else {
      try {
        const smtpClient = createSmtpClient(
          Deno.env.get("SMTP_EMAIL") ?? "",
          Deno.env.get("SMTP_PASSWORD") ?? ""
        );

        const emailSubject = `Wallet Credit Received: ₦${amount.toLocaleString()}`;
        const walletName = type === 'real' ? 'Main Wallet' : 'Promo Wallet';
        
        const htmlContent = minifyHtml(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #000; margin: 0;">Sentra</h1>
            </div>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
              <h2 style="color: #111827; margin-top: 0;">Wallet Credit Received</h2>
              <p>Hello ${sanitizeInput(profile.full_name || 'Customer')},</p>
              
              <p>Your wallet has been credited by our admin team.</p>
              
              <div style="background-color: #ffffff; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #059669;">+₦${amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Wallet:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">${walletName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Reason:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">${sanitizeInput(description)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">New Balance:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">₦${dbResult.new_balance.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                You can use this credit for your next purchase on Sentra.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://sentra.shop/profile/wallet" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">View Wallet</a>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
              <p>&copy; ${new Date().getFullYear()} Sentra. All rights reserved.</p>
            </div>
          </div>
        `);

        await smtpClient.send({
          from: `Sentra <${Deno.env.get("SMTP_EMAIL")}>`,
          to: profile.email,
          subject: emailSubject,
          content: stripHtml(htmlContent),
          html: htmlContent,
        });

        await smtpClient.close();
      } catch (emailError) {
        emailError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newBalance: dbResult.new_balance,
        message: "Wallet credited successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
