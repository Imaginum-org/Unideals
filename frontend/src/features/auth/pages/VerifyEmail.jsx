import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import {
  verifyEmail as verifyEmailApi,
  resendVerification,
} from "../api/authApi.js";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import AuthBrandLogo from "../components/AuthBrandLogo.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

const cardShell =
  "w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-[#F7F8FA] px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const safeTimeout = useSafeTimeout();
  const [loading, setLoading] = useState(true);
  const [formMessage, setFormMessage] = useState(null);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-[#F7F8FA] dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#F7F8FA] font-figtree dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-[#F7F8FA] dark:md:bg-[#131313] md:text-[#111827]">
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center">
            <div className={cardShell}>
                <div className="flex flex-col items-center justify-center py-10 text-center md:py-12 lg:py-14 xl:py-16">
                  {loading ? <BrandLoader size="lg" /> : null}
                <h1 className="font-figtree text-[1.25rem] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                  {loading
                    ? "Verifying your email"
                    : formMessage?.variant === "success"
                      ? "You’re all set"
                      : formMessage?.variant === "error"
                        ? "Something went wrong"
                        : "Done"}
                </h1>
                <p className="mt-2 max-w-md font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:mt-3 md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                  {loading
                    ? "Please wait while we confirm your email address."
                    : formMessage?.variant === "success"
                      ? "Your email is verified."
                      : formMessage?.variant === "error"
                        ? "Use the actions below to continue."
                        : "Taking you to the next step."}
                </p>
              </div>

              {formMessage ? (
                <div className="-mt-4 mb-4 px-1 sm:-mt-6 md:mb-5">
                  <AuthMessageBanner variant={formMessage.variant}>
                    {formMessage.text}
                  </AuthMessageBanner>
                </div>
              ) : null}

              {!loading && formMessage?.variant === "error" ? (
                <form onSubmit={handleResend} className="mb-4 px-1">
                  <label className="block text-left text-[0.75rem] font-medium text-gray-700 dark:text-[#D6D6D6]">
                    Email address
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@college.edu"
                      maxLength={254}
                      required
                      className="h-10 w-full rounded-xl border border-transparent bg-[#F7F8FA] px-3 text-xs text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-[#F7F8FA] focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white dark:focus:bg-[#1A1D20]"
                    />
                    <button
                      type="submit"
                      disabled={isResending || resendCooldown > 0}
                      className="h-10 shrink-0 rounded-xl bg-[#393AF2] px-4 text-xs font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isResending
                        ? "Sending…"
                        : resendCooldown > 0
                          ? formatTimer(resendCooldown)
                          : "Resend"}
                    </button>
                  </div>
                  {resendCooldown > 0 ? (
                    <p className="mt-2 text-center text-[0.7rem] text-gray-500 dark:text-gray-400">
                      You can resend another verification email in{" "}
                      {formatTimer(resendCooldown)}.
                    </p>
                  ) : null}
                </form>
              ) : null}

              <p className="mt-[2.7vh] text-center text-xs text-gray-700 sm:text-[0.8125rem] md:mt-[1.8vh] md:text-[0.7rem] lg:mt-2.5 lg:text-xs xl:mt-3.5 xl:text-sm 2xl:text-sm">
                <Link
                  to="/login"
                  className="font-semibold text-[#393AF2] transition hover:text-[#2426C7]"
                >
                  Go to sign in
                </Link>
              </p>

              <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#CBD5E1] md:hidden" />
            </div>
          </div>
        </div>
      </div>

      <AuthPageRightPart />
    </div>
  );
}

export default VerifyEmail;
