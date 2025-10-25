import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  templateId: string;
  data: { [key: string]: string | number };
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

    // Compile template with data
    let compiledHtml = template.html_content;
    let compiledSubject = template.subject;
    let compiledText = template.text_content || '';

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiledHtml = compiledHtml.replace(regex, String(value));
      compiledSubject = compiledSubject.replace(regex, String(value));
      compiledText = compiledText.replace(regex, String(value));
    });

    console.log('✅ Template compiled for:', to);

    // Configure SMTP client
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: gmailEmail,
      password: gmailPassword,
    });

    console.log('✅ SMTP connection established');

    // Send email
    await client.send({
      from: gmailEmail,
      to: to,
      subject: compiledSubject,
      content: compiledText,
      html: compiledHtml,
    });

    await client.close();

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ Email sent successfully:', messageId);

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
