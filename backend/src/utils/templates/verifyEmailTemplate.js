const verifyEmailTemplate = ({ name, url }) => {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F1F5F9; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0px 8px 24px rgba(15, 23, 42, 0.06); border: 1px solid #EAECF0;">

            <!-- Header -->
            <tr>
              <td align="center" style="background-color: #3838EC; padding: 28px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <img src="https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Group%2014.png" alt="" width="22" height="22" style="display: block; filter: brightness(0) invert(1);" />
                    </td>
                    <td style="vertical-align: middle;">
                      <span style="color: #ffffff; font-size: 19px; font-weight: 700; letter-spacing: -0.2px;">Unideals</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px 32px 32px 32px;">

                <!-- Icon badge -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 24px auto;">
                  <tr>
                    <td width="64" height="64" align="center" valign="middle" style="background-color: #EEF0FF; border-radius: 50%; position: relative;">
                      <img src="https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Icon.svg" alt="" width="28" height="28" style="display: block;" />
                    </td>
                  </tr>
                </table>

                <h1 style="color: #0F172A; font-size: 21px; font-weight: 700; margin: 0 0 10px 0; text-align: center; letter-spacing: -0.3px;">
                  Verify your email address
                </h1>

                <p style="color: #64748B; font-size: 14.5px; line-height: 1.65; margin: 0 0 28px 0; text-align: center;">
                  Hi <strong style="color: #334155;">${name}</strong>, thanks for signing up. Please confirm this is your email address to activate your Unideals account.
                </p>

                <!-- Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 28px auto;">
                  <tr>
                    <td align="center" bgcolor="#3838EC" style="border-radius: 8px;">
                      <a href="${url}" target="_blank" style="display: inline-block; padding: 13px 36px; font-size: 14.5px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Fallback link -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #EEF0F4; border-radius: 10px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 14px 16px;">
                      <p style="color: #94A3B8; font-size: 11.5px; margin: 0 0 6px 0;">
                        Button not working? Paste this link into your browser:
                      </p>
                      <a href="${url}" style="color: #3838EC; font-size: 11.5px; font-weight: 600; text-decoration: underline; word-break: break-all;">${url}</a>
                    </td>
                  </tr>
                </table>

                <p style="color: #94A3B8; font-size: 11.5px; line-height: 1.6; margin: 0; text-align: center;">
                  This link expires in 24 hours. If you didn't create an account with Unideals, you can safely ignore this email.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #F8FAFC; border-top: 1px solid #EEF0F4; padding: 22px 24px; text-align: center;">
                <p style="color: #94A3B8; font-size: 11px; line-height: 1.6; margin: 0 0 10px 0;">
                  © 2026 Unideals Inc. All rights reserved.<br/>
                  Vellore, India
                </p>
                <p style="color: #94A3B8; font-size: 11px; margin: 0;">
                  <a href="#" style="color: #94A3B8; text-decoration: none; font-weight: 500;">Privacy Policy</a>
                  <span style="margin: 0 8px; color: #CBD5E1;">•</span>
                  <a href="#" style="color: #94A3B8; text-decoration: none; font-weight: 500;">Terms of Service</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  `;
};

export default verifyEmailTemplate;
