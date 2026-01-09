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
  recipientFilter: 'all' | 'verified' | 'pending';
}

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, htmlContent, textContent, recipientFilter }: BulkEmailRequest = await req.json();

    console.log('📧 Processing bulk email request:', { subject, recipientFilter });

    // Validate inputs
    if (!subject || !htmlContent) {
      throw new Error('Subject and HTML content are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query based on filter
    let query = supabase.from('waiting_list').select('id, email, full_name');
    
    if (recipientFilter === 'verified') {
      query = query.eq('is_social_verified', true);
    } else if (recipientFilter === 'pending') {
      query = query.eq('is_social_verified', false);
    }

    const { data: recipients, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Failed to fetch recipients:', fetchError);
      throw new Error('Failed to fetch waitlist recipients');
    }

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipients found matching the filter',
          sent: 0,
          failed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Found ${recipients.length} recipients`);

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

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (recipient: WaitlistEntry) => {
        try {
          // Personalize email content
          const personalizedHtml = htmlContent
            .replace(/{{name}}/g, recipient.full_name || 'Valued Customer')
            .replace(/{{email}}/g, recipient.email);
          
          const personalizedText = textContent
            ? textContent
                .replace(/{{name}}/g, recipient.full_name || 'Valued Customer')
                .replace(/{{email}}/g, recipient.email)
            : '';

          await client.send({
            from: `Sentra <${gmailEmail}>`,
            to: recipient.email,
            subject: subject.replace(/{{name}}/g, recipient.full_name || 'Valued Customer'),
            content: personalizedText,
            html: personalizedHtml,
          });

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

    console.log(`✅ Bulk email complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Emails sent successfully`,
        sent,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error details
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error sending bulk email:', error);
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
