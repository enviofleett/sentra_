import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipientFilter: 'all' | 'verified' | 'pending' | 'customers' | 'all_users';
  campaignId?: string;
  testEmail?: string;
}

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
}

/**
 * Minifies HTML content to prevent quoted-printable encoding issues
 * Removes unnecessary whitespace that can cause =20 artifacts in emails
 */
function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n/g, '')
    .trim();
}

/**
 * Strips HTML tags for plain text email version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, htmlContent, textContent, recipientFilter, campaignId, testEmail }: BulkEmailRequest = await req.json();

    console.log('📧 Processing email request:', { subject, recipientFilter, campaignId, testEmail: !!testEmail });

    // Validate inputs
    if (!subject || !htmlContent) {
      throw new Error('Subject and HTML content are required');
    }

    // Configure SMTP client
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailEmail,
          password: gmailPassword,
        },
      },
    });

    console.log('✅ SMTP client created');

    // If testEmail is provided, send only to that address
    if (testEmail) {
      console.log(`📧 Sending test email to: ${testEmail}`);
      
      // Personalize with sample data
      let personalizedHtml = htmlContent
        .replace(/{{name}}/g, 'Test User')
        .replace(/{{email}}/g, testEmail);
      
      // Minify HTML to prevent =20 encoding artifacts
      const minifiedHtml = minifyHtml(personalizedHtml);
      
      // Generate plain text from HTML if not provided
      const plainText = textContent 
        ? textContent.replace(/{{name}}/g, 'Test User').replace(/{{email}}/g, testEmail)
        : stripHtml(personalizedHtml);

      try {
        console.log(`📧 Attempting to send to: ${testEmail}`);
        console.log(`📧 From: Sentra <${gmailEmail}>`);
        console.log(`📧 Subject: [TEST] ${subject.replace(/{{name}}/g, 'Test User')}`);
        
        await client.send({
          from: `Sentra <${gmailEmail}>`,
          to: testEmail,
          subject: `[TEST] ${subject.replace(/{{name}}/g, 'Test User')}`,
          content: plainText,
          html: minifiedHtml,
        });
        
        await client.close();
        
        console.log('✅ Test email sent successfully to:', testEmail);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Test email sent to ${testEmail}. Check spam folder if not in inbox.`,
            isTest: true,
            sentFrom: gmailEmail
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        console.error('❌ Test email SMTP error:', err);
        try {
          await client.close();
        } catch (closeErr) {
          console.error('❌ Error closing client:', closeErr);
        }
        throw new Error(`Failed to send test email: ${err.message}`);
      }
    }

    // Initialize Supabase client for bulk sending
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create tracking base URL
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/track-email`;

    // Build query based on filter
    let recipients: { id: string; email: string; full_name: string | null }[] = [];
    
    if (recipientFilter === 'customers') {
      // Fetch all customers from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');
        
      if (error) throw error;
      recipients = data || [];
      
    } else if (recipientFilter === 'all_users') {
      // Fetch customers
      const { data: customers, error: customerError } = await supabase
        .from('profiles')
        .select('id, email, full_name');
      
      if (customerError) throw customerError;

      // Fetch waiting list
      const { data: waitlist, error: waitlistError } = await supabase
        .from('waiting_list')
        .select('id, email, full_name');
        
      if (waitlistError) throw waitlistError;

      // Deduplicate by email
      const emailMap = new Map();
      
      (customers || []).forEach((c: any) => emailMap.set(c.email, c));
      (waitlist || []).forEach((w: any) => {
        if (!emailMap.has(w.email)) {
          emailMap.set(w.email, w);
        }
      });
      
      recipients = Array.from(emailMap.values());

    } else {
      // Default: Fetch from waiting_list
      let query = supabase.from('waiting_list').select('id, email, full_name');
      
      if (recipientFilter === 'verified') {
        query = query.eq('is_social_verified', true);
      } else if (recipientFilter === 'pending') {
        query = query.eq('is_social_verified', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      recipients = data || [];
    }

    if (!recipients || recipients.length === 0) {
      await client.close();
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipients found matching the filter',
          sent: 0,
          failed: 0,
          campaignId: campaignId || null
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Found ${recipients.length} recipients`);

    // Update campaign with recipient count if campaignId provided
    if (campaignId) {
      await supabase
        .from('email_campaigns')
        .update({ total_recipients: recipients.length })
        .eq('id', campaignId);
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (recipient: WaitlistEntry) => {
        try {
          const recipientName = recipient.full_name || 'Valued Customer';
          
          // Personalize email content
          let personalizedHtml = htmlContent
            .replace(/{{name}}/g, recipientName)
            .replace(/{{email}}/g, recipient.email);
          
          // Add tracking pixel if campaign is being tracked
          if (campaignId) {
            const encodedEmail = encodeURIComponent(recipient.email);
            const trackingPixel = `<img src="${trackingBaseUrl}?c=${campaignId}&e=${encodedEmail}&t=opened" width="1" height="1" style="display:none;" alt="" />`;
            
            // Insert tracking pixel before closing body tag
            if (personalizedHtml.includes('</body>')) {
              personalizedHtml = personalizedHtml.replace('</body>', `${trackingPixel}</body>`);
            } else {
              personalizedHtml += trackingPixel;
            }

            // Wrap links with click tracking
            personalizedHtml = personalizedHtml.replace(
              /href="(https?:\/\/[^"]+)"/g,
              (match, url) => {
                const encodedUrl = encodeURIComponent(url);
                return `href="${trackingBaseUrl}?c=${campaignId}&e=${encodedEmail}&t=clicked&r=${encodedUrl}"`;
              }
            );
          }
          
          // Minify HTML to prevent =20 encoding artifacts
          const minifiedHtml = minifyHtml(personalizedHtml);
          
          // Generate plain text from HTML if not provided
          const personalizedText = textContent
            ? textContent.replace(/{{name}}/g, recipientName).replace(/{{email}}/g, recipient.email)
            : stripHtml(personalizedHtml);

          await client.send({
            from: `Sentra <${gmailEmail}>`,
            to: recipient.email,
            subject: subject.replace(/{{name}}/g, recipientName),
            content: personalizedText,
            html: minifiedHtml,
          });

          // Record sent event
          if (campaignId) {
            await supabase
              .from('email_tracking_events')
              .insert({
                campaign_id: campaignId,
                recipient_email: recipient.email,
                event_type: 'sent'
              });
          }

          console.log(`✅ Email sent to ${recipient.email}`);
          return { success: true, email: recipient.email };
        } catch (err: any) {
          console.error(`❌ Failed to send to ${recipient.email}:`, err.message);
          return { success: false, email: recipient.email, error: err.message };
        }
      });

      const results = await Promise.all(batchPromises);
      
      results.forEach(result => {
        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${result.email}: ${result.error}`);
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    await client.close();

    // Update campaign with final counts
    if (campaignId) {
      await supabase
        .from('email_campaigns')
        .update({ 
          sent_count: sent, 
          failed_count: failed,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);
    }

    console.log(`✅ Bulk email complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Emails sent successfully`,
        sent,
        failed,
        campaignId: campaignId || null,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        sent: 0,
        failed: 0 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
