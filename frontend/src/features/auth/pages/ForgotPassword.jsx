import { useEffect, useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { forgotPassword } from "../api/authApi";
import AuthShell from "../components/AuthShell.jsx";
import AuthMessageBanner from "../components/AuthMessageBanner";
import {
  AuthBackLink,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  AuthStatusIcon,
  OpenMailButton,
  authLinkClass,
} from "../components/AuthUI.jsx";
import { formatTimer, getMailProvider } from "../utils/mailProvider.js";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const safeTimeout = useSafeTimeout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formMessage, setFormMessage] = useState(null);

  const clearFormMessage = () => setFormMessage(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setFormMessage({
        variant: "error",
        text: "Please enter your email address.",
      });
      return;
    }

    clearFormMessage();
    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email: cleanEmail });

      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text:
            response.data.message ||
            "If an account exists for this email, we’ve sent a reset link. Check your inbox.",
        });
        setResendCooldown(120);
        safeTimeout(() => {
          setFormMessage(null);
          setIsSubmitted(true);
        }, 900);
      }
    } catch (error) {
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "We couldn’t send a reset link. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend straight from the "check your inbox" screen (same request, same
  // 2-minute cooldown), so nobody has to retype their email.
  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0 || isResending) return;

    clearFormMessage();
    setIsResending(true);
    try {
      const response = await forgotPassword({ email: cleanEmail });
      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text: "We sent another reset link. It can take a minute to arrive.",
        });
        setResendCooldown(120);
      }
    } catch (error) {
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "We couldn’t send a reset link. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const editEmail = () => {
    setFormMessage(null);
    setIsSubmitted(false);
  };

  const isError = formMessage?.variant === "error";
  const errorText = formMessage?.text?.toLowerCase() || "";

  // Highlight email if the error explicitly mentions 'email'
  const hasEmailError = isError && errorText.includes("email");
  const provider = getMailProvider(email);

  return (
    <AuthShell>
      {!isSubmitted ? (
        <form key="request" onSubmit={handleSubmit} className="auth-stagger">
          <AuthHeading
            title="Forgot your password?"
            subtitle="No worries. Enter the email linked to your account and we’ll send you a link to reset it."
          />

          {formMessage ? (
            <AuthMessageBanner variant={formMessage.variant} className="mb-4">
              {formMessage.text}
            </AuthMessageBanner>
          ) : null}

          <AuthField
            icon={Mail}
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            maxLength={254}
            error={hasEmailError}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFormMessage();
            }}
            required
          />

          <AuthPrimaryButton className="mt-5" loading={isSubmitting} loadingText="Sending link…">
            Send reset link
          </AuthPrimaryButton>

          <div className="mt-8 flex justify-center">
            <AuthBackLink to="/login" />
          </div>
        </form>
      ) : (
        <div key="sent" className="auth-stagger text-center">
          <AuthStatusIcon icon={MailCheck} />

          <AuthHeading
            align="center"
            title="Check your inbox"
            subtitle="We’ve sent a password reset link to"
            className="mb-3"
          />

          <p>
            <span className="inline-flex max-w-full rounded-lg bg-[#393AF2]/10 px-3 py-1.5 text-[0.875rem] font-semibold text-[#393AF2] dark:bg-[#9A9BFF]/10 dark:text-[#B9BAFF]">
              <span className="truncate">{email}</span>
            </span>
          </p>

          <p className="mx-auto mt-4 max-w-[22rem] text-[0.875rem] leading-relaxed text-slate-500 dark:text-zinc-400">
            Click the link in that email to reset your password. If you don&apos;t see it, check your
            spam folder.
          </p>

          {formMessage ? (
            <AuthMessageBanner variant={formMessage.variant} className="mt-5 text-left">
              {formMessage.text}
            </AuthMessageBanner>
          ) : null}

          {provider ? <OpenMailButton provider={provider} className="mt-6" /> : null}

          <p className="mt-6 text-[0.875rem] text-slate-500 dark:text-zinc-400">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className={`${authLinkClass} tabular-nums disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-zinc-500`}
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend in ${formatTimer(resendCooldown)}`
                  : "Resend link"}
            </button>
            <span className="mx-2 text-slate-300 dark:text-zinc-600" aria-hidden="true">
              ·
            </span>
            <button type="button" onClick={editEmail} className={authLinkClass}>
              Use a different email
            </button>
          </p>

          <div className="mt-8 flex justify-center">
            <AuthBackLink to="/login" />
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
