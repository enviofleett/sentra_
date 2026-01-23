import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  emails: string[];
  adminId?: string;
  adminEmail?: string;
  sendConfirmation?: boolean;
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
    const { emails, adminId, adminEmail, sendConfirmation }: PasswordResetRequest = await req.json();

    console.log('[Password Reset] Request received:', { 
      emailCount: emails?.length, 
      adminId,
      adminEmail: adminEmail ? '***' : undefined,
      sendConfirmation
    });

    if (!emails || emails.length === 0) {
      throw new Error('No emails provided');
    }

    // Limit non-admin requests to single email (prevent abuse)
    if (!adminId && emails.length > 1) {
      throw new Error('Only one email allowed per request');
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate admin permissions for bulk sends
    if (adminId) {
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: adminId,
        _role: 'admin'
      });

      if (!isAdmin) {
        console.error('[Password Reset] Unauthorized: User is not admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate APP_BASE_URL
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    if (!appBaseUrl) {
      console.warn('[Password Reset] WARNING: APP_BASE_URL not configured. Using fallback.');
    }
    const resolvedBaseUrl = appBaseUrl || 'https://sentra-scent-shop-ai.lovable.app';
    console.log('[Password Reset] Using base URL:', resolvedBaseUrl);

    // Fetch password reset email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_id', 'password_reset')
      .single();

    if (templateError || !template) {
      console.log('[Password Reset] Template not found, using default template');
    }

    // Setup Gmail SMTP
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

    const results: { email: string; success: boolean; error?: string }[] = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      // Rate limiting for bulk sends
      if (i > 0) {
        console.log(`[Password Reset] Rate limiting: waiting 1.2s before next email (${i + 1}/${emails.length})`);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Progress logging every 10 emails
      if (i > 0 && i % 10 === 0) {
        console.log(`[Password Reset] Progress: ${i}/${emails.length} emails processed`);
      }

      try {
        // Check if user exists
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData?.users?.find((u: any) => u.email === email);

        if (!user) {
          console.log(`[Password Reset] User not found: ${email}`);
          results.push({ email, success: false, error: 'User not found' });
          continue;
        }

        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const userName = profile?.full_name || email.split('@')[0];

        // Generate custom password reset token (bypasses Supabase auth URL)
        const { data: tokenData, error: tokenError } = await supabase.rpc('generate_password_reset_token', {
          p_user_id: user.id,
          p_expires_in_minutes: 10
        });

        if (tokenError || !tokenData) {
          console.error(`[Password Reset] Failed to generate token for ${email}:`, tokenError);
          results.push({ email, success: false, error: tokenError?.message || 'Failed to generate token' });
          continue;
        }

        // Create direct reset URL pointing to trusted domain (no Supabase redirect)
        const resetUrl = `${resolvedBaseUrl}/reset-password?token=${tokenData}`;
        console.log(`[Password Reset] Generated custom reset link for ${email}`);

        // Build email content
        let htmlContent: string;
        let subject: string;

        if (template) {
          // Use database template
          htmlContent = template.html_content
            .replace(/{{name}}/g, userName)
            .replace(/{{reset_url}}/g, resetUrl)
            .replace(/{{email}}/g, email);
          subject = template.subject.replace(/{{name}}/g, userName);
        } else {
          // Use default template - inline with no extra whitespace
          subject = 'Reset Your Sentra Password';
          htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;"><div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;"><h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">SENTRA</h1><p style="color: #a0a0a0; margin: 8px 0 0 0; font-size: 12px; letter-spacing: 1px;">LUXURY FRAGRANCES</p></div><div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><h2 style="color: #1a1a2e; margin-bottom: 20px; font-weight: 500;">Reset Your Password</h2><p style="margin-bottom: 20px;">Hi ${userName},</p><p style="margin-bottom: 20px;">We received a request to reset the password for your Sentra account. Click the button below to create a new password:</p><div style="text-align: center; margin: 30px 0;"><a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8942c 100%); color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Reset Password</a></div><p style="margin-bottom: 10px; font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p><p style="font-size: 12px; color: #888; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px;">${resetUrl}</p><div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;"><p style="font-size: 14px; color: #888; margin-bottom: 10px;"><strong>⏰ Important:</strong> This link will expire in 1 hour for security purposes.</p><p style="font-size: 14px; color: #888;">If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p></div><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;"><p style="color: #888; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Sentra. All rights reserved.</p><p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">This is an automated message from Sentra.</p></div></div></body></html>`;
        }

        // Minify HTML to prevent =20 encoding artifacts
        const minifiedHtml = minifyHtml(htmlContent);
        const plainText = stripHtml(htmlContent);

        // Generate unique Message-ID for better deliverability
        const messageId = `<${crypto.randomUUID()}@sentra.africa>`;

        // Send email with improved headers
        await client.send({
          from: `Sentra <${gmailEmail}>`,
          to: email,
          subject: subject,
          content: plainText,
          html: minifiedHtml,
          headers: {
            'Message-ID': messageId,
            'X-Mailer': 'Sentra Notifications',
          },
        });

        console.log(`[Password Reset] ✅ Email sent to ${email}`);

        // Log admin-initiated password reset to audit table
        if (adminId) {
          try {
            const { error: auditError } = await supabase
              .from('password_change_audit')
              .insert({
                user_id: user.id,
                change_type: 'admin_reset',
                change_source: 'admin_action',
                success: true,
                initiated_by: adminId,
              });
            if (auditError) {
              console.error(`[Password Reset] Failed to log audit for ${email}:`, auditError);
            }
          } catch (auditErr) {
            console.error(`[Password Reset] Failed to log audit for ${email}:`, auditErr);
          }
        }

        results.push({ email, success: true });

      } catch (emailError: any) {
        console.error(`[Password Reset] ❌ Failed to send to ${email}:`, emailError);
        results.push({ email, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const failedEmails = results.filter(r => !r.success);

    console.log(`[Password Reset] Complete: ${successCount} sent, ${failCount} failed`);

    // Send confirmation email to admin if requested
    if (adminId && adminEmail && sendConfirmation !== false) {
      try {
        const confirmationHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;"><h1 style="color: #d4af37; margin: 0; font-size: 24px;">SENTRA</h1><p style="color: #a0a0a0; margin: 5px 0 0; font-size: 11px;">ADMIN NOTIFICATION</p></div><div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1a1a2e; margin-top: 0;">Bulk Password Reset Complete</h2><p>Your bulk password reset operation has finished processing.</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0;"><tr><td style="padding: 12px; border: 1px solid #eee; background: #f9f9f9;"><strong>Total Requested</strong></td><td style="padding: 12px; border: 1px solid #eee; text-align: right;">${emails.length}</td></tr><tr><td style="padding: 12px; border: 1px solid #eee; background: #f9f9f9;"><strong>Successfully Sent</strong></td><td style="padding: 12px; border: 1px solid #eee; text-align: right; color: #22c55e;">${successCount}</td></tr><tr><td style="padding: 12px; border: 1px solid #eee; background: #f9f9f9;"><strong>Failed</strong></td><td style="padding: 12px; border: 1px solid #eee; text-align: right; color: ${failCount > 0 ? '#ef4444' : '#888'};">${failCount}</td></tr></table>${failCount > 0 ? `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin-top: 20px;"><h3 style="color: #dc2626; margin: 0 0 10px;">Failed Emails:</h3><ul style="margin: 0; padding-left: 20px;">${failedEmails.map(f => `<li style="margin: 5px 0;">${f.email}: ${f.error || 'Unknown error'}</li>`).join('')}</ul></div>` : ''}<p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">Sent from Sentra Admin System</p></div></body></html>`;

        await client.send({
          from: `Sentra Admin <${gmailEmail}>`,
          to: adminEmail,
          subject: `Password Reset Summary: ${successCount}/${emails.length} Sent Successfully`,
          content: `Bulk Password Reset Complete\n\nTotal: ${emails.length}\nSent: ${successCount}\nFailed: ${failCount}${failCount > 0 ? '\n\nFailed emails:\n' + failedEmails.map(f => `- ${f.email}: ${f.error}`).join('\n') : ''}`,
          html: confirmationHtml,
        });

        console.log(`[Password Reset] ✅ Confirmation email sent to admin: ${adminEmail}`);
      } catch (confirmError: any) {
        console.error('[Password Reset] Failed to send admin confirmation:', confirmError);
        // Don't fail the whole operation if confirmation fails
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: emails.length,
          sent: successCount,
          failed: failCount
        },
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Password Reset] ❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
