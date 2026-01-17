-- Insert new WAITLIST_SIGNUP email template for initial waitlist signups
INSERT INTO email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'WAITLIST_SIGNUP',
  'Waitlist Signup Confirmation',
  'You''re on the Sentra Waitlist! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Sentra</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 16px;">You''re on the waitlist!</p>
    </div>
    <div style="padding: 40px 30px;">
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi {{name}},
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for joining the Sentra waitlist! We''re thrilled to have you as one of our early members.
      </p>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #1a1a2e; margin: 0 0 15px 0; font-size: 18px;">What happens next?</h3>
        <ol style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Our team will verify your social media follows</li>
          <li>Once verified, you''ll receive your account activation email</li>
          <li>Your wallet will be credited with <strong style="color: #d4af37;">₦{{reward_amount}}</strong> welcome bonus!</li>
        </ol>
      </div>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        Keep an eye on your inbox — we''ll be in touch soon!
      </p>
      <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
        With love,<br>
        <strong style="color: #333;">The Sentra Team</strong>
      </p>
    </div>
    <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        © 2025 Sentra. Premium fragrances for everyone.
      </p>
    </div>
  </div>
</body>
</html>',
  'Hi {{name}},

Thank you for joining the Sentra waitlist! We''re thrilled to have you as one of our early members.

What happens next?
1. Our team will verify your social media follows
2. Once verified, you''ll receive your account activation email
3. Your wallet will be credited with ₦{{reward_amount}} welcome bonus!

Keep an eye on your inbox — we''ll be in touch soon!

With love,
The Sentra Team'
)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  updated_at = now();