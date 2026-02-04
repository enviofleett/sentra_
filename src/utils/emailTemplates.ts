
export const getEmailTemplate = (title: string, bodyContent: string) => {
  // Convert newlines to <br> for the body content if it's plain text and doesn't contain HTML tags
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(bodyContent);
  const formattedBody = hasHtmlTags ? bodyContent : bodyContent.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px; text-align: center;">${title}</h2>
              
              <div style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${formattedBody}
              </div>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://sentra.shop/account" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Visit Account</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.3); text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Sentra. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
