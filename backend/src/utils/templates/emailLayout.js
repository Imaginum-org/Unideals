// Shared building blocks for transactional emails (verify email, reset
// password). Table-based + inline styles only, so it renders in Gmail,
// Apple Mail and Outlook. Sized compact (480px card, 14px body) because
// Gmail shows emails at full width and larger templates feel oversized.

const LOGO_URL =
  "https://ik.imagekit.io/mspoxwn8v/Backend/Email%20Template%20Images/Group%2014.png";
const BRAND = "#4A4DFE";
const FONT = "'Figtree','Segoe UI',Arial,Helvetica,sans-serif";

// Header: "light" = white bar with indigo wordmark, "brand" = indigo bar.
const header = (variant) => {
  const isBrand = variant === "brand";
  // Gmail strips CSS filters, so on the indigo bar the logo sits on a
  // small white chip instead of being recoloured.
  const logo = isBrand
    ? `<td style="vertical-align:middle;padding-right:8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="28" height="28" style="width:28px;height:28px;background:#FFFFFF;border-radius:8px;"><img src="${LOGO_URL}" alt="" width="18" height="18" style="display:block;border:0;margin:0 auto;" /></td></tr></table></td>`
    : `<td style="vertical-align:middle;padding-right:8px;"><img src="${LOGO_URL}" alt="" width="24" height="24" style="display:block;border:0;" /></td>`;
  return `
<tr><td style="padding:16px 24px;${isBrand ? `background:${BRAND};` : "border-bottom:1px solid #EEF0FF;"}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="left" style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      ${logo}
      <td style="vertical-align:middle;color:${isBrand ? "#FFFFFF" : BRAND};font-size:19px;font-weight:700;letter-spacing:-.4px;">Unideals</td>
    </tr></table></td>
    <td align="right" style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:8px;"><div style="width:18px;height:2px;background:${isBrand ? "#A9ABFF" : "#C9CBFF"};border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td>
      <td style="color:${isBrand ? "#E2E4FF" : "#7680A4"};font-size:10.5px;line-height:1.45;">Shop Smarter<br/>Live Better</td>
    </tr></table></td>
  </tr></table>
</td></tr>`;
};

// Hero: soft halo with the illustration + a few sparkles around it.
const hero = (illustration) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px;"><tr>
  <td valign="top" style="padding:6px 6px 0 0;color:#8B8DFF;font-size:13px;line-height:1;">&#10022;</td>
  <td align="center" valign="middle" width="96" height="96" style="width:96px;height:96px;border-radius:48px;background:#F0F1FF;">${illustration}</td>
  <td valign="bottom" style="padding:0 0 8px 6px;color:#8B8DFF;font-size:10px;line-height:1;">&#10022;</td>
</tr></table>`;

// Padlock with a circular "refresh" badge (password reset).
export const lockIllustration = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
  <td valign="bottom">
    <div style="width:20px;height:15px;margin:0 auto;border:5px solid #5B5BF6;border-bottom:0;border-radius:15px 15px 0 0;font-size:0;line-height:0;">&nbsp;</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
      <td align="center" valign="middle" width="44" height="36" style="width:44px;height:36px;background:#6366F1;border-radius:9px;">
        <div style="width:8px;height:8px;margin:0 auto;background:#1E1B6B;border-radius:4px;font-size:0;line-height:0;">&nbsp;</div>
        <div style="width:3px;height:8px;margin:-1px auto 0;background:#1E1B6B;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
      </td>
    </tr></table>
  </td>
  <td valign="bottom" style="padding-left:0;">
    <div style="width:22px;height:22px;margin:0 0 -4px -12px;background:#FFFFFF;border-radius:11px;box-shadow:0 2px 6px rgba(74,77,254,.25);color:${BRAND};font-size:14px;font-weight:700;line-height:22px;text-align:center;">&#8635;</div>
  </td>
</tr></table>`;

// Open envelope with a letter and a green check badge (verify email).
export const envelopeIllustration = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
  <td valign="bottom">
    <div style="width:38px;height:18px;margin:0 auto -6px;padding:6px 6px 0;background:#FFFFFF;border-radius:3px;box-shadow:0 1px 3px rgba(30,27,75,.12);">
      <div style="height:2px;margin-bottom:3px;background:#C7C9FF;font-size:0;line-height:0;">&nbsp;</div>
      <div style="height:2px;width:70%;background:#C7C9FF;font-size:0;line-height:0;">&nbsp;</div>
    </div>
    <div style="width:54px;height:34px;background:#6366F1;border-radius:5px;overflow:hidden;">
      <div style="width:0;height:0;border-left:27px solid transparent;border-right:27px solid transparent;border-top:18px solid #818CF8;font-size:0;line-height:0;"></div>
    </div>
  </td>
  <td valign="top">
    <div style="width:18px;height:18px;margin:-2px 0 0 -10px;background:#22C55E;border:2px solid #FFFFFF;border-radius:11px;color:#FFFFFF;font-size:11px;font-weight:700;line-height:18px;text-align:center;">&#10003;</div>
  </td>
</tr></table>`;

const iconChip = (inner) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="32" height="32" style="width:32px;height:32px;background:#E6E7FF;border-radius:16px;">${inner}</td></tr></table>`;
// Clock drawn with CSS (emoji/glyph clocks render tiny or in colour).
const clockIcon = iconChip(
  `<div style="width:12px;height:12px;margin:0 auto;border:2px solid ${BRAND};border-radius:8px;text-align:left;font-size:0;line-height:0;"><div style="width:2px;height:5px;margin:2px 0 0 5px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</div><div style="width:4px;height:2px;margin:-2px 0 0 5px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</div></div>`,
);
// Link: two interlocking rounded rings.
const linkIcon = iconChip(
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td><div style="width:8px;height:5px;border:2px solid ${BRAND};border-radius:5px;font-size:0;line-height:0;">&nbsp;</div></td><td><div style="width:8px;height:5px;margin-left:-4px;border:2px solid ${BRAND};border-radius:5px;font-size:0;line-height:0;">&nbsp;</div></td></tr></table>`,
);

const linkBox = (url) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E1E5F4;border-radius:7px;"><tr>
  <td style="padding:9px 12px;word-break:break-all;overflow-wrap:anywhere;">
    <a href="${url}" target="_blank" style="color:#3838EC;font-size:12px;line-height:1.5;text-decoration:none;">${url}</a>
  </td>
</tr></table>`;

/**
 * Renders a full transactional email.
 * @param {object} o
 * @param {"light"|"brand"} o.headerVariant
 * @param {string} o.illustration  lockIllustration | envelopeIllustration
 * @param {string} o.title
 * @param {string} o.greeting      pre-escaped HTML
 * @param {string} o.message       pre-escaped HTML
 * @param {string} o.ctaLabel
 * @param {string} o.url           pre-escaped URL
 * @param {"divider"|"card"} o.fallbackStyle  how the copy-link box looks
 * @param {string} o.expiry        e.g. "15 minutes"
 * @param {string} o.expiryNote
 * @param {string} o.siteUrl       pre-escaped origin
 * @param {string} o.preheader     inbox preview text
 */
export const renderEmail = ({
  headerVariant,
  illustration,
  title,
  greeting,
  message,
  ctaLabel,
  url,
  fallbackStyle,
  expiry,
  expiryNote,
  siteUrl,
  preheader,
}) => {
  const year = new Date().getFullYear();

  const fallback =
    fallbackStyle === "card"
      ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F9FF;border-radius:10px;"><tr><td style="padding:14px 14px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;"><tr>
    <td width="44" valign="middle">${linkIcon}</td>
    <td valign="middle">
      <p style="margin:0;color:#182044;font-size:13px;line-height:1.4;font-weight:700;">Button not working?</p>
      <p style="margin:0;color:#7480A0;font-size:12.5px;line-height:1.45;">Copy and paste this link into your browser:</p>
    </td>
  </tr></table>
  ${linkBox(url)}
</td></tr></table>`
      : `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;"><tr>
  <td valign="middle"><div style="height:1px;background:#E5E8F4;font-size:0;line-height:0;">&nbsp;</div></td>
  <td align="center" width="40" style="color:#98A2BC;font-size:11px;letter-spacing:.5px;">OR</td>
  <td valign="middle"><div style="height:1px;background:#E5E8F4;font-size:0;line-height:0;">&nbsp;</div></td>
</tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F9FF;border:1px solid #EEF0FA;border-radius:10px;"><tr><td style="padding:14px;">
  <p style="margin:0 0 10px;color:#7480A0;font-size:12.5px;line-height:1.5;text-align:center;">If the button doesn&#8217;t work, copy and paste this link into your browser:</p>
  ${linkBox(url)}
</td></tr></table>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light only" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F5F6FF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F6FF;font-family:${FONT};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #E8EAFE;border-radius:14px;overflow:hidden;">
    ${header(headerVariant)}
    <tr><td align="center" style="padding:24px 28px 4px;">
      ${hero(illustration)}
      <h1 style="margin:0;color:#11183D;font-size:22px;line-height:1.25;letter-spacing:-.4px;font-weight:800;">${title}</h1>
      <div style="width:32px;height:3px;margin:12px auto 14px;background:#C7C9FF;border-radius:3px;font-size:0;line-height:0;">&nbsp;</div>
      <p style="margin:0 0 6px;color:#253052;font-size:15px;line-height:1.5;">${greeting}</p>
      <p style="margin:0 auto;max-width:380px;color:#596785;font-size:14px;line-height:1.6;">${message}</p>
    </td></tr>
    <tr><td align="center" style="padding:18px 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:9px;box-shadow:0 6px 14px rgba(74,77,254,.25);">
          <a href="${url}" target="_blank" style="display:inline-block;padding:11px 30px;color:#FFFFFF;font-size:14.5px;line-height:1.2;font-weight:700;text-decoration:none;border-radius:9px;">${ctaLabel}&nbsp;&nbsp;&#8594;</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 24px 12px;">${fallback}</td></tr>
    <tr><td style="padding:0 24px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2FF;border-radius:10px;"><tr>
        <td width="58" valign="middle" style="padding:12px 0 12px 14px;">${clockIcon}</td>
        <td valign="middle" style="padding:12px 14px 12px 0;color:#667392;font-size:12.5px;line-height:1.5;">
          <span style="color:#182044;font-size:13px;">This link expires in <strong>${expiry}</strong>.</span><br/>${expiryNote}
        </td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:16px 24px 18px;border-top:1px solid #EEF0FA;color:#8290AF;">
      <p style="margin:0 0 8px;font-size:11.5px;line-height:1.6;">&#169; ${year} Unideals. All rights reserved.<br/>India</p>
      <p style="margin:0;font-size:11.5px;line-height:1.6;">
        <a href="${siteUrl}/privacy-policy" style="color:#3838EC;text-decoration:none;">Privacy Policy</a>
        <span style="padding:0 8px;color:#AAB2CC;">&#8226;</span>
        <a href="${siteUrl}/termscondition" style="color:#3838EC;text-decoration:none;">Terms of Service</a>
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
};
