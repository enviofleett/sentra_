-- Insert password reset email template
INSERT INTO email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'password_reset',
  'Password Reset Email',
  'Reset Your Sentra Password',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ''Helvetica Neue'', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">SENTRA</h1>
    <p style="color: #a0a0a0; margin: 8px 0 0 0; font-size: 12px; letter-spacing: 1px;">LUXURY FRAGRANCES</p>
  </div>
  
  <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h2 style="color: #1a1a2e; margin-bottom: 20px; font-weight: 500;">Reset Your Password</h2>
    
    <p style="margin-bottom: 20px;">Hi {{name}},</p>
    
    <p style="margin-bottom: 20px;">We received a request to reset the password for your Sentra account. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{reset_url}}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8942c 100%); color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Reset Password</a>
    </div>
    
    <p style="margin-bottom: 10px; font-size: 14px; color: #666;">If the button doesn''t work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #888; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px;">{{reset_url}}</p>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
      <p style="font-size: 14px; color: #888; margin-bottom: 10px;"><strong>⏰ Important:</strong> This link will expire in 1 hour for security purposes.</p>
      <p style="font-size: 14px; color: #888;">If you didn''t request a password reset, please ignore this email or contact our support team if you have concerns.</p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">© 2025 Sentra. All rights reserved.</p>
      <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">This is an automated message from Sentra.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{name}},

We received a request to reset the password for your Sentra account.

Reset your password here: {{reset_url}}

Important: This link will expire in 1 hour for security purposes.

If you didn''t request a password reset, please ignore this email or contact our support team if you have concerns.

© 2025 Sentra. All rights reserved.'
)
ON CONFLICT (template_id) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  updated_at = now();