-- Insert email template for membership deposit confirmation
INSERT INTO public.email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'membership_deposit',
  'Membership Deposit Confirmation',
  'Your Sentra Membership Deposit of ₦{{amount}} is Confirmed!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Sentra</h1>
              <p style="margin: 8px 0 0; color: #a0aec0; font-size: 14px;">Membership Deposit Confirmed</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi {{customer_name}},
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your membership deposit has been successfully processed.
              </p>
              <!-- Amount Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Amount Deposited</p>
                    <p style="margin: 0; color: #15803d; font-size: 36px; font-weight: 700;">₦{{amount}}</p>
                  </td>
                </tr>
              </table>
              <!-- Balance Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #64748b; font-size: 14px;">New Balance</td>
                        <td style="text-align: right; color: #1e293b; font-size: 16px; font-weight: 600;">₦{{new_balance}}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 12px;"></td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px; padding-top: 12px;">Reference</td>
                        <td style="text-align: right; color: #1e293b; font-size: 14px; font-family: monospace; padding-top: 12px;">{{reference}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your membership credit is now available to use for purchases. Start shopping and enjoy exclusive member benefits!
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{shop_url}}" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Start Shopping
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                Thank you for being a Sentra member!
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © 2024 Sentra. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Hi {{customer_name}},

Great news! Your membership deposit has been successfully processed.

Amount Deposited: ₦{{amount}}
New Balance: ₦{{new_balance}}
Reference: {{reference}}

Your membership credit is now available to use for purchases. Start shopping and enjoy exclusive member benefits!

Visit: {{shop_url}}

Thank you for being a Sentra member!

© 2024 Sentra. All rights reserved.'
)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  updated_at = now();

-- Insert email template for membership purchase confirmation
INSERT INTO public.email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'membership_purchase',
  'Membership Purchase Confirmation',
  'Your Sentra Order #{{order_id}} is Confirmed!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Sentra</h1>
              <p style="margin: 8px 0 0; color: #a0aec0; font-size: 14px;">Order Confirmation</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi {{customer_name}},
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for your purchase! Your order has been confirmed and paid using your membership credit.
              </p>
              <!-- Order Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Order Total</p>
                    <p style="margin: 0; color: #1d4ed8; font-size: 36px; font-weight: 700;">₦{{total_amount}}</p>
                    <p style="margin: 12px 0 0; color: #3b82f6; font-size: 14px;">Paid with Membership Credit</p>
                  </td>
                </tr>
              </table>
              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #64748b; font-size: 14px;">Order ID</td>
                        <td style="text-align: right; color: #1e293b; font-size: 14px; font-family: monospace;">{{order_id}}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px;"></td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px;">Items</td>
                        <td style="text-align: right; color: #1e293b; font-size: 14px;">{{item_count}} item(s)</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 12px;"></td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-size: 14px;">Remaining Balance</td>
                        <td style="text-align: right; color: #15803d; font-size: 16px; font-weight: 600;">₦{{remaining_balance}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                We''re preparing your order and will notify you once it ships. You can track your order status anytime.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{tracking_url}}" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Track Your Order
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                Questions about your order? Contact us anytime.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © 2024 Sentra. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Hi {{customer_name}},

Thank you for your purchase! Your order has been confirmed and paid using your membership credit.

Order Total: ₦{{total_amount}}
Order ID: {{order_id}}
Items: {{item_count}} item(s)
Remaining Balance: ₦{{remaining_balance}}

We''re preparing your order and will notify you once it ships.

Track your order: {{tracking_url}}

Questions about your order? Contact us anytime.

© 2024 Sentra. All rights reserved.'
)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  updated_at = now();