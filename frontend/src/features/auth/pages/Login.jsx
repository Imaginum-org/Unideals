import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { getGoogleAuthUrl, loginUser } from "../api/authApi.js";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import { useUser } from "../../../context/useUserContext.jsx";
import cmlogo from "../../../assets/final_cm_logo.png";
import whitecmlogo from "../../../assets/white_cm_logo_mobile.png";
const CampusMartLogo = () => (
  <Link
    to="/"
    className="inline-flex items-center justify-center gap-2 md:gap-1.5 lg:gap-2 xl:gap-2 2xl:gap-2.5 font-poppins text-xl md:text-sm lg:text-sm xl:text-base 2xl:text-[1.7rem] font-semibold text-white md:text-[#012436] dark:md:text-white"
  >
    <img
      src={cmlogo}
      className="mb-1 size-5 hidden md:block  md:h-[1.0625rem] md:w-[0.8125rem] lg:h-[1.1875rem] lg:w-[0.9375rem] xl:h-[1.3125rem] xl:w-[1.0625rem] 2xl:h-[3vh] 2xl:w-[1.2vw]"
      alt="Campus Mart Logo"
    />
    <img
      src={whitecmlogo}
      className="block mb-1 size-5 md:hidden md:h-[1.0625rem] md:w-[0.8125rem] lg:h-[1.1875rem] lg:w-[0.9375rem] xl:h-[1.3125rem] xl:w-[1.0625rem] 2xl:h-[3vh] 2xl:w-[1.2vw]"
      alt="Campus Mart Logo"
    />
    <span>Campus Mart</span>
  </Link>
);

const GoogleIcon = () => (
  <svg
    className="size-4 shrink-0 lg:size-5"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
    />
  </svg>
);

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  const navigate = useNavigate();
  const clearFormMessage = () => setFormMessage(null);
  const location = useLocation();
  const { fetchUserProfile } = useUser();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("oauth") === "success" || params.get("auth") === "success") {
      localStorage.setItem("isAuthenticated", "true");
      setTimeout(async () => {
        await fetchUserProfile();
        navigate("/");
      }, 300);
    }
  }, [location.search, navigate, fetchUserProfile]);

  const handleLogin = async (e) => {
    e.preventDefault();
    clearFormMessage();
    setIsSubmitting(true);

    try {
      const response = await loginUser({ email, password });

      if (response.data.success) {
        toast.success(response.data.message || "Logged in successfully!");
        localStorage.setItem("isAuthenticated", "true");
        await fetchUserProfile();
        navigate("/");
      }
    } catch (error) {
      if (error.response?.data?.accountBlocked) {
        setFormMessage({
          variant: "error",
          text: error.response.data.message,
        });
        return;
      }
      if (error.response?.data?.requiresVerification) {
        setFormMessage({
          variant: "info",
          text: "Please verify your email first. Redirecting you to the verification page…",
        });
        setTimeout(() => navigate("/checkEmail", { state: { email } }), 1500);
        return;
      }
      setFormMessage({
        variant: "error",
        text:
          error.response?.data?.message ||
          "Invalid email or password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white font-poppins dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[36%] xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          {/* Logo — centered on mobile, and top left on desktop */}
         <div className="flex shrink-0 items-center justify-center pt-6 sm:pt-8 md:justify-start md:pt-0 md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <CampusMartLogo />
          </div>

          {/* Tagline strip shown only on mobile */}
          <div className="mb-5 flex shrink-0 flex-col items-center gap-3 pt-2 pb-1 sm:mb-8 md:hidden">
            <p className="text-center text-[0.6875rem] font-medium opacity-90 sm:text-[0.75rem]">
              The smarter way to trade today
            </p>
            <div className="flex gap-2" aria-hidden="true">
              <span className="h-0.5 w-7 rounded-full bg-white" />
              <span className="h-0.5 w-3 rounded-full bg-white/80" />
              <span className="h-0.5 w-3 rounded-full bg-white/80" />
            </div>
          </div>

          {/* Form card — slides up on mobile, centred on desktop */}
          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center md:px-8 lg:px-12 xl:px-16">
            <form
              onSubmit={handleLogin}
              className=" w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.5rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-8 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[40rem] lg:max-w-[44rem] xl:max-w-[26.5vw] 2xl:max-w-[52rem] 3xl:max-w-[56rem] md:p-0 md:shadow-none
"
            >
              {/* Heading */}
              <div className="mb-4 md:mb-3 lg:mb-4 xl:mb-[2.5vh]">
                <h1 className="font-figtree text-[1.25rem] font-semibold leading-snug tracking-normal sm:text-[1.125rem] md:text-[1.3rem] lg:text-lg xl:text-[1.45rem] ">
                  Welcome back
                </h1>
                <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.8125rem] lg:text-xs xl:text-[0.8rem]">
                  Login to your campus account to continue.
                </p>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex h-[6.3vh] sm:h-11 md:h-10 lg:h-10 xl:h-[6.4vh] 2xl:h-[6vh] md:text-xs lg:text-sm xl:text-[0.8rem] 2xl:text-xl md:rounded-xl w-full items-center justify-center gap-2 rounded-lg border border-slate-300/30 bg-white text-sm font-semibold text-gray-700 shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.05)] transition hover:border-slate-300 hover:bg-[#F9FAFB] dark:border-[#363A42] dark:bg-[#1A1D20] dark:text-white dark:hover:bg-[#20242A]"
              >
                <GoogleIcon />
                Google
              </button>

              {/* Divider */}
              <div className="my-[3vh] sm:my-4 md:my-3 lg:my-3 xl:my-[3vh] flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-300/30 dark:bg-[#3A3A3A]" />
                <span className="text-[0.5625rem] font-normal uppercase leading-tight tracking-[0.18em] text-gray-500 sm:text-[0.625rem] xl:text-[0.525rem] 2xl:text-base">
                  or continue with
                </span>
                <div className="h-px flex-1 bg-slate-300/30 dark:bg-[#3A3A3A]" />
              </div>

              {formMessage ? (
                <div className="mb-3 sm:mb-3.5 md:mb-2.5 lg:mb-2.5 xl:mb-2.5">
                  <AuthMessageBanner variant={formMessage.variant}>
                    {formMessage.text}
                  </AuthMessageBanner>
                </div>
              ) : null}

              {/* Fields */}
              <div className="space-y-[2.7vh] sm:space-y-3.5 md:space-y-3 lg:space-y-2.5 xl:space-y-[2.2vh]">
                {/* Email */}
                <label className="block">
                  <span className="relative block group">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        email
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                    >
                      Email
                    </span>
                    <input
                      className="h-[6.3vh] w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-3 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white dark:focus:bg-[#1A1D20] sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh]"
                      type="email"
                      value={email}
                      placeholder=" "
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
                    <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 sm:left-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        password
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                    >
                      Password
                    </span>
                    <input
                      className="h-[6.3vh] w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-10 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white dark:focus:bg-[#1A1D20] sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:pr-12 md:text-xs lg:h-10 xl:h-[6.4vh]"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearFormMessage();
                      }}
                      placeholder=" "
                      required
                    />
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
                </label>
              </div>

              {/* Forgot password */}
              <div className="mt-[2.2vh] flex justify-end xl:mt-[2.9vh]">
                <Link
                  to="/forgot-password"
                  className="text-[0.75rem] font-semibold text-[#393AF2] transition hover:text-[#2426C7] sm:text-xs md:text-[0.8125rem] lg:text-xs xl:text-[0.75rem]"
                >
                  Forgot password ?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[2.2vh] h-[6.3vh] w-full rounded-lg bg-[#393AF2] text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 md:mt-3 md:h-10 md:rounded-xl md:text-xs lg:mt-3 lg:h-10 lg:text-sm xl:mt-[2.9vh] xl:h-[6.4vh]"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>

              {/* Sign up link */}
              <p className="mt-[2.7vh] text-center text-xs text-gray-700 sm:text-[0.8125rem] md:mt-2 md:text-[0.8125rem] lg:mt-2.5 lg:text-xs xl:mt-3.5 xl:text-sm 2xl:text-2xl">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-700 transition hover:text-[#2426C7]"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <AuthPageRightPart />
    </div>
  );
}

export default Login;
