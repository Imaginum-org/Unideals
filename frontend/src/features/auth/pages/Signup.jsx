import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { registerUser } from "../api/authApi.js";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import AuthBrandLogo from "../components/AuthBrandLogo.jsx";
import LegalAgreementModal from "../components/LegalAgreementModal";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import SignInwithGoogle from "../components/signinWithGoogle";
import {
  getPasswordStrength,
  isPasswordStrongEnough,
} from "../utils/passwordStrength.js";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);
  const [legalTab, setLegalTab] = useState(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const navigate = useNavigate();
  const strength = getPasswordStrength(password);
  const showPasswordOk = strength?.level === "awesome";

  const clearFormMessage = () => setFormMessage(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    clearFormMessage();

    if (!isPasswordStrongEnough(password)) {
      setFormMessage({
        variant: "error",
        text: "Please meet all password requirements below before continuing.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerUser({
        name: fname,
        email,
        password,
      });

      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text:
            response.data.message ||
            "Account created successfully! Check your email to verify your account.",
        });
        window.setTimeout(() => {
          navigate("/checkEmail", { state: { email } });
        }, 1400);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "An error occurred connecting to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart Error Parsing Logic for Signup
  const isError = formMessage?.variant === "error";
  const errorText = formMessage?.text?.toLowerCase() || "";

  // Highlight full name if the error explicitly mentions 'name'
  const hasNameError = isError && errorText.includes("name");

  // Highlight email if the error explicitly mentions 'email'
  const hasEmailError = isError && errorText.includes("email");

  // Highlight password if the error explicitly mentions 'password' or 'requirements'
  const hasPasswordError =
    isError &&
    (errorText.includes("password") || errorText.includes("requirements"));

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      {legalTab ? (
        <LegalAgreementModal
          activeTab={legalTab}
          onTabChange={setLegalTab}
          onClose={() => setLegalTab(null)}
          onAccept={() => {
            setAcceptedLegal(true);
            setLegalTab(null);
          }}
        />
      ) : null}

      {/* ── LEFT PANEL ── */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white font-figtree dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          {/* Logo */}
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          {/* Form card */}
          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center  xl:px-16">
            <form
              onSubmit={handleRegister}
              className=" w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:p-0 md:shadow-none"
            >
              {/* Heading */}
              <div className="mb-4 md:mb-[2vh] lg:mb-2.5 xl:mb-[2.5vh] 2xl:mb-[2.6vh]">
                <h1 className="font-figtree text-[1.25rem] sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem] font-semibold leading-snug tracking-normal">
                  Create Account
                </h1>
                <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                  Enter your details to start your academic journey.
                </p>
              </div>

              {/* Google button */}
              <SignInwithGoogle />

              {/* Divider */}
              <div className="my-[2.8vh] sm:my-4 md:my-[2.8vh] lg:my-2.5 xl:my-[3vh] 2xl:my-[3vh] flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-300/30 dark:bg-[#3A3A3A]" />
                <span className="text-[0.5625rem] font-normal uppercase leading-tight tracking-[0.18em] text-gray-500 sm:text-[0.625rem] md:text-[0.49rem] xl:text-[0.525rem] 2xl:text-[0.6rem]">
                  or register with email
                </span>
                <div className="h-px flex-1 bg-slate-300/30 dark:bg-[#3A3A3A]" />
              </div>

              {formMessage ? (
                <div className="mb-3 sm:mb-3.5 md:mb-2.5 lg:mb-2.5 xl:mb-[2vh]">
                  <AuthMessageBanner variant={formMessage.variant}>
                    {formMessage.text}
                  </AuthMessageBanner>
                </div>
              ) : null}

              {/* Fields */}
              <div className="space-y-[2.4vh] sm:space-y-3.5 md:space-y-[2.1vh] lg:space-y-2.5 xl:space-y-[2.2vh] 2xl:space-y-[2.3vh]">
                {/* Full Name */}
                <label className="block">
                  <span className="relative block group">
                    <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5 xl:size-4 2xl:size-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        fname
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8] 2xl:text-xs`}
                    >
                      Full Name
                    </span>
                    <input
                      className={`h-[6.3vh] w-full rounded-xl border pl-10 pr-3 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white sm:h-11 md:h-10 md:rounded-xl md:pl-11 lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] md:text-xs xl:text-xs ${
                        hasNameError
                          ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                          : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                      }`}
                      type="text"
                      placeholder=" "
                      value={fname}
                      onChange={(e) => {
                        setFname(e.target.value);
                        clearFormMessage();
                      }}
                      required
                    />
                  </span>
                </label>

                {/* Email */}
                <label className="block">
                  <span className="relative block group">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5  xl:size-4 2xl:size-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        email
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8] 2xl:text-xs`}
                    >
                      Email
                    </span>
                    <input
                      className={`h-[6.3vh] w-full rounded-xl border pl-10 pr-3 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] ${
                        hasEmailError
                          ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                          : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                      }`}
                      type="email"
                      placeholder=" "
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFormMessage();
                      }}
                      required
                    />
                  </span>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="relative block group">
                    <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4 md:size-3.5   xl:size-4 2xl:size-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        password
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8] 2xl:text-xs`}
                    >
                      Password
                    </span>
                    <input
                      className={`h-[6.3vh] w-full rounded-xl border pl-10 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] pr-[5.75rem] md:pr-[6.5rem] ${
                        hasPasswordError
                          ? "border-red-500 bg-red-50 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 dark:border-red-500/80 dark:bg-[#1A1D20]"
                          : "border-transparent bg-slate-50 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:focus:bg-[#1A1D20]"
                      }`}
                      type={showPassword ? "text" : "password"}
                      placeholder=" "
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFormMessage();
                      }}
                      required
                    />
                    <div className="absolute right-[2.7rem] top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        className="relative group flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:text-[#393AF2] focus:outline-none focus:ring-2 focus:ring-[#393AF2]/30"
                        aria-label="Password requirements"
                      >
                        <AlertCircle className="size-[1rem]" />
                        <span className="pointer-events-none absolute right-full top-1/2 hidden w-[16rem] -translate-y-1/2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[0.7rem] text-slate-700 shadow-lg opacity-0 transition-all duration-200 group-hover:block group-hover:opacity-100 dark:border-[#3A3A3A] dark:bg-[#111827] dark:text-[#E5E7EB]">
                          Password must be 6-8 characters, include letters and
                          numbers, and contain both upper and lower case
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
              </div>

              {/* Terms checkbox */}
              <label className="mt-[2.2vh] flex items-start gap-2.5 text-[0.6875rem] leading-snug text-gray-700 sm:text-[0.625rem] md:mt-[1.8vh] md:gap-2 md:text-[0.55rem] lg:mt-2.5 lg:gap-2.5 lg:text-[0.6875rem] xl:mt-2.6 xl:gap-2.5 xl:text-[0.6875rem] 2xl:text-[0.75rem] 2xl:mt-[2.2vh]">
                <input
                  type="checkbox"
                  required
                  checked={acceptedLegal}
                  onChange={(event) => setAcceptedLegal(event.target.checked)}
                  className="mt-0.2 size-3.5 rounded border-slate-300/50 text-[#393AF2] focus:ring-[#393AF2] md:mt-[0.2vh] xl:mt-[0.1vh] md:size-2.5 lg:size-3 xl:size-3 shrink-0  2xl:size-3 2xl:mt-[0.19vh]"
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setLegalTab("terms")}
                    className="font-medium text-[#393AF2]"
                  >
                    Terms & Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setLegalTab("privacy")}
                    className="font-medium text-[#393AF2]"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[2.2vh] h-[6.3vh] sm:h-11 md:h-10 lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh] w-full rounded-xl bg-[#393AF2] text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60  md:mt-[2.8vh]  md:rounded-xl md:text-xs lg:mt-2.5 lg:text-sm xl:text-[0.8rem] xl:mt-[3vh] 2xl:text-[0.85rem] 2xl:mt-[2.6vh]"
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>

              {/* Login link */}
              <div className="mt-[2.7vh] text-center text-xs text-gray-700 sm:text-[0.8125rem] md:mt-[1.8vh] md:text-[0.7rem] lg:mt-2.5 lg:text-xs xl:mt-3.5 xl:text-sm 2xl:text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-700 transition hover:text-[#2426C7]"
                >
                  Log In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <AuthPageRightPart />
    </div>
  );
}

export default Signup;
