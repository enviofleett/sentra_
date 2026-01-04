-- Insert welcome email template for waitlist users
INSERT INTO email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'WAITLIST_WELCOME',
  'Waitlist Welcome Email',
  'Welcome to Sentra! Your ₦{{reward_amount}} Credit is Ready 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sentra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
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
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px; text-align: center;">Welcome, {{name}}! 🎉</h2>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                Your patience on our waitlist has paid off! Your account is now active and ready to explore our exclusive collection.
              </p>
              
              <!-- Reward Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="color: #0a0a0a; font-size: 14px; margin: 0 0 8px; font-weight: 600;">YOUR WELCOME BONUS</p>
                    <p style="color: #0a0a0a; font-size: 36px; margin: 0; font-weight: 700;">₦{{reward_amount}}</p>
                    <p style="color: #0a0a0a; font-size: 14px; margin: 8px 0 0;">credited to your wallet</p>
                  </td>
                </tr>
              </table>
              
              <!-- Password Reset Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(255,255,255,0.05); border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="color: #d4af37; font-size: 16px; margin: 0 0 12px;">🔐 Set Your Password</h3>
                    <p style="color: #cccccc; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                      To access your account, you''ll need to set your password. Click the button below to create your secure password:
                    </p>
                    <a href="{{reset_url}}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">Set My Password</a>
                  </td>
                </tr>
              </table>
              
              <!-- What''s Next -->
              <h3 style="color: #ffffff; font-size: 18px; margin: 32px 0 16px;">What''s Next?</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #d4af37; font-size: 16px;">1.</span>
                    <span style="color: #cccccc; font-size: 14px; margin-left: 12px;">Set your password using the link above</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: #d4af37; font-size: 16px;">2.</span>
                    <span style="color: #cccccc; font-size: 14px; margin-left: 12px;">Browse our curated fragrance collection</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #d4af37; font-size: 16px;">3.</span>
                    <span style="color: #cccccc; font-size: 14px; margin-left: 12px;">Use your ₦{{reward_amount}} credit on your first purchase!</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: rgba(0,0,0,0.3); text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                © 2024 Sentra. All rights reserved.<br>
                Questions? Reply to this email or contact us at support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Welcome to Sentra, {{name}}!

Your patience on our waitlist has paid off! Your account is now active.

YOUR WELCOME BONUS: ₦{{reward_amount}} has been credited to your wallet!

SET YOUR PASSWORD:
To access your account, visit: {{reset_url}}

What''s Next?
1. Set your password using the link above
2. Browse our curated fragrance collection
3. Use your ₦{{reward_amount}} credit on your first purchase!

Thank you for joining Sentra!
'
) ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  updated_at = now();