import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  templateId: string;
  data: { [key: string]: string | number };
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

/**
 * Sanitizes user input for safe inclusion in emails
 */
function sanitizeInput(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, templateId, data }: EmailRequest = await req.json();

    console.log('📧 Processing email request:', { to, templateId });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check unsubscribe list for this recipient
    const { data: unsubscribe } = await supabase
      .from('email_unsubscribes')
      .select('id')
      .eq('email', to.toLowerCase())
      .maybeSingle();

    if (unsubscribe) {
      console.log(`⏭️ Skipping email to ${to} because they unsubscribed`);
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'unsubscribed',
          to,
          subject: ''
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (templateError || !template) {
      console.error('❌ Template not found:', templateId);
      throw new Error(`Email template not found: ${templateId}`);
    }

    console.log('✅ Template fetched:', template.subject);

    // Compile template with data - sanitize all inputs
    let compiledHtml = template.html_content;
    let compiledSubject = template.subject;
    let compiledText = template.text_content || '';

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      // Sanitize values to prevent injection
      const sanitizedValue = sanitizeInput(String(value));
      compiledHtml = compiledHtml.replace(regex, sanitizedValue);
      compiledSubject = compiledSubject.replace(regex, String(value));
      compiledText = compiledText.replace(regex, String(value));
    });

    const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://sentra.ng';
    const encodedEmail = encodeURIComponent(to.toLowerCase());
    const unsubscribeLink = `${baseUrl}/functions/v1/track-email?c=system&e=${encodedEmail}&t=clicked&u=1`;

    compiledHtml = compiledHtml.replace(/{{unsubscribe_link}}/g, unsubscribeLink);
    compiledText = compiledText.replace(/{{unsubscribe_link}}/g, unsubscribeLink);

    // Minify HTML to prevent =20 encoding artifacts
    const minifiedHtml = minifyHtml(compiledHtml);
    const plainText = compiledText || stripHtml(compiledHtml);

    console.log('✅ Template compiled for:', to);

    // Configure SMTP with Gmail
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

    // Send email with Sentra branding
    await client.send({
      from: `Sentra <${gmailEmail}>`,
      to: to,
      subject: compiledSubject,
      content: plainText,
      html: minifiedHtml,
    });

    await client.close();

    console.log('✅ Email sent successfully');

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        to,
        subject: compiledSubject 
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
        messageId: '' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
