import escapeHtml from "../escapeHtml.js";

const verifyEmailTemplate = ({ name, url }) => {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(url);
  const siteUrl = escapeHtml(new URL(url).origin);
  const year = new Date().getFullYear();

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0; padding:32px 12px; background:#F5F6FF; font-family:Arial, Helvetica, sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background:#FFFFFF; border:1px solid #E8EAFE; border-radius:14px; overflow:hidden; box-shadow:0 12px 36px rgba(37,54,170,.10);">
            <tr>
              <td style="padding:22px 32px; background:#4038F2;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:middle; padding-right:9px;">
                            <img src="https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Group%2014.png" alt="" width="28" height="28" style="display:block; border:0; filter:brightness(0) invert(1);" />
                          </td>
                          <td style="vertical-align:middle; color:#FFFFFF; font-size:23px; font-weight:700; letter-spacing:-.6px;">Unideals</td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="color:#E2E5FF; font-size:12px; line-height:1.5;">Shop smarter<br/>Live better</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:34px 32px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                  <tr>
                    <td align="center" valign="middle" width="112" height="112" style="width:112px; height:112px; border-radius:56px; background:#F0F1FF; color:#4545F5; font-size:54px; line-height:112px;">&#128231;</td>
                  </tr>
                </table>
                <h1 style="margin:0; color:#11183D; font-size:32px; line-height:1.2; letter-spacing:-.8px;">Verify your email address</h1>
                <div style="width:44px; height:4px; margin:18px auto 22px; background:#BFC3FF; border-radius:4px; font-size:0; line-height:0;">&nbsp;</div>
                <p style="margin:0 0 10px; color:#253052; font-size:18px; line-height:1.5;">Hi <strong style="color:#4038F2;">${safeName}</strong>,</p>
                <p style="max-width:470px; margin:0 auto; color:#596785; font-size:16px; line-height:1.65;">Thanks for signing up! Confirm your email address to activate your Unideals account and start connecting with your campus community.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 32px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#4038F2" style="border-radius:10px; box-shadow:0 8px 18px rgba(64,56,242,.22);">
                      <a href="${safeUrl}" target="_blank" style="display:inline-block; padding:17px 48px; color:#FFFFFF; font-size:17px; line-height:1.2; font-weight:700; text-decoration:none; border-radius:10px;">Verify email&nbsp;&nbsp; &#8594;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F9FF; border-radius:10px;">
                  <tr>
                    <td width="72" valign="top" style="padding:20px 0 18px 20px; color:#5146F5; font-size:25px; line-height:1.2;">&#128279;</td>
                    <td style="padding:19px 20px 18px 10px;">
                      <p style="margin:0 0 5px; color:#182044; font-size:14px; line-height:1.5; font-weight:700;">Button not working?</p>
                      <p style="margin:0 0 12px; color:#7480A0; font-size:14px; line-height:1.5;">Copy and paste this link into your browser:</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF; border:1px solid #E1E5F4; border-radius:7px;">
                        <tr>
                          <td style="padding:12px 14px; overflow-wrap:anywhere; word-break:break-all;">
                            <a href="${safeUrl}" style="color:#3838EC; font-size:14px; line-height:1.5; text-decoration:none;">${safeUrl}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2FF; border-radius:10px;">
                  <tr>
                    <td width="72" valign="top" style="padding:19px 0 18px 20px; color:#5146F5; font-size:25px; line-height:1.2;">&#9719;</td>
                    <td style="padding:18px 20px 18px 10px; color:#667392; font-size:14px; line-height:1.55;">
                      This link expires in <strong style="color:#182044;">24 hours</strong>.<br/>
                      If you didn’t create an Unideals account, you can safely ignore this email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 24px 24px; border-top:1px solid #E8EAFE; color:#8290AF;">
                <p style="margin:0 0 12px; font-size:12px; line-height:1.6;">&#169; ${year} Unideals. All rights reserved.<br/>India</p>
                <p style="margin:0; font-size:12px; line-height:1.6;">
                  <a href="${siteUrl}/privacy-policy" style="color:#3838EC; text-decoration:none;">Privacy Policy</a>
                  <span style="padding:0 10px; color:#AAB2CC;">&#8226;</span>
                  <a href="${siteUrl}/termscondition" style="color:#3838EC; text-decoration:none;">Terms of Service</a>
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
