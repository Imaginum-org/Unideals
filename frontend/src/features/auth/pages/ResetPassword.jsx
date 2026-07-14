import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowLeft,
} from "lucide-react";
import { resetPassword, verifyResetPasswordToken } from "../api/authApi.js";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import {
  getPasswordStrength,
  isPasswordStrongEnough,
} from "../utils/passwordStrength";
import AuthBrandLogo from "../components/AuthBrandLogo.jsx";

const cardShell =
  "w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none";

const primaryBtn =
  "mt-[2.2vh] h-[6.3vh] w-full rounded-xl bg-[#393AF2] text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 md:mt-3 md:h-10 md:rounded-xl md:text-xs lg:mt-3 lg:h-10 lg:text-sm xl:mt-[2.9vh] xl:h-[6.4vh] xl:text-[0.8rem] 2xl:mt-[2.6vh] 2xl:h-[6.4vh] 2xl:text-[0.85rem]";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [formMessage, setFormMessage] = useState(null);

  const navigate = useNavigate();
  const { token } = useParams();
  const strength = getPasswordStrength(password);
  const showPasswordOk = strength?.level === "awesome";
  const clearFormMessage = () => setFormMessage(null);

  useEffect(() => {
    const verifyTokenOnLoad = async () => {
      try {
        const response = await verifyResetPasswordToken(token);

        if (response.data.success) {
          setIsTokenValid(true);
        }
      } catch (error) {
        setIsTokenValid(false);
        setLoadError(
          error.response?.data?.message || "Invalid or expired link.",
        );
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      verifyTokenOnLoad();
    } else {
      setIsValidating(false);
      setIsTokenValid(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFormMessage();

    if (!isPasswordStrongEnough(password)) {
      setFormMessage({
        variant: "error",
        text: "Please meet all password requirements below before continuing.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFormMessage({
        variant: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword(token, {
        password,
      });

      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text:
            response.data.message ||
            "Password updated successfully. You can sign in with your new password.",
        });
        window.setTimeout(() => setIsSuccess(true), 1000);
      }
    } catch (error) {
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "Failed to reset password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart Error Parsing Logic
  const isError = formMessage?.variant === "error";
  const errorText = formMessage?.text?.toLowerCase() || "";

  // Highlight the primary password field if requirements aren't met, or if passwords don't match
  const hasPasswordError =
    isError &&
    (errorText.includes("requirements") || errorText.includes("password"));

  // Highlight the confirm password field specifically if they don't match
  const hasConfirmError =
    isError && (errorText.includes("match") || errorText.includes("password"));

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white font-figtree dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center">
            <div className={cardShell}>
              {isValidating ? (
                <div className="flex flex-col items-center justify-center py-12 text-center md:py-16">
                  <div
                    className="mb-6 size-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#393AF2] dark:border-zinc-700 dark:border-t-[#818cf8] sm:mb-8 sm:size-14 md:size-16"
                    aria-hidden="true"
                  />
                  <p className="font-figtree text-sm font-medium text-zinc-700 animate-pulse dark:text-zinc-300 sm:text-base md:text-lg">
                    Verifying secure link…
                  </p>
                </div>
              ) : !isTokenValid ? (
                <div className="flex flex-col">
                  <div className="mb-5 md:mb-4 lg:mb-5">
                    <h1 className="font-figtree text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem] font-semibold leading-snug text-red-600 dark:text-red-400">
                      Link Expired
                    </h1>
                    <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                      This password reset link is invalid or has expired. For
                      your security, links only stay valid for a limited time.
                    </p>
                    {loadError ? (
                      <div className="mt-4 mb-[-1.5vh] xl:mb-[-1.4vh]">
                        <AuthMessageBanner variant="error">
                          {loadError}
                        </AuthMessageBanner>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className={primaryBtn}
                  >
                    Request a new link
                  </button>
                  <p className="mt-6 text-center text-xs text-gray-700 sm:text-[0.8125rem] md:mt-3 lg:text-sm xl:mt-5">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#393AF2] transition hover:text-[#2426C7] sm:text-[0.8125rem] lg:text-xs xl:text-[0.8125rem]"
                    >
                      <ArrowLeft className="size-[0.875rem]" /> Back to Login
                    </Link>
                  </p>
                </div>
              ) : !isSuccess ? (
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="mb-4 md:mb-4 lg:mb-5 xl:mb-[2.4vh]">
                    <h1 className="font-figtree text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem] font-semibold leading-snug tracking-normal">
                      Create a new password
                    </h1>
                    <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                      Your identity is verified. Choose a strong password you
                      haven&apos;t used elsewhere.
                    </p>
                  </div>

                  {formMessage ? (
                    <div className="mb-[2.1vh] mt-[-0.8vh]  md:mb-3 xl:mb-[2vh] xl:mt-[-0.7vh] ">
                      <AuthMessageBanner variant={formMessage.variant}>
                        {formMessage.text}
                      </AuthMessageBanner>
                    </div>
                  ) : null}

                  <div className="space-y-[2.3vh] sm:space-y-4 md:space-y-3 lg:space-y-3.5 xl:space-y-[2.4vh]">
                    <label className="block">
                      <span className="relative block group">
                        <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5 xl:size-4 2xl:size-4" />
                        <span
                          className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                            password
                              ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                              : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                          } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                        >
                          New password
                        </span>
                        <input
                          className={`h-[6.3vh] w-full rounded-xl border pl-10 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] pr-[5.75rem] md:pr-[6.5rem] ${
                            hasPasswordError
                              ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                              : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                          }`}
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearFormMessage();
                          }}
                          placeholder=" "
                          required
                        />
                        <div className="absolute right-[3.5rem] top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            type="button"
                            className="relative group flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:text-[#393AF2] focus:outline-none focus:ring-2 focus:ring-[#393AF2]/30"
                            aria-label="Password requirements"
                          >
                            <AlertCircle className="size-[1rem]" />
                            <span className="pointer-events-none absolute right-full top-1/2 hidden w-[16rem] -translate-y-1/2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[0.7rem] text-slate-700 shadow-lg opacity-0 transition-all duration-200 group-hover:block group-hover:opacity-100 dark:border-[#3A3A3A] dark:bg-[#111827] dark:text-[#E5E7EB]">
                              Password must be 6-8 characters, include letters
                              and numbers, and contain both upper and lower case
                              letters.
                            </span>
                          </button>
                          {showPasswordOk ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              <Check className="size-[1rem]" strokeWidth={3} />
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-[#393AF2] sm:right-4"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="size-[1.125rem]" />
                          ) : (
                            <Eye className="size-[1.125rem]" />
                          )}
                        </button>
                      </span>
                      <PasswordStrengthMeter password={password} />
                    </label>

                    <label className="block">
                      <span className="relative block group">
                        <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5 xl:size-4 2xl:size-4" />
                        <span
                          className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                            confirmPassword
                              ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                              : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                          } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                        >
                          Confirm new password
                        </span>
                        <input
                          className={`h-[6.3vh] w-full rounded-xl border pl-10 pr-3 md:pr-3 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] ${
                            hasConfirmError
                              ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                              : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                          }`}
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            clearFormMessage();
                          }}
                          placeholder=" "
                          required
                        />
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${primaryBtn} mt-[2.3vh] xl:mt-[2.4vh]`}
                  >
                    {isSubmitting ? "Updating…" : "Update password"}
                  </button>

                  <p className="mt-4 text-center text-xs md:mt-3 lg:text-sm xl:mt-[2.5vh]">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#393AF2] transition hover:text-[#2426C7] sm:text-[0.8125rem] lg:text-xs xl:text-[0.8125rem]"
                    >
                      <ArrowLeft className="size-[0.875rem]" /> Back to Login
                    </Link>
                  </p>

                  <div className="mx-auto mt-6 h-1 w-24 rounded-full bg-[#CBD5E1] md:hidden" />
                </form>
              ) : (
                <div className="flex flex-col">
                  <div className="mb-5 md:mb-4 lg:mb-5">
                    <h1 className="font-figtree text-[1.25rem] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                      Password updated
                    </h1>
                    <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                      Your password has been changed. You can sign in with your
                      new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className={primaryBtn}
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthPageRightPart />
    </div>
  );
}

export default ResetPassword;
