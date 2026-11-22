/* eslint-disable react/prop-types */
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "../../../components/ui/toast.js";
import { AlertTriangle, Lock, Shield, X } from "lucide-react";

import { forgotPassword } from "../../../features/auth/api/authApi.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { Panel, btnPrimary, btnSecondary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Settings → Security.
 * passwordSet === false: a Google sign-up that never set a password. They
 * can't sign in with email + password or confirm account deletion until
 * they set one, so the row says so and offers "Set password".
 * true or unknown (older accounts): the usual "Change".
 * Both send the emailed reset link; the backend marks the password as set
 * once the link is used.
 */
export default function SecuritySettings({ email, passwordSet }) {
  const noPassword = passwordSet === false;
  const [resetEmail, setResetEmail] = useState(email || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleOpenChange = (open) => {
    setIsDialogOpen(open);
    if (open) setResetEmail(email || "");
  };

  const handleSendResetLink = async (event) => {
    event.preventDefault();

    if (!resetEmail) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      setIsSendingReset(true);
      const response = await forgotPassword({ email: resetEmail });

      if (response.data.success) {
        toast.success(noPassword ? "Link sent. Open it to set your password." : "Password reset link sent.");
        setIsDialogOpen(false);
      } else {
        toast.error(response.data.message || "Unable to send the link.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send the link.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Panel title="Sign-in & security" padded={false}>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {/* Password */}
        <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                noPassword
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400",
              )}
            >
              {noPassword ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-white">
                Password
                {noPassword && (
                  <span className="rounded-full bg-amber-50 px-2 py-px text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                    Not set
                  </span>
                )}
              </p>
              {noPassword ? (
                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-400">
                  You signed up with Google, so there&apos;s no password on this account yet. Set one to also sign in with
                  your email, and to confirm account deletion.
                </p>
              ) : (
                <p className="mt-1 text-[15px] leading-none tracking-[4px] text-slate-400 dark:text-zinc-500" aria-label="Password set">
                  ••••••••••
                </p>
              )}
            </div>
          </div>

          <Dialog.Root open={isDialogOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
              <button type="button" className={cn(noPassword ? btnPrimary : btnSecondary, "self-start sm:self-auto")}>
                {noPassword ? "Set password" : "Change"}
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
              <Dialog.Content
                className={cn(
                  "fixed z-[1000] w-full border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-[#1A1D20]",
                  "inset-x-0 bottom-0 rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
                  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Dialog.Title className="text-[17px] font-semibold text-slate-900 dark:text-white">
                      {noPassword ? "Set a password" : "Change password"}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
                      {noPassword
                        ? "We'll email you a link. Open it to choose your password."
                        : "We'll email you a link to choose a new password."}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                      <X className="h-[18px] w-[18px]" />
                    </button>
                  </Dialog.Close>
                </div>

                <form className="mt-4" onSubmit={handleSendResetLink}>
                  <label htmlFor="reset-email" className="mb-1.5 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Your email address"
                    className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[16px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] sm:text-[14px] dark:border-neutral-700 dark:bg-[#131313] dark:text-white"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                  />

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <Dialog.Close asChild>
                      <button type="button" className={cn(btnSecondary, "h-11")}>
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button type="submit" disabled={isSendingReset} className={cn(btnPrimary, "h-11")}>
                      <ButtonLoader loading={isSendingReset} loadingText="Sending…">
                        Send link
                      </ButtonLoader>
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </li>

        {/* Two-factor (unchanged copy) */}
        <li className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Two-factor authentication</p>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Extra layer of security</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            Enabled
          </span>
        </li>
      </ul>
    </Panel>
  );
}
