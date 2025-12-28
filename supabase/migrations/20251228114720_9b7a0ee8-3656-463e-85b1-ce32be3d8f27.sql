-- Insert the WAITLIST_WELCOME email template
INSERT INTO public.email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'WAITLIST_WELCOME',
  'Waitlist Welcome Email',
  'Welcome to the Sentra Circle, {{name}}! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sentra</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #1a1a1a;">SENTRA</h1>
              <p style="margin: 10px 0 0; font-size: 14px; color: #666;">Premium Fragrances</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; color: #1a1a1a;">Welcome to the Circle, {{name}}! 🎉</h2>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                You''re officially on our exclusive waitlist! We''re thrilled to have you join the Sentra family.
              </p>
              
              <!-- Reward Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 12px;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <p style="margin: 0 0 5px; font-size: 14px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">Your Launch Credit</p>
                    <p style="margin: 0; font-size: 36px; font-weight: bold; color: #ffffff;">₦{{reward_amount}}</p>
                    <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Will be credited when we launch!</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                <strong>What happens next?</strong><br>
                • We''ll verify your social media follows<br>
                • You''ll get 24-hour early access to our launch<br>
                • Your ₦{{reward_amount}} credit will be ready to use
              </p>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                Make sure to follow us on social media to stay updated and unlock additional rewards!
              </p>
              
              <!-- Social Links -->
              <table role="presentation" style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://instagram.com/sentrascents" style="display: inline-block; margin: 0 10px; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">Follow @SentraScents</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                © 2025 Sentra. All rights reserved.<br>
                Nigeria''s Premium Source for Designer Perfumes
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Welcome to the Sentra Circle, {{name}}!

You''re officially on our exclusive waitlist! We''re thrilled to have you join the Sentra family.

YOUR LAUNCH CREDIT: ₦{{reward_amount}}
This will be credited to your account when we launch!

What happens next?
- We''ll verify your social media follows
- You''ll get 24-hour early access to our launch
- Your ₦{{reward_amount}} credit will be ready to use

Make sure to follow us on social media to stay updated and unlock additional rewards!

Follow us: @SentraScents on Instagram, Facebook, and TikTok

---
© 2025 Sentra. All rights reserved.
Nigeria''s Premium Source for Designer Perfumes'
);