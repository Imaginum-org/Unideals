import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { loginUser } from "../api/authApi.js";
import AuthPageRightPart from "../components/AuthPageRightPart";
import AuthMessageBanner from "../components/AuthMessageBanner";
import AuthMobileBanner from "../components/AuthMobileBanner";
import AuthBrandLogo from "../components/AuthBrandLogo";
import SignInwithGoogle from "../components/signinWithGoogle";
import { useUser } from "../../../context/useUserContext.jsx";

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

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden select-none bg-white dark:bg-[#131313] md:h-[100dvh] md:overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-white font-poppins dark:bg-[#131313] md:h-full md:min-h-0 md:w-[44%] lg:w-[41%] xl:w-[41%] 2xl:w-[41%]">
        <div className="relative flex min-h-[100dvh] flex-col bg-gradient-to-br from-[#2f35f4] to-[#7472f5] text-white md:h-full md:min-h-0 md:bg-none md:bg-white dark:md:bg-[#131313] md:text-[#111827]">
          {/* Logo — centered on mobile, and top left on desktop */}
          <div className="flex shrink-0 items-center justify-center mt-[3.5vh] sm:mt-[4vh] md:justify-start md:mt-2 md:pl-4 xl:mt-4 xl:pl-7">
            <AuthBrandLogo />
          </div>

          <AuthMobileBanner />

          {/* Form card — slides up on mobile, centred on desktop */}
          <div className="flex min-h-0 flex-1 items-end justify-center md:items-center">
            <form
              onSubmit={handleLogin}
              className=" w-full h-[80dvh] md:h-auto overflow-y-auto overflow-x-hidden rounded-t-[1.6rem] bg-white px-5 pb-8 pt-8 text-[#18181B] shadow-[0_-1.125rem_3.125rem_rgba(30,35,120,0.18)] dark:bg-[#131313] dark:text-white sm:px-10 md:mt-0 md:max-h-[calc(100dvh-5rem)] md:min-h-0 md:flex-none md:rounded-none md:overflow-y-auto md:overflow-x-hidden md:w-full md:max-w-[35vw] lg:max-w-[30vw] xl:max-w-[28.5vw] 2xl:max-w-[28.5vw] md:px-[1vw] 3xl:max-w-[56rem] md:py-0 md:shadow-none
"
            >
              {/* Heading */}
              <div className="mb-4 md:mb-[2vh] lg:mb-4 xl:mb-[2.5vh] 2xl:mb-[2.6vh]">
                <h1 className="font-figtree text-[1.25rem] font-semibold leading-snug tracking-normal sm:text-[1.125rem] md:text-[1.15rem] lg:text-lg xl:text-[1.45rem] 2xl:text-[1.5rem]">
                  Welcome Back
                </h1>
                <p className="mt-1 font-figtree text-[0.75rem] leading-snug text-gray-700 dark:text-[#D6D6D6] sm:text-[0.8125rem] md:text-[0.72rem] lg:text-xs xl:text-[0.8rem] 2xl:text-[0.85rem]">
                  Login to your campus account to continue.
                </p>
              </div>

              {/* Google button */}
              <SignInwithGoogle />

              {/* Divider */}
              <div className="my-[3vh] sm:my-4 md:my-[2.8vh] lg:my-3 xl:my-[3vh] 2xl:my-[3vh] flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-300/30 dark:bg-[#3A3A3A]" />
                <span className="text-[0.5625rem] font-normal uppercase leading-tight tracking-[0.18em] text-gray-500 sm:text-[0.49rem] xl:text-[0.525rem] 2xl:text-[0.6rem]">
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
              <div className="space-y-[2.7vh] sm:space-y-3.5 md:space-y-[2.1vh]  lg:space-y-2.5 xl:space-y-[2.2vh] 2xl:space-y-[2.3vh]">
                {/* Email */}
                <label className="block">
                  <span className="relative block group">
                    <Mail className="absolute left-3 top-1/2 size-4 md:size-3.5 xl:size-4 2xl:size-4 -translate-y-1/2 text-gray-500 sm:left-4 xl:left-4 2xl:left-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        email
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                    >
                      Email
                    </span>
                    <input
                      className="h-[6.3vh] w-full rounded-xl border border-transparent bg-slate-50 pl-10 pr-3 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white dark:focus:bg-[#1A1D20] sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh]"
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
                    <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 md:size-3.5 xl:size-4 2xl:size-4 sm:left-4 xl:left-4 2xl:left-4" />
                    <span
                      className={`pointer-events-none absolute left-10 sm:left-11 px-1 transition-all duration-200 ${
                        password
                          ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
                          : "top-1/2 -translate-y-1/2 text-[0.75rem] md:text-[0.7rem] xl:text-[0.75rem] text-gray-500/80"
                      } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
                    >
                      Password
                    </span>
                    <input
                      className="h-[6.3vh] w-full rounded-xl border border-transparent bg-slate-50 pl-10 pr-10 text-[0.6875rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white dark:focus:bg-[#1A1D20] sm:h-11 md:h-10 md:rounded-xl md:pl-11 md:pr-12 md:text-xs lg:h-10 xl:h-[6.4vh] 2xl:h-[6.4vh]"
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
              <div className="mt-[2.2vh] flex justify-end xl:mt-[2.9vh] 2xl:mt-[2.5vh]">
                <Link
                  to="/forgot-password"
                  className="text-[0.75rem] font-semibold text-[#393AF2] transition hover:text-[#2426C7] sm:text-xs md:text-[0.72rem] lg:text-xs xl:text-[0.75rem] 2xl:text-[0.759rem] "
                >
                  Forgot password ?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-[2.2vh] h-[6.3vh] w-full rounded-xl bg-[#393AF2] text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#393AF2]/25 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 md:mt-3 md:h-10 md:rounded-xl md:text-xs lg:mt-3 lg:h-10 lg:text-sm xl:mt-[2.9vh] xl:h-[6.4vh] 2xl:h-[6.4vh 2xl:mt-[2.6vh]"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>

              {/* Sign up link */}
              <p className="mt-[2.7vh] text-center text-xs text-gray-700 sm:text-[0.8125rem] md:mt-[1.8vh] md:text-[0.7rem] lg:mt-2.5 lg:text-xs xl:mt-3.5 xl:text-sm 2xl:text-sm">
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
