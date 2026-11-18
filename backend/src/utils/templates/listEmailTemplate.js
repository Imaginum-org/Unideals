// A short "here's what's waiting" email: heading, a few rows, one button.
// Used by the unread-notification digest and the staff attention alert.
// Same table-based, inline-style approach as emailLayout.js (Gmail/Outlook).
import escapeHtml from "../escapeHtml.js";
import { emailHeader } from "./emailLayout.js";

const BRAND = "#4A4DFE";
const FONT = "'Figtree','Segoe UI',Arial,Helvetica,sans-serif";

const clip = (value, max) => {
  const text = String(value ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const row = ({ title, body, meta }) => `
<tr><td style="padding:10px 0;border-bottom:1px solid #EEF0FA;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="top" style="color:#182044;font-size:14px;line-height:1.4;font-weight:700;">${escapeHtml(clip(title, 90))}</td>
    ${meta ? `<td valign="top" align="right" style="padding-left:10px;white-space:nowrap;color:#8290AF;font-size:12px;line-height:1.4;">${escapeHtml(meta)}</td>` : ""}
  </tr></table>
  ${body ? `<p style="margin:3px 0 0;color:#596785;font-size:13px;line-height:1.5;">${escapeHtml(clip(body, 140))}</p>` : ""}
</td></tr>`;

/**
 * All text inputs are plain strings; this function escapes them.
 * @param {object} o
 * @param {string} o.title       heading + <title>
 * @param {string} o.preheader   inbox preview text
 * @param {string} o.intro       sentence under the heading
 * @param {{title:string, body?:string, meta?:string}[]} o.rows
 * @param {string} [o.more]      e.g. "and 4 more"
 * @param {string} o.ctaLabel
 * @param {string} o.ctaUrl      absolute https URL
 * @param {string} o.footnote    why they got this email
 * @param {string} [o.unsubscribeUrl]
 */
export const renderListEmail = ({ title, preheader, intro, rows, more, ctaLabel, ctaUrl, footnote, unsubscribeUrl }) => {
  const year = new Date().getFullYear();
  const url = escapeHtml(ctaUrl);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light only" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F5F6FF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F6FF;font-family:${FONT};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;background:#FFFFFF;border:1px solid #E8EAFE;border-radius:14px;overflow:hidden;">
    ${emailHeader("brand")}
    <tr><td style="padding:24px 28px 6px;">
      <h1 style="margin:0;color:#11183D;font-size:21px;line-height:1.3;letter-spacing:-.3px;font-weight:800;">${escapeHtml(title)}</h1>
      <p style="margin:8px 0 0;color:#596785;font-size:14px;line-height:1.6;">${escapeHtml(intro)}</p>
    </td></tr>
    <tr><td style="padding:6px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.map(row).join("")}</table>
      ${more ? `<p style="margin:10px 0 0;color:#7480A0;font-size:13px;line-height:1.5;">${escapeHtml(more)}</p>` : ""}
    </td></tr>
    <tr><td align="center" style="padding:20px 28px 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius:9px;">
          <a href="${url}" target="_blank" style="display:inline-block;padding:11px 30px;color:#FFFFFF;font-size:14.5px;line-height:1.2;font-weight:700;text-decoration:none;border-radius:9px;">${escapeHtml(ctaLabel)}&nbsp;&nbsp;&#8594;</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:14px 24px 18px;border-top:1px solid #EEF0FA;color:#8290AF;">
      <p style="margin:0 0 6px;font-size:11.5px;line-height:1.6;">${escapeHtml(footnote)}${
        unsubscribeUrl
          ? ` <a href="${escapeHtml(unsubscribeUrl)}" style="color:#3838EC;text-decoration:none;">Unsubscribe</a>`
          : ""
      }</p>
      <p style="margin:0;font-size:11.5px;line-height:1.6;">&#169; ${year} Unideals. All rights reserved.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
};
