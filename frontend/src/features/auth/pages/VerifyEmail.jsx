import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Mail, MailWarning, ShieldCheck } from "lucide-react";

import {
  verifyEmail as verifyEmailApi,
  resendVerification,
} from "../api/authApi.js";
import AuthShell from "../components/AuthShell.jsx";
import AuthMessageBanner from "../components/AuthMessageBanner";
import {
  AuthBackLink,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  AuthStatusIcon,
} from "../components/AuthUI.jsx";
import { formatTimer } from "../utils/mailProvider.js";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const safeTimeout = useSafeTimeout();
  const [loading, setLoading] = useState(true);
  const [formMessage, setFormMessage] = useState(null);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const verifyEmail = async () => {
      const code = searchParams.get("code");

      if (!code) {
        setFormMessage({
          variant: "error",
          text: "This verification link is missing a code. Request a new link from sign up or contact support.",
        });
        setLoading(false);
        return;
      }

      try {
        const response = await verifyEmailApi({
          code,
        });

        if (response.data.success) {
          setFormMessage({
            variant: "success",
            text:
              response.data.message ||
              "Email verified successfully! Redirecting to sign in…",
          });
          safeTimeout(() => navigate("/login", { replace: true }), 1200);
        } else {
          setFormMessage({
            variant: "error",
            text: response.data.message || "Verification failed.",
          });
        }
      } catch (error) {
        setFormMessage({
          variant: "error",
          text:
            error.response?.data?.message ||
            "Verification failed. The link may be invalid or expired.",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, navigate, safeTimeout]);

  const handleResend = async (e) => {
    e?.preventDefault();
    const cleanEmail = resendEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFormMessage({
        variant: "error",
        text: "Please enter your email address to resend the link.",
      });
      return;
    }
    setIsResending(true);
    setFormMessage(null);
    try {
      const response = await resendVerification({ email: cleanEmail });
      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text:
            response.data.message ||
            "Verification email sent again. Check your inbox (and spam).",
        });
        setResendCooldown(120);
      }
    } catch (error) {
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "Failed to resend the verification email.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const succeeded = !loading && formMessage?.variant === "success";
  const failed = !loading && formMessage?.variant === "error";

  return (
    <AuthShell>
      {loading ? (
        <div className="flex flex-col items-center py-12 text-center">
          <BrandLoader size="lg" />
          <AuthHeading
            align="center"
            title="Verifying your email"
            subtitle="Please wait while we confirm your email address."
            className="mb-0 mt-6"
          />
        </div>
      ) : (
        <div key={succeeded ? "ok" : "error"} className="auth-stagger text-center">
          <AuthStatusIcon
            icon={succeeded ? ShieldCheck : MailWarning}
            tone={succeeded ? "success" : "danger"}
          />
          <AuthHeading
            align="center"
            title={succeeded ? "You’re all set" : failed ? "We couldn’t verify this link" : "Done"}
            subtitle={
              succeeded
                ? "Your email is verified. Taking you to log in…"
                : failed
                  ? "It may have expired or already been used. Send yourself a fresh one below."
                  : "Taking you to the next step."
            }
          />

          {formMessage ? (
            <AuthMessageBanner variant={formMessage.variant} className="mb-5 text-left">
              {formMessage.text}
            </AuthMessageBanner>
          ) : null}

          {failed ? (
            <form onSubmit={handleResend} className="text-left">
              <AuthField
                icon={Mail}
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={resendEmail}
                maxLength={254}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />
              <AuthPrimaryButton
                className="mt-4"
                loading={isResending}
                loadingText="Sending…"
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Resend in ${formatTimer(resendCooldown)}`
                  : "Send a new verification link"}
              </AuthPrimaryButton>
            </form>
          ) : null}

          {succeeded ? (
            <AuthPrimaryButton type="button" onClick={() => navigate("/login", { replace: true })}>
              Continue to log in
            </AuthPrimaryButton>
          ) : null}

          <div className="mt-8 flex justify-center">
            <AuthBackLink to="/login">Go to log in</AuthBackLink>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default VerifyEmail;
