// app/utils/emailTemplate.js

/**
 * Generate a consistent branded HTML email layout
 * @param {string} title - Email headline (e.g., "Account Approved")
 * @param {string} message - Main message body (can include HTML)
 * @param {string} [buttonText] - Optional CTA button text
 * @param {string} [buttonUrl] - Optional CTA button link
 * @returns {string} HTML email body
 */
function generateEmailTemplate(title, message, buttonText, buttonUrl) {
  const primaryColor = "#2563eb"; // Blue
  const secondaryColor = "#f1f5f9"; // Light gray background
  const textColor = "#334155"; // Dark slate
  const logoUrl =
    process.env.LOGO_URL ||
    "https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2015.png"; // replace later

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        background-color: ${secondaryColor};
        font-family: 'Arial', sans-serif;
        color: ${textColor};
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        background-color: #ffffff;
        margin: 40px auto;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .header {
        background-color: ${primaryColor};
        color: white;
        text-align: center;
        padding: 20px;
      }
      .header img {
        max-height: 50px;
        margin-bottom: 10px;
      }
      .content {
        padding: 30px 25px;
        line-height: 1.6;
      }
      h2 {
        color: ${primaryColor};
        margin-bottom: 10px;
      }
      .button {
        display: inline-block;
        margin: 20px 0;
        padding: 12px 25px;
        background-color: ${primaryColor};
        color: white !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
      }
      .footer {
        text-align: center;
        font-size: 13px;
        color: #64748b;
        background-color: #f8fafc;
        padding: 15px;
      }
      @media (max-width: 600px) {
        .container { margin: 20px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="Freelancer Marketplace Logo" />
        <h1>Freelancer Marketplace</h1>
      </div>

      <div class="content">
        <h2>${title}</h2>
        <p>${message}</p>
        ${
          buttonText && buttonUrl
            ? `<a href="${buttonUrl}" class="button">${buttonText}</a>`
            : ""
        }
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Freelancer Marketplace. All rights reserved.</p>
        <p>This is an automated message. Please do not reply.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = generateEmailTemplate;
