import escapeHtml from "../escapeHtml.js";
import { renderEmail, lockIllustration } from "./emailLayout.js";

const forgotPasswordTemplate = ({ name, resetUrl }) => {
  const safeName = escapeHtml(name || "there");
  const safeResetUrl = escapeHtml(resetUrl);
  const siteUrl = escapeHtml(new URL(resetUrl).origin);

  return renderEmail({
    headerVariant: "light",
    illustration: lockIllustration,
    title: "Reset Your Password",
    greeting: `<strong style="color:#182044;">Hi ${safeName},</strong>`,
    message:
      "We received a request to reset your password. If you didn&#8217;t make this request, you can safely ignore this email.",
    ctaLabel: "Reset Password",
    url: safeResetUrl,
    fallbackStyle: "divider",
    expiry: "15 min",
    expiryNote: "If you didn&#8217;t request a password reset, your account is safe and no action is needed.",
    siteUrl,
    preheader: "Reset your Unideals password. This link expires in 15 minutes.",
  });
};

export default forgotPasswordTemplate;
