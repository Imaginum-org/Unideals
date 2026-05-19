const verifyEmailTemplate = ({ name, url }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        /* Basic reset for email clients */
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #F8FAFC; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        
        @media screen and (max-width: 600px) {
          .container { width: 100% !important; border-radius: 0 !important; }
          .content-padding { padding-left: 20px !important; padding-right: 20px !important; }
        }
      </style>
    </head>
    <body style="background-color: #F8FAFC; padding: 20px 0;">
      <center>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border: 1px solid #F1F5F9; border-radius: 12px; overflow: hidden; font-family: 'Inter', Arial, sans-serif;">
          
          <tr>
            <td align="center" style="padding: 32px; background-color: #ffffff; border-bottom: 1px solid #F8FAFC;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #364EF2; font-size: 28px; font-weight: 600; font-family: 'Poppins', Arial, sans-serif;">
                    Unideals
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" class="content-padding" style="padding: 40px 48px;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" bgcolor="#E9F2FE" style="width: 80px; height: 80px; border-radius: 50%; font-size: 40px; line-height: 80px;">
                    ✉️
                  </td>
                </tr>
              </table>

              <h1 style="margin: 0 0 24px 0; color: #0F172A; font-size: 28px; font-weight: 700; line-height: 36px; text-align: center;">
                Verify Your Email Address
              </h1>

              <p style="margin: 0 0 32px 0; color: #64748B; font-size: 16px; line-height: 26px; text-align: center;">
                Dear ${name}, thanks for signing up for our platform! We're excited to have you on board. Please click the button below to verify your email address and activate your account.
              </p>

              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center" bgcolor="#394FF1" style="border-radius: 8px;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F8FAFC" style="border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 16px; font-size: 12px; color: #64748B;">
                    If the button doesn't work, you can also 
                    <a href="${url}" style="color: #394FF1; font-weight: 700; text-decoration: underline;">verify your email here.</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #94A3B8; font-size: 12px; line-height: 18px; text-align: center;">
                This link will expire in 24 hours. If you didn't create an account with Unideals, you can safely delete this email.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" bgcolor="#F8FAFC" style="padding: 32px; border-top: 1px solid #F1F5F9;">
              <p style="margin: 0 0 16px 0; color: #94A3B8; font-size: 12px; line-height: 16px; text-align: center;">
                © 2026 Unideals Inc. All rights reserved.<br/>
                Vellore, India
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 12px; font-weight: 500; text-align: center;">
                <a href="#" style="color: #94A3B8; text-decoration: none;">Privacy Policy</a>
                &nbsp; • &nbsp;
                <a href="#" style="color: #94A3B8; text-decoration: none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </center>
    </body>
    </html>
  `;
};

export default verifyEmailTemplate;
