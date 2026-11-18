import dotenv from "dotenv";
dotenv.config();
import { Resend } from "resend";

// The Resend client is created on first send, not at import time, so modules
// that merely import this file (auth controller → app → tests, scripts) load
// fine without email credentials. Production still fails fast: server.js
// refuses to start without RESEND_API_KEY (see REQUIRED_IN_PRODUCTION).
let resend = null;
const getClient = () => {
  if (resend) return resend;
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email is not configured: RESEND_API_KEY is missing");
  }
  resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
};

const sendEmail = async ({ sendTo, subject, html, headers }) => {
  if (!sendTo || !subject || !html) {
    throw new Error("Missing email parameters ");
  }
  try {
    const { data, error } = await getClient().emails.send({
      from: "Unideals <onboarding@unideals.in>", // MUST be your verified domain
      // Resend SDK v6 uses camelCase replyTo; reply_to was silently ignored.
      replyTo: "unideals.support@gmail.com",
      to: sendTo,
      subject: subject,
      html: html,
      ...(headers && { headers }),
    });

    if (error) {
      // Keep Resend's error name (e.g. "daily_quota_exceeded") so batch
      // senders can stop instead of burning through the rest of the list.
      const failure = new Error(error.message || "Email sending failed");
      failure.code = error.name || null;
      failure.statusCode = error.statusCode || null;
      throw failure;
    }
    return data;
  } catch (error) {
    console.error("Email Error:", error.message);
    throw error;
  }
};
export default sendEmail;
