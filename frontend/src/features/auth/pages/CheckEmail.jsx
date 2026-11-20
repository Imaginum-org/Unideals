import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { checkEmailVerification, resendVerification } from "../api/authApi";
import { Check, Lightbulb, Mail, MailCheck, Pencil } from "lucide-react";
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
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";

function CheckEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const safeTimeout = useSafeTimeout();

  // Prefill from signup/login state, but keep editable so refresh still works.
  const [emailInput, setEmailInput] = useState(location.state?.email || "");
  const returnTo = location.state?.from;
  const emailInputRef = useRef(emailInput);
  emailInputRef.current = emailInput;

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const [formMessage, setFormMessage] = useState(null);

  const clearFormMessage = () => setFormMessage(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const getTarget = () => {
    if (returnTo) {
      if (typeof returnTo === "string") return returnTo;
      return `${returnTo.pathname || "/"}${returnTo.search || ""}${returnTo.hash || ""}`;
    }
    return "/login";
  };

  const handleResend = async () => {
    const cleanEmail = emailInputRef.current.trim().toLowerCase();
    if (!cleanEmail) {
      setFormMessage({
        variant: "error",
        text: "Please enter your email address first.",
      });
      setIsEditingEmail(true);
      return;
    }

    clearFormMessage();
    setIsResending(true);
    try {
      const response = await resendVerification({
        email: cleanEmail,
      });

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

  const handleVerifyStatus = async (fromPoll = false) => {
    const cleanEmail = emailInputRef.current.trim().toLowerCase();
    if (!cleanEmail) {
      if (!fromPoll) {
        setFormMessage({
          variant: "error",
          text: "Please enter your email address first.",
        });
        setIsEditingEmail(true);
      }
      return false;
    }

    if (!fromPoll) {
      clearFormMessage();
      setIsChecking(true);
    }
    try {
      const response = await checkEmailVerification(cleanEmail);

      if (response.data.success) {
        if (response.data.verified) {
          setFormMessage({
            variant: "success",
            text: "Email verified! Redirecting…",
          });
          safeTimeout(() => navigate(getTarget(), { replace: true }), 900);
          return true;
        }
        if (!fromPoll) {
          setFormMessage({
            variant: "info",
            text: "Your email isn’t verified yet. Open the link we sent, then try again.",
          });
        }
      }
    } catch (error) {
      if (!fromPoll) {
        setFormMessage({
          variant: "error",
          text:
            error.response?.data?.message ||
            "Unable to check verification status right now.",
        });
      }
    } finally {
      if (!fromPoll) setIsChecking(false);
    }
    return false;
  };

  // Gentle auto-poll: check up to 3 times, 5s apart, then stop (manual kept).
  useEffect(() => {
    if (pollCount >= 3) return;
    const id = window.setTimeout(async () => {
      const done = await handleVerifyStatus(true);
      if (!done) setPollCount((c) => c + 1);
    }, 5000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollCount]);

  const shownEmail = emailInput.trim();
  const provider = getMailProvider(shownEmail);
  const autoChecking = Boolean(shownEmail) && pollCount < 3 && formMessage?.variant !== "success";

  return (
    <AuthShell>
      <div className="auth-stagger text-center">
        <AuthStatusIcon icon={MailCheck} />

        <AuthHeading
          align="center"
          title="Verify your email"
          subtitle="We’ve sent a verification link to the address below. Open it to confirm your account."
          className="mb-5"
        />

        {isEditingEmail ? (
          <form
            className="flex items-start gap-2 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (emailInput.trim()) setIsEditingEmail(false);
            }}
          >
            <AuthField
              className="flex-1"
              icon={Mail}
              label="Email address"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={emailInput}
              maxLength={254}
              autoFocus
              onChange={(e) => {
                setEmailInput(e.target.value);
                clearFormMessage();
              }}
            />
            <button
              type="submit"
              disabled={!emailInput.trim()}
              aria-label="Save email"
              className="grid size-[3.25rem] shrink-0 place-items-center rounded-xl bg-[#393AF2] text-white transition hover:bg-[#2F30E0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#393AF2]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="size-5" strokeWidth={2.6} />
            </button>
          </form>
        ) : (
          <div className="mx-auto flex max-w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-2 dark:border-white/10 dark:bg-[#1b1c20]">
            <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-slate-900 dark:text-white">
              {shownEmail || "No email yet"}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              aria-label="Change email"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold text-[#393AF2] transition hover:bg-[#393AF2]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/40 dark:text-[#9A9BFF] dark:hover:bg-white/5"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Change
            </button>
          </div>
        )}

        {formMessage ? (
          <AuthMessageBanner variant={formMessage.variant} className="mt-4 text-left">
            {formMessage.text}
          </AuthMessageBanner>
        ) : null}

        <div className="mt-6 space-y-3">
          <AuthPrimaryButton
            type="button"
            onClick={() => handleVerifyStatus(false)}
            loading={isChecking}
            loadingText="Checking…"
            withArrow={false}
          >
            I&apos;ve verified my email
          </AuthPrimaryButton>
          {provider ? <OpenMailButton provider={provider} /> : null}
        </div>

        {autoChecking ? (
          <p className="mt-3 inline-flex items-center gap-2 text-[0.75rem] text-slate-400 dark:text-zinc-500">
            <span className="auth-live-dot size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Checking automatically…
          </p>
        ) : null}

        <p className="mt-5 text-[0.875rem] text-slate-500 dark:text-zinc-400">
          Didn&apos;t receive the email?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className={`${authLinkClass} tabular-nums disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-zinc-500`}
          >
            {isResending ? (
              <ButtonLoader loading loadingText="Sending…" />
            ) : resendCooldown > 0 ? (
              `Resend in ${formatTimer(resendCooldown)}`
            ) : (
              "Resend email"
            )}
          </button>
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-4 text-left dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <p className="text-[0.8125rem] leading-relaxed text-slate-600 dark:text-zinc-300">
            Not there after a few minutes? Check your spam folder, and make sure your university
            firewall isn&apos;t blocking our domain.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <AuthBackLink to="/signup">Back to sign up</AuthBackLink>
        </div>
      </div>
    </AuthShell>
  );
}

export default CheckEmail;
