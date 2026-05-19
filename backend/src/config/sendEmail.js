import dotenv from "dotenv";
dotenv.config();
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY missing");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ sendTo, subject, html }) => {
  if (!sendTo || !subject || !html) {
    throw new Error("Missing email parameters ");
  }
  try {
    const { data, error } = await resend.emails.send({
      from: "Unideals <onboarding@unideals.in>",       // MUST be your verified domain
      reply_to: "imaginum.org@gmail.com",            // Users will reply to your real inbox!
      to: sendTo,
      subject: subject,
      html: html,
    });

    if (error) {
      throw new Error(error.message || "Email sending failed");
    }
    return data;
  } catch (error) {
    console.error("Email Error:", error.message);
    throw error;
  }
};
export default sendEmail;
