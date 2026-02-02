-- Insert Payment Discrepancy email template
INSERT INTO public.email_templates (template_id, name, subject, html_content, text_content)
VALUES (
  'PAYMENT_DISCREPANCY',
  'Payment Discrepancy Notice',
  'Action Required: Payment Discrepancy for Order #{{order_id}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Discrepancy</title>
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
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px; text-align: center;">Payment Discrepancy Detected</h2>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi {{customer_name}},
              </p>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We received a payment for your order <strong>#{{order_id}}</strong>, but the amount paid does not match the expected order total.
              </p>
              
              <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #888; padding-bottom: 8px;">Expected Amount:</td>
                    <td style="color: #ffffff; font-weight: 600; text-align: right; padding-bottom: 8px;">₦{{expected_amount}}</td>
                  </tr>
                  <tr>
                    <td style="color: #888;">Amount Paid:</td>
                    <td style="color: #d4af37; font-weight: 600; text-align: right;">₦{{paid_amount}}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Your order status has been set to <strong>"Amount Mismatch"</strong>. Please contact our support team to resolve this issue and complete your order.
              </p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="mailto:support@sentra.com" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Contact Support</a>
              </div>
              
              <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
                If you believe this is an error, please reply to this email with your payment receipt.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.3); text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">&copy; 2026 Sentra. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Hi {{customer_name}}, We detected a payment discrepancy for order #{{order_id}}. Expected: ₦{{expected_amount}}, Paid: ₦{{paid_amount}}. Please contact support to resolve this.'
);
