import escapeHtml from "../escapeHtml.js";
import { renderEmail, envelopeIllustration } from "./emailLayout.js";

const verifyEmailTemplate = ({ name, url }) => {
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(url);
  const siteUrl = escapeHtml(new URL(url).origin);

  return renderEmail({
    headerVariant: "brand",
    illustration: envelopeIllustration,
    title: "Verify Your Email Address",
    greeting: `Hi <strong style="color:#4A4DFE;">${safeName}</strong>,`,
    message:
      "Thanks for signing up! Please confirm this is your email address to activate your Unideals account.",
    ctaLabel: "Verify Email",
    url: safeUrl,
    fallbackStyle: "card",
    expiry: "24 hours",
    expiryNote: "If you didn&#8217;t create an account with Unideals, you can safely ignore this email.",
    siteUrl,
    preheader: "Confirm your email to activate your Unideals account.",
  });
};

export default verifyEmailTemplate;
