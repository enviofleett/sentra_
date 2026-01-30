
export const getEmailTemplate = (title: string, bodyContent: string) => {
  // Convert newlines to <br> for the body content if it's plain text
  const formattedBody = bodyContent.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      padding: 32px 40px;
      text-align: center;
      background-color: #ffffff;
      border-bottom: 1px solid #f3f4f6;
    }
    .logo-text {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -1px;
      color: #111827;
      text-decoration: none;
      display: inline-block;
    }
    .content {
      padding: 40px 40px;
      background-color: #ffffff;
    }
    .content h1 {
      margin-top: 0;
      margin-bottom: 24px;
      color: #111827;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.3;
    }
    .content p {
      margin-bottom: 24px;
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
    }
    .footer {
      padding: 32px 40px;
      background-color: #f9fafb;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      margin: 0;
      color: #9ca3af;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer a {
      color: #6b7280;
      text-decoration: underline;
    }
    
    /* Button styles for use in body */
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background-color: #111827;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
      text-align: center;
    }
    
    @media only screen and (max-width: 640px) {
      .wrapper { padding: 20px 0; }
      .container { border-radius: 0; }
      .header { padding: 24px 20px; }
      .content { padding: 32px 20px; }
      .footer { padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-text">SENTRA</span>
      </div>
      <div class="content">
        <!-- Main Content -->
        ${formattedBody}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Sentra. All rights reserved.</p>
        <p style="margin-top: 8px;">You are receiving this email because you signed up for updates.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const getBroadcastTemplate = (title: string, bodyContent: string) => {
  // Convert newlines to <br> for the body content if it's plain text
  const formattedBody = bodyContent.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f0fdf4; /* Green tint for freshness */
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f0fdf4;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #dcfce7;
    }
    .header {
      padding: 40px 40px 32px;
      text-align: center;
      background: linear-gradient(to right, #166534, #15803d); /* Green gradient */
    }
    .logo-text {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
      display: inline-block;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .announcement-badge {
      display: inline-block;
      padding: 6px 16px;
      background-color: rgba(255,255,255,0.2);
      border-radius: 20px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      margin-top: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 48px 40px;
      background-color: #ffffff;
    }
    .content h1 {
      margin-top: 0;
      color: #166534;
      font-size: 26px;
      font-weight: 800;
    }
    .footer {
      padding: 32px 40px;
      background-color: #f0fdf4;
      text-align: center;
      border-top: 1px solid #dcfce7;
    }
    .footer p {
      margin: 0;
      color: #166534;
      font-size: 13px;
      opacity: 0.8;
    }
    /* Button styles */
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #166534;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 700;
      font-size: 16px;
      margin: 24px 0;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.3);
    }
    .btn:hover {
      background-color: #15803d;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-text">SENTRA</div>
        <br>
        <div class="announcement-badge">Official Announcement</div>
      </div>
      <div class="content">
        ${formattedBody}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Sentra. All rights reserved.</p>
        <p style="margin-top: 8px;">You are receiving this update as a valued member of our community.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
