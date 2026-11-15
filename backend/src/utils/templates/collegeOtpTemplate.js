import escapeHtml from "../escapeHtml.js";
import { renderOtpEmail } from "./emailLayout.js";

const collegeOtpTemplate = ({ name, code, siteUrl }) =>
  renderOtpEmail({
    title: "Verify your college email",
    greeting: `Hi <strong style="color:#4A4DFE;">${escapeHtml(name || "there")}</strong>,`,
    message:
      "Use this code to confirm this is your college email. Once verified, a verified tick appears next to your name so buyers know you&#8217;re a real student.",
    code: String(code).replace(/\D/g, ""),
    expiry: "10 minutes",
    expiryNote: "If you didn&#8217;t ask for this, you can ignore this email. Nobody can use it without your Unideals account.",
    siteUrl: escapeHtml(siteUrl || "https://unideals.in"),
    preheader: `Your Unideals college verification code is ${String(code).replace(/\D/g, "")}.`,
  });

export default collegeOtpTemplate;
