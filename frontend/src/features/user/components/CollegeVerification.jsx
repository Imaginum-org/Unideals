import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { TickIcon } from "../../../components/common/VerifiedTick.jsx";
import { Panel, btnPrimary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";
import { getCollegeVerification, sendCollegeOtp, verifyCollegeOtp } from "../api/userApi.js";

/*
 * Settings → Verification → College email.
 * Step 1: enter the college address, we email a 6-digit code.
 * Step 2: type the code (six boxes; paste and SMS/email autofill work).
 * Done: the verified tick is on, shown with the masked address.
 */

const LEN = 6;
const INPUT =
  "h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[14px] text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white dark:placeholder:text-zinc-500";

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

function useCountdown(until) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until || until <= Date.now()) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

function CodeInput({ value, onChange, onComplete, disabled, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: LEN }, (_, i) => value[i] || "");

  const setAt = (i, d) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).replace(/\D/g, "").slice(0, LEN);
    onChange(next);
    return next;
  };

  const fill = (raw, from = 0) => {
    const clean = raw.replace(/\D/g, "").slice(0, LEN - from);
    if (!clean) return;
    const next = (value.slice(0, from) + clean).slice(0, LEN);
    onChange(next);
    refs.current[Math.min(next.length, LEN - 1)]?.focus();
    if (next.length === LEN) onComplete(next);
  };

  return (
    <div className="flex w-full max-w-[340px] gap-1.5 min-[360px]:gap-2" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? LEN : 1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => {
            e.preventDefault();
            fill(e.clipboardData.getData("text"), 0);
          }}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) return fill(v, i);
            const next = setAt(i, v);
            if (v && i < LEN - 1) refs.current[i + 1]?.focus();
            if (next.length === LEN) onComplete(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) {
              e.preventDefault();
              setAt(i - 1, "");
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
          }}
          className={cn(
            "h-12 min-w-0 flex-1 rounded-xl border bg-white text-center text-[20px] font-semibold tabular-nums text-slate-900 outline-none transition-[border-color,box-shadow]",
            "focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] disabled:opacity-60",
            "dark:bg-[#131313] dark:text-white",
            invalid ? "border-red-300 dark:border-red-800" : "border-neutral-200 dark:border-neutral-700",
          )}
        />
      ))}
    </div>
  );
}

export default function CollegeVerification({ onVerified }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const wait = useCountdown(resendAt);
  const emailRef = useRef(null);
  // Official domains for the user's campus (VIT Vellore: vit.ac.in).
  const allowed = status?.allowedDomains || [];
  const allowedLabel = allowed.map((d) => `@${d}`).join(" or ");

  useEffect(() => {
    let cancelled = false;
    getCollegeVerification()
      .then((res) => {
        if (cancelled) return;
        const s = res.data?.data || null;
        setStatus(s);
        // A code sent in the last 10 minutes: go straight back to step 2.
        if (s && !s.verified && s.pendingEmail) {
          setSentTo(s.pendingEmail);
          setEmail(s.pendingEmail);
          setResendAt(s.resendAt ? new Date(s.resendAt).getTime() : 0);
          setStep("code");
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (e) => {
    e?.preventDefault?.();
    const target = (step === "code" ? sentTo : email).trim();
    if (!target) {
      setError("Enter your college email.");
      emailRef.current?.focus();
      return;
    }
    const domain = target.toLowerCase().split("@")[1] || "";
    if (allowed.length && domain && !allowed.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      setError(`Use your college email ending in ${allowedLabel}.`);
      emailRef.current?.focus();
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await sendCollegeOtp(target);
      const d = res.data?.data || {};
      setSentTo(d.email || target);
      setResendAt(d.resendAt ? new Date(d.resendAt).getTime() : Date.now() + 60000);
      setCode("");
      setStep("code");
      toast.success(res.data?.message || "Code sent");
    } catch (err) {
      setError(errMsg(err, "Could not send the code. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const verify = useCallback(
    async (value) => {
      const c = (value ?? code).replace(/\D/g, "");
      if (c.length !== LEN || verifying) return;
      setVerifying(true);
      setError("");
      try {
        const res = await verifyCollegeOtp(c);
        const d = res.data?.data || {};
        setStatus({ verified: true, email: d.email, verifiedAt: d.verifiedAt });
        setStep("email");
        toast.success("You're verified. Your verified tick is live.");
        onVerified?.();
      } catch (err) {
        setError(errMsg(err, "That code didn't work. Please try again."));
        setCode("");
      } finally {
        setVerifying(false);
      }
    },
    [code, verifying, onVerified],
  );

  if (loading) {
    return (
      <Panel>
        <div className="browse-shimmer h-[88px] rounded-xl bg-neutral-100 dark:bg-white/5" aria-hidden="true" />
      </Panel>
    );
  }

  if (status?.verified) {
    const since = status.verifiedAt
      ? new Date(status.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : null;
    return (
      <Panel>
        <div className="flex items-start gap-3.5">
          <TickIcon verified className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 dark:text-white">You&apos;re a verified student</p>
            <p className="mt-0.5 break-all text-[13px] text-slate-500 dark:text-zinc-400">
              {status.email}
              {since ? ` · since ${since}` : ""}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
              Everyone sees the verified tick next to your name on your listings, chats and profile. Your college address stays private.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  // Campus without a student email domain set up yet (only VIT for now).
  if (status && status.available === false) {
    return (
      <Panel>
        <div className="flex items-start gap-3.5">
          <TickIcon verified={false} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Coming soon to your campus</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-zinc-400">
              College email verification isn&apos;t available for your campus yet. We&apos;ll let you know when you can get the verified tick.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      {step === "email" ? (
        <form onSubmit={send} noValidate className="flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <TickIcon verified={false} className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Verify your college email</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-zinc-400">
                Buyers trust verified students more, so your items sell faster. You&apos;ll keep signing in with your usual email.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="college-email" className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-zinc-300">
              College email
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="college-email"
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={`name@${allowed[0] || "college.ac.in"}`}
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby="college-email-help"
                  className={cn(INPUT, "pl-9", error && "border-red-300 dark:border-red-800")}
                />
              </div>
              <button type="submit" disabled={sending} className={cn(btnPrimary, "h-11 w-full sm:w-auto")}>
                <ButtonLoader loading={sending} loadingText="Sending…">
                  Send code
                </ButtonLoader>
              </button>
            </div>
            <p id="college-email-help" className={cn("mt-1.5 text-[12px]", error ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-zinc-500")} role={error ? "alert" : undefined}>
              {error ||
                (allowed.length
                  ? `Must end in ${allowedLabel}. We only use it to send this code.`
                  : "The address your college gave you. We only use it to send this code.")}
            </p>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
              setCode("");
            }}
            className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Use a different email
          </button>
          <div>
            <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Enter the 6-digit code</p>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">
              Sent to <span className="break-all font-medium text-slate-700 dark:text-zinc-200">{sentTo}</span>. It expires in 10 minutes. Check spam if you don&apos;t see it.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
            className="flex flex-col gap-3"
          >
            <CodeInput value={code} onChange={(v) => { setCode(v); if (error) setError(""); }} onComplete={verify} disabled={verifying} invalid={Boolean(error)} />
            {error && (
              <p className="text-[12.5px] text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
              <button type="submit" disabled={verifying || code.length !== LEN} className={cn(btnPrimary, "h-11 w-full sm:w-auto")}>
                <ButtonLoader loading={verifying} loadingText="Verifying…">
                  Verify
                </ButtonLoader>
              </button>
              <p className="text-center text-[12.5px] text-slate-500 sm:text-left dark:text-zinc-400">
                Didn&apos;t get it?{" "}
                {wait > 0 ? (
                  <span className="tabular-nums">Resend in {wait}s</span>
                ) : (
                  <button type="button" onClick={send} disabled={sending} className="font-semibold text-[var(--accent-text)] hover:underline disabled:opacity-50">
                    {sending ? "Sending…" : "Resend code"}
                  </button>
                )}
              </p>
            </div>
          </form>
        </div>
      )}
    </Panel>
  );
}
