import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { checkEmailVerification, resendVerification } from "../api/authApi";
import checkemailicon from "../../../assets/checkemailicon.png";
import { ArrowLeft, OctagonAlert } from "lucide-react";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import AuthBrandLogo from "../components/AuthBrandLogo";

function CheckEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the email passed from the signup page.
  // If someone visits this page directly without signing up, it falls back to empty.
  const email = location.state?.email || "";

  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [formMessage, setFormMessage] = useState(null);

  const clearFormMessage = () => setFormMessage(null);

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

  const handleResend = async () => {
    if (!email) {
      navigate("/signup");
      return;
    }

    clearFormMessage();
    setIsResending(true);
    try {
      const response = await resendVerification({
        email,
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

  const handleVerifyStatus = async () => {
    if (!email) {
      navigate("/signup");
      return;
    }

    clearFormMessage();
    setIsChecking(true);
    try {
      const response = await checkEmailVerification(email);

      if (response.data.success) {
        if (response.data.verified) {
          setFormMessage({
            variant: "success",
            text: "Email verified! Redirecting to sign in…",
          });
          window.setTimeout(() => navigate("/login"), 900);
        } else {
          setFormMessage({
            variant: "info",
            text: "Your email isn’t verified yet. Open the link we sent, then try again.",
          });
        }
      }
    } catch (error) {
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "Unable to check verification status right now.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white font-figtree dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center">
            <div className="w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-hidden md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none">
              <div className="flex flex-col items-center text-center">
                <div className="mb-[1.5vh] flex h-14 w-14 items-center justify-center rounded-full bg-blue-700/10 transition-colors duration-300 dark:bg-blue-500/20 sm:h-16 sm:w-16 md:mb-3 md:h-12 md:w-12 lg:mb-4 xl:mb-[1.9vh] xl:h-14 xl:w-14 2xl:h-16 2xl:w-16">
                  <img
                    src={checkemailicon}
                    alt="Check Email Icon"
                    className="h-6 w-7 sm:h-7 sm:w-8 md:h-5 md:w-6 lg:h-7 lg::w-8 "
                  />
                </div>
                <h2 className="font-figtree font-semibold leading-snug tracking-normal text-zinc-900 transition-colors duration-300 dark:text-zinc-100 text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                  Check Your Email
                </h2>
                <p className="mt-1.5 font-figtree text-[0.75rem] leading-snug text-gray-700 transition-colors duration-300 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                  We’ve sent a verification link to your email address.
                  <br className="hidden sm:block" />
                  Please click the link to confirm your account.
                </p>
                <div className="mt-[2.2vh] max-w-full rounded-xl border border-slate-300/30 bg-slate-100 px-4 py-2 transition-colors duration-300 dark:border-zinc-800 dark:bg-[#1e1e1e] md:mt-[1.8vh]">
                  <span className="block truncate text-sm font-semibold text-zinc-900 transition-colors duration-300 dark:text-zinc-100 md:text-xs lg:text-[0.8rem] 2xl:text-[0.85rem]">
                    {email || "Unknown Email"}
                  </span>
                </div>
              </div>

              {formMessage ? (
                <div className="mt-[2.2vh] md:mt-[1.8vh]">
                  <AuthMessageBanner variant={formMessage.variant}>
                    {formMessage.text}
                  </AuthMessageBanner>
                </div>
              ) : null}

              <div className="mt-[2.2vh] space-y-[2vh] md:mt-[1.8vh] md:space-y-3 lg:mt-3 lg:space-y-3 xl:mt-[2.9vh] xl:space-y-[2.2vh]">
                <button
                  onClick={handleVerifyStatus}
                  disabled={isChecking}
                  className="h-[6.3vh] w-full rounded-xl bg-[#393AF2] text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 md:mt-0 md:h-10 md:rounded-xl md:text-xs lg:h-10 lg:text-sm xl:h-[6.4vh] xl:text-[0.8rem] 2xl:h-[6.4vh] 2xl:text-[0.85rem]"
                >
                  {isChecking ? "Checking..." : "Reload / I’ve Verified"}
                </button>

                <div className="flex flex-wrap items-center justify-center gap-1 text-center text-[0.75rem] sm:text-[0.8125rem] md:text-[0.7rem] lg:text-xs xl:text-[0.75rem] 2xl:text-[0.759rem]">
                  <span className="text-gray-700 transition-colors duration-300 dark:text-gray-400">
                    Didn’t receive the email?
                  </span>
                  <button
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0}
                    className="font-semibold text-blue-700 transition-colors hover:text-[#2426C7] disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {isResending
                      ? "Sending..."
                      : resendCooldown > 0
                        ? `Resend Email (${formatTimer(resendCooldown)})`
                        : "Resend Email"}
                  </button>
                </div>
                {resendCooldown > 0 ? (
                  <p className="mt-2 text-center text-[0.7rem] text-gray-500 dark:text-gray-400">
                    You can resend another verification email in{" "}
                    {formatTimer(resendCooldown)}.
                  </p>
                ) : null}

                <div className="inline-flex items-start justify-start gap-3 rounded-xl bg-slate-100 p-4 outline outline-1 outline-offset-[-0.0625rem] outline-slate-300/10 transition-colors duration-300 dark:bg-[#1e1e1e] dark:outline-zinc-800 md:p-3 lg:p-4">
                  <div className="pt-1">
                    <OctagonAlert className="size-[0.9375rem] text-red-500 dark:text-red-400" />
                  </div>
                  <div className="text-xs font-normal leading-5 text-gray-700 transition-colors duration-300 dark:text-gray-300 md:text-[0.7rem] md:leading-4 lg:text-xs lg:leading-5 xl:text-[0.75rem]">
                    Check your spam folder if you don&apos;t see the message
                    within a few minutes. Make sure your university firewall
                    isn&apos;t blocking our domain.
                  </div>
                </div>
              </div>

              <div className="mt-[2.7vh] flex items-center justify-center md:mt-[1.8vh] lg:mt-2.5 xl:mt-3.5">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#393AF2] transition hover:text-[#2426C7] sm:text-[0.8125rem] lg:text-xs xl:text-[0.8125rem]"
                >
                  <ArrowLeft className="size-[0.875rem]" /> Back to Registration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <AuthPageRightPart />
    </div>
  );
}

export default CheckEmail;
