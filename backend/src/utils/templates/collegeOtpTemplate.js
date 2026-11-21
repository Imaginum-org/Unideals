import escapeHtml from "../escapeHtml.js";
import { renderOtpEmail } from "./emailLayout.js";

const collegeOtpTemplate = ({ name, code, siteUrl }) => {
  const digits = String(code).replace(/\D/g, "");
  const firstName = String(name || "").trim().split(/\s+/)[0] || "there";
  // FRONTEND_URL may list several origins; links use the first.
  const first = String(siteUrl || "").split(",")[0].trim() || "https://app.unideals.in";
  const site = escapeHtml(first.replace(/\/+$/, ""));
  return renderOtpEmail({
    title: "Verify your college email",
    greeting: `Hi ${escapeHtml(firstName)},`,
    message:
      "Enter the code below on Unideals to confirm this is your college email. Once verified, a verified tick appears next to your name so buyers know you&#8217;re a real student.",
    code: digits,
    expiry: "10 minutes",
    expiryNote:
      "Didn&#8217;t request this? You can safely ignore this email. Nobody can use this code without signing in to your Unideals account, and we&#8217;ll never ask you to share it.",
    ctaLabel: "Open verification settings",
    ctaUrl: `${site}/settings?tab=verification`,
    siteUrl: site,
    preheader: `Your Unideals verification code is ${digits}. It expires in 10 minutes.`,
  });
};

export default collegeOtpTemplate;
