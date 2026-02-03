import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { createSmtpClient, minifyHtml } from "../_shared/email-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderUpdateRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  message: string;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new Error('Invalid JSON body');
    }

    const { orderId, customerEmail, customerName, subject, message, status } = body as OrderUpdateRequest;

    if (!orderId || !customerEmail || !message) {
      throw new Error('Missing required fields: orderId, customerEmail, or message');
    }

    console.log(`📧 Sending order update for ${orderId} to ${customerEmail}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      console.error('Missing Gmail credentials');
      throw new Error('Gmail credentials not configured');
    }

    // Note: GMAIL_APP_PASSWORD must be an App Password, not the regular account password.
    // See https://support.google.com/accounts/answer/185833

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="color: #d4af37; font-size: 28px; margin: 0; font-weight: 700;">SENTRA</h1>
              <p style="color: #888; font-size: 12px; margin: 8px 0 0; letter-spacing: 2px;">PREMIUM FRAGRANCES</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px; text-align: center;">Order Update</h2>
              
              <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 12px; margin-bottom: 24px; text-align: center;">
                <span style="color: #888; font-size: 14px;">Order #${orderId}</span>
                <span style="color: #666; margin: 0 8px;">•</span>
                <span style="color: #d4af37; font-weight: 600; font-size: 14px; text-transform: uppercase;">${status}</span>
              </div>

              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${customerName},
              </p>
              
              <div style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px; white-space: pre-wrap;">
                ${message}
              </div>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://sentra.shop/account/orders/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Order</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.3); text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Sentra. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const minifiedHtml = minifyHtml(htmlContent);
    const client = createSmtpClient(gmailEmail, gmailPassword);

    await client.send({
      from: `Sentra <${gmailEmail}>`,
      to: customerEmail,
      subject: subject || `Update on Order #${orderId}`,
      content: message,
      html: minifiedHtml,
    });

    await client.close();

    // Log the communication to Supabase
    const { error: dbError } = await supabase
      .from('order_communications')
      .insert({
        order_id: orderId,
        type: 'email',
        subject: subject || `Update on Order #${orderId}`,
        content: message,
        metadata: { status }
      });
    
    if (dbError) {
      console.error('Failed to log communication:', dbError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error sending order update:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
