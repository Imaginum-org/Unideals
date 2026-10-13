// [SITE-LOCK] Part of the testing password gate — see SiteLockGate.jsx
// header for how to remove. The password is verified SERVER-SIDE
// (POST /api/site-gate/unlock) which issues a signed HttpOnly cookie — the
// value never ships in the bundle, and setting localStorage from the console
// alone does NOT unlock anything: every API call and the socket handshake
// re-verify the cookie, and a 403 SITE_LOCKED response re-locks the UI.
import { useState } from "react";
import instance from "../services/axiosInstance";
import Wordmark from "../components/ui/Wordmark.jsx";

const STORAGE_KEY = "unideals_site_unlocked";

export function isSiteUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "yes";
  } catch {
    return false;
  }
}

export function clearSiteUnlocked() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function SiteLock({ onUnlock }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    if (!value.trim()) {
      setError("Enter the testing password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await instance.post("/api/site-gate/unlock", {
        password: value,
      });
      if (res.data?.success) {
        try {
          localStorage.setItem(STORAGE_KEY, "yes");
        } catch {
          // private mode: unlock lasts for this tab only
        }
        onUnlock();
      } else {
        throw new Error("Unlock failed");
      }
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 401
          ? "Wrong password. Ask the team for the testing password."
          : status === 429
            ? "Too many attempts. Wait a few minutes and try again."
            : "Can't reach the server. Check your connection and retry.",
      );
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#FDF2F8] to-[#FFF7ED] px-4 dark:from-[#131313] dark:via-[#1c1216] dark:to-[#131313]">
      <div
        key={shake}
        className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_24px_60px_-24px_rgba(56,56,236,0.35)] ring-1 ring-black/5 motion-safe:animate-[sitelock-shake_0.3s_ease] dark:bg-[#1A1D20] dark:ring-white/10"
      >
        <div className="flex justify-center">
          <Wordmark
            fontSize={26}
            fontWeight={700}
            letterSpacing={0}
            className="text-[#000000] dark:text-white"
          />
        </div>
        <p className="mt-2 text-sm font-semibold text-[#3838EC]">
          Testing mode — enter password to continue
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          We&apos;re still building. Only people with the password can browse
          right now.
        </p>

        <form onSubmit={submit} className="mt-6">
          <input
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            placeholder="Testing password"
            autoFocus
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-[#F7F8FA] px-4 text-center text-base font-semibold tracking-wide text-zinc-900 outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:border-[#3838EC] focus:ring-4 focus:ring-[#3838EC]/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
          />
          {error && (
            <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 h-12 w-full rounded-xl bg-[#3838EC] text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#2f3fd6] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
      <style>{`@keyframes sitelock-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
