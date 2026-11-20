import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { registerUser } from "../api/authApi.js";
import { toast } from "../../../components/ui/toast.js";
import AuthShell from "../components/AuthShell.jsx";
import AuthMessageBanner from "../components/AuthMessageBanner";
import LegalAgreementModal from "../components/LegalAgreementModal";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import SignInwithGoogle from "../components/signinWithGoogle";
import {
  AuthCheckbox,
  AuthDivider,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  CapsLockHint,
  FieldTick,
  PasswordToggle,
  authLinkClass,
} from "../components/AuthUI.jsx";
import useCapsLock from "../hooks/useCapsLock.js";
import {
  isPasswordStrongEnough,
  suggestPassword,
} from "../utils/passwordStrength.js";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fname, setFname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState(null);
  const [legalTab, setLegalTab] = useState(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [legalMeta, setLegalMeta] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const safeTimeout = useSafeTimeout();
  const showPasswordOk = isPasswordStrongEnough(password);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
  const { capsLock, capsLockProps } = useCapsLock();

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

    if (password !== confirmPassword) {
      setFormMessage({
        variant: "error",
        text: "Passwords do not match. Please re-enter the same password.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fname.trim();
      const response = await registerUser({
        name: cleanName,
        email: cleanEmail,
        password,
        // Additive legal consent metadata (backend ignores unknown fields).
        acceptedLegal,
        legalVersion: legalMeta?.version || "v1.0",
        legalAcceptedAt: legalMeta?.acceptedAt || new Date().toISOString(),
      });

      if (response.data.success) {
        setFormMessage({
          variant: "success",
          text:
            response.data.message ||
            "Account created successfully! Check your email to verify your account.",
        });
        const returnTo = location.state?.from;
        safeTimeout(() => {
          navigate("/checkEmail", {
            state: { email: cleanEmail, from: returnTo },
          });
        }, 1400);
      }
    } catch (error) {
      // Never log the axios error object: its config carries the request body (password).
      console.error("Signup failed:", error?.response?.status, error?.response?.data?.message || error?.message);
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
    (errorText.includes("password") ||
      errorText.includes("requirements") ||
      errorText.includes("match"));

  // Highlight confirm field specifically when passwords don't match
  const hasConfirmError =
    isError && (errorText.includes("match") || errorText.includes("password"));

  // Keep a pending return-to when hopping back to log in.
  const authLinkState = location.state?.from ? { from: location.state.from } : undefined;

  return (
    <>
      {legalTab ? (
        <LegalAgreementModal
          activeTab={legalTab}
          onTabChange={setLegalTab}
          onClose={() => setLegalTab(null)}
          onAccept={() => {
            setAcceptedLegal(true);
            setLegalMeta({
              version: "v1.0",
              acceptedAt: new Date().toISOString(),
            });
            setLegalTab(null);
          }}
        />
      ) : null}

      <AuthShell>
        <form onSubmit={handleRegister} className="auth-stagger">
          <AuthHeading
            title="Create your account"
            subtitle="Enter your details to start your academic journey."
          />

          <SignInwithGoogle />

          <AuthDivider label="or register with email" />

          {formMessage ? (
            <AuthMessageBanner variant={formMessage.variant} className="mb-4">
              {formMessage.text}
            </AuthMessageBanner>
          ) : null}

          <div className="space-y-3.5">
            <AuthField
              icon={UserRound}
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              value={fname}
              maxLength={60}
              error={hasNameError}
              onChange={(e) => {
                setFname(e.target.value);
                clearFormMessage();
              }}
              required
            />

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
                name="new-password"
                autoComplete="new-password"
                value={password}
                maxLength={72}
                error={hasPasswordError}
                {...capsLockProps}
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
              <CapsLockHint show={capsLock} />
              <PasswordStrengthMeter
                password={password}
                onSuggest={() => {
                  const fresh = suggestPassword(fname, email);
                  setPassword(fresh);
                  setConfirmPassword(fresh);
                  clearFormMessage();
                  toast.success("Strong password filled. Save it somewhere safe.", {
                    id: "suggest-password",
                  });
                }}
              />
            </div>

            <AuthField
              icon={LockKeyhole}
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              name="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              maxLength={72}
              error={hasConfirmError}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFormMessage();
              }}
              trailingWidth="lg"
              trailing={
                <>
                  <FieldTick show={passwordsMatch} label="Passwords match" />
                  <PasswordToggle
                    shown={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((v) => !v)}
                  />
                </>
              }
              required
            />
          </div>

          <div className="mt-4">
            <AuthCheckbox
              required
              checked={acceptedLegal}
              onChange={(event) => {
                const checked = event.target.checked;
                setAcceptedLegal(checked);
                if (checked && !legalMeta) {
                  setLegalMeta({
                    version: "v1.0",
                    acceptedAt: new Date().toISOString(),
                  });
                }
              }}
            >
              I agree to the{" "}
              <button type="button" onClick={() => setLegalTab("terms")} className={authLinkClass}>
                Terms &amp; Conditions
              </button>{" "}
              and{" "}
              <button type="button" onClick={() => setLegalTab("privacy")} className={authLinkClass}>
                Privacy Policy
              </button>
              .
            </AuthCheckbox>
          </div>

          <AuthPrimaryButton className="mt-5" loading={isSubmitting} loadingText="Creating account…">
            Create account
          </AuthPrimaryButton>

          <p className="mt-5 text-center text-[0.875rem] text-slate-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" state={authLinkState} className={authLinkClass}>
              Log in
            </Link>
          </p>
        </form>
      </AuthShell>
    </>
  );
}

export default Signup;
