import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Link2Off, LockKeyhole, ShieldCheck } from "lucide-react";
import { resetPassword, verifyResetPasswordToken } from "../api/authApi.js";
import AuthShell from "../components/AuthShell.jsx";
import AuthMessageBanner from "../components/AuthMessageBanner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { isPasswordStrongEnough } from "../utils/passwordStrength";
import {
  AuthBackLink,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  AuthStatusIcon,
  FieldTick,
  PasswordToggle,
} from "../components/AuthUI.jsx";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

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
  const safeTimeout = useSafeTimeout();
  const { token } = useParams();
  const showPasswordOk = isPasswordStrongEnough(password);
  const showPasswordRequirements =
    password.length > 0 && !isPasswordStrongEnough(password);
  const clearFormMessage = () => setFormMessage(null);

  useEffect(() => {
    const verifyTokenOnLoad = async () => {
      try {
        const response = await verifyResetPasswordToken(token);

        if (response.data.success) {
          setIsTokenValid(true);
          // Keep the one-time token out of the address bar, browser history
          // and screenshots/screen-shares once it's been read. useParams
          // still holds it in memory for the submit (the router doesn't
          // re-render on a raw history.replaceState).
          window.history.replaceState(window.history.state, "", "/reset-password");
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
        safeTimeout(() => setIsSuccess(true), 1000);
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

  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;

  return (
    <AuthShell>
      {isValidating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BrandLoader size="lg" label="Verifying secure link…" />
        </div>
      ) : !isTokenValid ? (
        <div key="invalid" className="auth-stagger text-center">
          <AuthStatusIcon icon={Link2Off} tone="danger" />
          <AuthHeading
            align="center"
            title="This link has expired"
            subtitle="Reset links only work for a limited time and can be used once. Request a fresh one and you’ll be back in a minute."
          />
          {loadError ? (
            <AuthMessageBanner variant="error" className="mb-5 text-left">
              {loadError}
            </AuthMessageBanner>
          ) : null}
          <AuthPrimaryButton type="button" onClick={() => navigate("/forgot-password")}>
            Request a new link
          </AuthPrimaryButton>
          <div className="mt-8 flex justify-center">
            <AuthBackLink to="/login" />
          </div>
        </div>
      ) : !isSuccess ? (
        <form key="form" onSubmit={handleSubmit} className="auth-stagger">
          <AuthHeading
            title="Set a new password"
            subtitle="Your identity is verified. Choose a strong password you haven’t used elsewhere."
          />

          {formMessage ? (
            <AuthMessageBanner variant={formMessage.variant} className="mb-4">
              {formMessage.text}
            </AuthMessageBanner>
          ) : null}

          <div className="space-y-3.5">
            <div>
              <AuthField
                icon={LockKeyhole}
                label="New password"
                type={showPassword ? "text" : "password"}
                name="new-password"
                autoComplete="new-password"
                value={password}
                maxLength={72}
                error={hasPasswordError}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFormMessage();
                }}
                trailingWidth="lg"
                trailing={
                  <>
                    <FieldTick show={showPasswordOk} label="Strong enough" />
                    <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  </>
                }
                required
              />
              <PasswordStrengthMeter password={password} />
              {showPasswordRequirements ? (
                <p className="auth-pop mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-[0.75rem] font-medium leading-5 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20">
                  Use at least 8 characters with uppercase, lowercase, and a number. Add a symbol for
                  a stronger password.
                </p>
              ) : null}
            </div>

            <AuthField
              icon={LockKeyhole}
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              maxLength={72}
              error={hasConfirmError}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFormMessage();
              }}
              trailing={<FieldTick show={passwordsMatch} label="Passwords match" />}
              required
            />
          </div>

          <AuthPrimaryButton className="mt-5" loading={isSubmitting} loadingText="Updating…">
            Update password
          </AuthPrimaryButton>

          <div className="mt-8 flex justify-center">
            <AuthBackLink to="/login" />
          </div>
        </form>
      ) : (
        <div key="done" className="auth-stagger text-center">
          <AuthStatusIcon icon={ShieldCheck} tone="success" />
          <AuthHeading
            align="center"
            title="Password updated"
            subtitle="Your password has been changed. You can log in with your new password now."
          />
          <AuthPrimaryButton type="button" onClick={() => navigate("/login")}>
            Continue to log in
          </AuthPrimaryButton>
        </div>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
