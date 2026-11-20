import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import { exchangeGoogleOAuthCode, loginUser } from "../api/authApi.js";
import AuthShell from "../components/AuthShell.jsx";
import AuthMessageBanner from "../components/AuthMessageBanner";
import SignInwithGoogle from "../components/signinWithGoogle";
import {
  AuthDivider,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  CapsLockHint,
  PasswordToggle,
  authLinkClass,
} from "../components/AuthUI.jsx";
import useCapsLock from "../hooks/useCapsLock.js";
import { useUser } from "../../../context/useUserContext.jsx";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);

  const navigate = useNavigate();
  const safeTimeout = useSafeTimeout();
  const clearFormMessage = () => setFormMessage(null);
  const location = useLocation();
  const { fetchUserProfile } = useUser();
  const { capsLock, capsLockProps } = useCapsLock();

  const getReturnTo = () => {
    const from = location.state?.from;
    if (from) {
      if (typeof from === "string") return from !== "/login" ? from : "/";
      const full = `${from.pathname || "/"}${from.search || ""}${from.hash || ""}`;
      return full !== "/login" ? full : "/";
    }
    return "/";
  };

  const stripOAuthCodeFromUrl = () => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      for (const key of ["oauth_code", "oauth", "auth", "code", "success"]) {
        if (url.searchParams.has(key)) {
          const isSuccessKey =
            (key === "oauth" || key === "auth") &&
            url.searchParams.get(key) !== "success";
          if (isSuccessKey) continue;
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState(
          {},
          document.title,
          url.pathname + url.search + url.hash,
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let isActive = true;

    const completeGoogleLogin = async (oauthCode) => {
      clearFormMessage();
      setIsSubmitting(true);

      try {
        const response = await exchangeGoogleOAuthCode({ code: oauthCode });
        // Cookie-based session - no localStorage token. Backend sets HttpOnly cookies.
        stripOAuthCodeFromUrl();

        localStorage.setItem("isAuthenticated", "true");
        const profileLoaded = await fetchUserProfile({ force: true });

        if (!isActive) return;

        if (profileLoaded) {
          toast.success(response.data.message || "Logged in with Google");
          navigate(getReturnTo(), { replace: true });
        } else {
          localStorage.removeItem("isAuthenticated");
          setFormMessage({
            variant: "error",
            text: "Google login could not be verified. Please try again.",
          });
        }
      } catch (error) {
        if (!isActive) return;

        stripOAuthCodeFromUrl();
        localStorage.removeItem("isAuthenticated");
        setFormMessage({
          variant: "error",
          text:
            error.response?.data?.message ||
            "Google login failed. Please try again.",
        });
      } finally {
        if (isActive) setIsSubmitting(false);
      }
    };

    const params = new URLSearchParams(location.search);

    // Google callback failures now redirect here with a short code instead
    // of showing the user a raw JSON error page from the API.
    const oauthError = params.get("oauth_error");
    if (oauthError) {
      const OAUTH_ERROR_TEXT = {
        account_suspended: "Your account is suspended. Please contact support.",
        account_inactive: "Your account is inactive. Please contact support.",
        session_mismatch: "Google sign-in expired. Please try again.",
      };
      setFormMessage({
        variant: "error",
        text:
          OAUTH_ERROR_TEXT[oauthError] ||
          "Google sign-in failed. Please try again.",
      });
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_error");
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      } catch {
        // ignore
      }
      return () => {
        isActive = false;
      };
    }

    const oauthCode = params.get("oauth_code");
    if (oauthCode) {
      completeGoogleLogin(oauthCode);
      return () => {
        isActive = false;
      };
    }

    if (params.get("oauth") === "success" || params.get("auth") === "success") {
      stripOAuthCodeFromUrl();
      localStorage.setItem("isAuthenticated", "true");
      fetchUserProfile({ force: true }).then((profileLoaded) => {
        if (!isActive) return;

        if (profileLoaded) {
          toast.success("Logged in with Google");
          navigate(getReturnTo(), { replace: true });
        } else {
          localStorage.removeItem("isAuthenticated");
          setFormMessage({
            variant: "error",
            text: "Google login could not be verified. Please try again.",
          });
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [location.search, navigate, fetchUserProfile]);

  const handleLogin = async (e) => {
    e.preventDefault();
    clearFormMessage();
    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await loginUser({ email: cleanEmail, password });

      if (response.data.success) {
        // Cookie-based session - backend sets HttpOnly cookies, no token in storage
        toast.success(response.data.message || "Logged in successfully!");
        localStorage.setItem("isAuthenticated", "true");
        await fetchUserProfile({ force: true });
        // Honor return-to from ProtectedLayout
        navigate(getReturnTo(), { replace: true });
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
        const cleanEmail = email.trim().toLowerCase();
        safeTimeout(
          () =>
            navigate("/checkEmail", {
              state: { email: cleanEmail, from: location.state?.from },
            }),
          1500,
        );
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

  // Smart Error Parsing Logic
  const isError = formMessage?.variant === "error";
  const errorText = formMessage?.text?.toLowerCase() || "";
  
  // Highlight email if the error explicitly mentions 'email' or is a generic invalid error
  const hasEmailError = isError && (errorText.includes("email") || errorText.includes("invalid"));
  
  // Highlight password if the error explicitly mentions 'password' or is a generic invalid error
  const hasPasswordError = isError && (errorText.includes("password") || errorText.includes("invalid"));

  // Keep a pending return-to when hopping over to sign up.
  const authLinkState = location.state?.from ? { from: location.state.from } : undefined;

  return (
    <AuthShell>
      <form onSubmit={handleLogin} className="auth-stagger">
        <AuthHeading title="Welcome back" subtitle="Log in to your campus account to continue." />

        <SignInwithGoogle />

        <AuthDivider label="or continue with email" />

        {formMessage ? (
          <AuthMessageBanner variant={formMessage.variant} className="mb-4">
            {formMessage.text}
          </AuthMessageBanner>
        ) : null}

        <div className="space-y-3.5">
          <AuthField
            icon={Mail}
            label="Email"
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

          <div>
            <AuthField
              icon={LockKeyhole}
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              maxLength={72}
              error={hasPasswordError}
              {...capsLockProps}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFormMessage();
              }}
              trailing={
                <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              }
              required
            />
            <CapsLockHint show={capsLock} />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Link to="/forgot-password" className={`text-[0.8125rem] ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>

        <AuthPrimaryButton className="mt-5" loading={isSubmitting} loadingText="Signing in…">
          Sign in
        </AuthPrimaryButton>

        <p className="mt-5 text-center text-[0.875rem] text-slate-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" state={authLinkState} className={authLinkClass}>
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default Login;