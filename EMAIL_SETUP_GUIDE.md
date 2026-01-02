# Email Service Configuration Guide

## 🚨 CRITICAL: Email Service Not Configured

Your email notifications are currently **NOT WORKING** because Gmail credentials have not been configured in Supabase Edge Functions.

## Impact

Without email configuration, the following features will fail:
- ✉️ Order confirmation emails
- ✉️ Group buy notifications
- ✉️ Password reset emails
- ✉️ Account verification emails
- ✉️ Shipping updates
- ✉️ Affiliate notifications

---

## Option 1: Gmail SMTP (Quick Setup)

### Step 1: Create Gmail App Password

1. Go to your Google Account settings
2. Navigate to **Security** > **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Generate a new app password for "Sentra Email Service"
5. Copy the 16-character password

### Step 2: Configure Supabase Edge Function Secrets

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref oczsddmantovkqfwczqk

# Set email credentials
supabase secrets set GMAIL_EMAIL="your-email@gmail.com"
supabase secrets set GMAIL_APP_PASSWORD="your-16-char-app-password"
```

### Step 3: Verify Setup

```bash
# Deploy the edge function to apply changes
supabase functions deploy send-email

# Test by placing a test order or triggering an email
```

### Limitations
- ⚠️ Gmail has sending limits (500 emails/day for free accounts, 2000/day for Google Workspace)
- ⚠️ Not ideal for high-volume production use
- ⚠️ Risk of being marked as spam if volume increases

---

## Option 2: Resend (Recommended for Production)

Resend offers 3,000 free emails/month with excellent deliverability.

### Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Create an account
3. Verify your domain
4. Get your API key

### Step 2: Update Edge Function

Replace the email sending code in `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
      throw new Error(`Email template not found: ${templateId}`);
    }

    // Compile template with data
    let compiledHtml = template.html_content;
    let compiledSubject = template.subject;

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiledHtml = compiledHtml.replace(regex, String(value));
      compiledSubject = compiledSubject.replace(regex, String(value));
    });

    // Send via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sentra <noreply@yourdomain.com>', // Use your verified domain
        to: [to],
        subject: compiledSubject,
        html: compiledHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
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
```

### Step 3: Set Resend API Key

```bash
supabase secrets set RESEND_API_KEY="re_your_api_key_here"
```

### Step 4: Deploy

```bash
supabase functions deploy send-email
```

---

## Option 3: SendGrid

SendGrid offers 100 free emails/day.

### Setup

1. Sign up at https://sendgrid.com
2. Get your API key
3. Update edge function similar to Resend example
4. Set secret: `supabase secrets set SENDGRID_API_KEY="your_key"`

---

## Option 4: AWS SES

Best for high-volume production use.

### Setup

1. Set up AWS SES
2. Verify domain
3. Get SMTP credentials or API access
4. Update edge function
5. Set AWS credentials as secrets

---

## Testing Email Configuration

### Test 1: Manual Edge Function Invocation

```bash
# Test from command line
supabase functions invoke send-email --body '{
  "to": "your-test-email@example.com",
  "templateId": "ORDER_CONFIRMATION",
  "data": {
    "customer_name": "Test User",
    "order_id": "TEST123",
    "total_amount": "50000"
  }
}'
```

### Test 2: Place Test Order

1. Add product to cart
2. Go through checkout
3. Complete payment with Paystack
4. Check email inbox for order confirmation

### Test 3: Check Logs

```bash
# View Edge Function logs
supabase functions logs send-email --limit 50
```

---

## Monitoring Email Delivery

### Check Email Templates

```sql
-- View all email templates
SELECT template_id, subject, is_active
FROM email_templates
ORDER BY created_at DESC;
```

### Add Email Delivery Logging (Optional)

Create a table to track email delivery:

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  message_id TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all
CREATE POLICY "Admins can view email logs"
ON email_logs FOR SELECT
USING (public.is_admin());
```

Then update your email service to log deliveries:

```typescript
// After successful send
await supabase.from('email_logs').insert({
  to_email: to,
  template_id: templateId,
  message_id: result.id,
  status: 'sent'
});

// After failure
await supabase.from('email_logs').insert({
  to_email: to,
  template_id: templateId,
  status: 'failed',
  error_message: error.message
});
```

---

## Troubleshooting

### Problem: Emails not sending

**Check 1:** Verify secrets are set
```bash
supabase secrets list
```

**Check 2:** Check Edge Function logs
```bash
supabase functions logs send-email --limit 100
```

**Check 3:** Test template exists
```sql
SELECT * FROM email_templates WHERE template_id = 'ORDER_CONFIRMATION';
```

### Problem: Emails going to spam

**Solution:**
1. Verify your sending domain with SPF, DKIM, and DMARC records
2. Use a reputable email service (Resend, SendGrid, AWS SES)
3. Avoid spam trigger words in subject lines
4. Include unsubscribe links
5. Maintain good sender reputation

### Problem: Rate limiting

**Solution:**
1. Upgrade to paid plan on your email provider
2. Implement email queuing system
3. Batch emails instead of sending individually

---

## Current Email Templates

Your application uses these templates (check `email_templates` table):

- `ORDER_CONFIRMATION` - Sent after successful order
- `ORDER_SHIPPED` - Sent when order is shipped
- `GROUPBUY_GOAL_MET` - Sent when group buy goal is reached
- `GROUPBUY_SUCCESS_PAID_FINALIZED` - Sent when group buy payment finalized
- `GROUPBUY_FAILED` - Sent when group buy fails
- `PASSWORD_RESET` - Sent for password reset (if implemented)
- `EMAIL_VERIFICATION` - Sent for email verification

---

## Next Steps

1. **Choose an email provider** (Gmail for quick start, Resend for production)
2. **Configure credentials** using Supabase secrets
3. **Test thoroughly** with test orders
4. **Monitor delivery** rates and errors
5. **Set up domain verification** for better deliverability

---

## Questions?

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify secrets are correctly set
3. Test with a simple email template first
4. Consider using a managed service like Resend for reliability
