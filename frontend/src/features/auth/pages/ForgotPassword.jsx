import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "../api/authApi";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import AuthBrandLogo from "../components/AuthBrandLogo";

/* ─── Main component ─── */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Clean the email
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
        window.setTimeout(() => setIsSubmitted(true), 900);
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

  // Smart Error Parsing Logic
  const isError = formMessage?.variant === "error";
  const errorText = formMessage?.text?.toLowerCase() || "";

  // Highlight email if the error explicitly mentions 'email'
  const hasEmailError = isError && errorText.includes("email");

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden font-figtree">
      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white  dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        {/* Gradient wrapper — visible on mobile, transparent on md+ */}
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          {/* Logo */}
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          {/* ── Form / Success card ── */}
          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center">
            {/* -------- FORM STATE -------- */}
            {!isSubmitted ? (
              <form
                onSubmit={handleSubmit}
                className="
                 w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-hidden md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none
                "
              >
                {/* Heading */}
                <div className="mb-4 md:mb-[2vh] lg:mb-4 xl:mb-[2.5vh] 2xl:mb-[2.6vh]">
                  <h1 className="font-figtree font-semibold leading-snug tracking-normal text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                    Forgot Password
                  </h1>
                  <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                    Enter your email address and we&apos;ll send you a link to
                    reset your password
                  </p>
                </div>

                {formMessage ? (
                  <div className="mb-3 sm:mb-3.5 md:mb-2.5 lg:mb-2.5 xl:mb-2.5">
                    <AuthMessageBanner variant={formMessage.variant}>
                      {formMessage.text}
                    </AuthMessageBanner>
                  </div>
                ) : null}

                {/* Email field */}
                <label className="mb-[2.2vh] block md:mb-[2.8vh] lg:mb-3 xl:mb-[3vh] 2xl:mb-[2.6vh]">
                  <span className="relative block group">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5 xl:size-4 2xl:size-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        email
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                    >
                      Email Address
                    </span>
                    <input
                      type="email"
                      value={email}
                      placeholder=" "
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFormMessage();
                      }}
                      required
                      className={`h-[6.3vh] sm:h-11 md:h-10 lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] w-full border pl-10 pr-4 text-[#111827] text-[0.6875rem] md:text-xs outline-none transition placeholder:text-gray-400/70 dark:text-white md:rounded-xl md:pl-11 ${
                        hasEmailError
                          ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                          : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                      }`}
                    />
                  </span>
                </label>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    h-[6.3vh] sm:h-11 md:h-10 lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh]
                    w-full rounded-xl
                    bg-[#393AF2] font-semibold text-white
                    text-sm md:text-xs lg:text-sm xl:text-[0.8rem] 2xl:text-[0.85rem]
                    transition hover:bg-[#2829D8]
                    focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25
                    disabled:cursor-not-allowed disabled:opacity-60
                    md:rounded-xl
                  "
                >
                  {isSubmitting ? "Sending link…" : "Send Reset Link"}
                </button>

                {/* Back to login */}
                <div className="mt-[2.7vh] flex justify-center md:mt-[1.8vh] lg:mt-2.5 xl:mt-3.5">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#393AF2] transition hover:text-[#2426C7] sm:text-[0.8125rem] lg:text-xs xl:text-[0.8125rem]"
                  >
                    <ArrowLeft className="size-[0.875rem]" />
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              /* -------- SUCCESS STATE -------- */
              <div
                className="w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none
  "
              >
                {/* Success icon */}
                <div className="mb-5 flex flex-col items-center gap-3 w-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                    <CheckCircle2 className="size-6 text-[#393AF2]" />
                  </div>

                  {/* Text content strictly centered */}
                  <div className="flex flex-col items-center text-center">
                    <h1 className="font-figtree font-semibold leading-snug text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                      Check your inbox
                    </h1>
                    <p className="mt-2 text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:mt-[1vh] xl:text-[0.8rem] 2xl:text-[0.85rem]">
                      We&apos;ve sent a password reset link to
                    </p>
                    {/* Email pill */}
                    <span className="mt-1.5 inline-block rounded-md bg-slate-100 dark:bg-[#1A1D20] px-3 py-2 text-[0.75rem] font-semibold text-[#393AF2] dark:text-[#818cf8] md:text-[0.8125rem] xl:mt-[2.8vh]">
                      {email}
                    </span>
                    <p className="mt-3 text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:mt-[2.8vh] xl:text-[0.8rem] 2xl:text-[0.85rem]">
                      Click the link in that email to reset your password. If
                      you don&apos;t see it, check your spam folder.
                    </p>
                  </div>
                </div>
                {/* Resend hint */}
                <p className="text-center text-[0.75rem] md:text-[0.8125rem] lg:text-xs text-gray-500 dark:text-[#9AA8B6] w-full">
                  Didn&apos;t receive an email?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setFormMessage(null);
                      setIsSubmitted(false);
                    }}
                    disabled={resendCooldown > 0}
                    className="font-semibold text-[#393AF2] transition hover:text-[#2426C7] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Try again
                  </button>
                </p>
                {resendCooldown > 0 ? (
                  <p className="mt-2 text-center text-[0.7rem] text-gray-500 dark:text-gray-400">
                    You can request another reset link in{" "}
                    {formatTimer(resendCooldown)}.
                  </p>
                ) : null}

                {/* Back to login */}
                <div className="mt-5 md:mt-4 flex justify-center w-full xl:mt-[3vh]">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-1.5 text-[0.75rem] font-medium text-[#393AF2] transition hover:text-[#2426C7] sm:text-[0.8125rem] lg:text-xs xl:text-[0.8125rem]"
                  >
                    <ArrowLeft className="size-[0.875rem]" />
                    Back to Login
                  </Link>
                </div>
              </div>
            )}
          </div>
          {/* ── end form/success card ── */}
        </div>
        {/* ── end gradient wrapper ── */}
      </div>
      {/* ══════════════ END LEFT PANEL ══════════════ */}

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <AuthPageRightPart />
    </div>
  );
}

export default ForgotPassword;
