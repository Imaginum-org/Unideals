import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { toast } from "../../../components/ui/toast.js";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";

import { deleteAccount } from "../../../features/user/api/userApi.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { clearAccountScopedStorage } from "../../../context/useUserContext.jsx";
import { btnDanger, btnSecondary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Settings → Account → Delete account. Same dialog language as the rest of
 * the site (ConfirmDialog / report dialog): bottom sheet on phones, centred
 * card from sm up, light and dark. Needs the account password; the dialog
 * stays open on a wrong password so the user can retry.
 */

const LOSES = ["Your profile, photo and pickup spots", "All your listings and drafts", "Chats, deals and reviews"];

function AlertDialogDemo() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");

  const onOpenChange = (next) => {
    if (loading) return;
    setOpen(next);
    if (!next) {
      setPassword("");
      setShowPassword(false);
      setError("");
    }
  };

  const handleDeleteAccount = async (e) => {
    e?.preventDefault();
    if (loading) return;
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await deleteAccount({ password });

      if (response.data.success) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("cachedUserDetails");
        localStorage.removeItem("accessToken");
        clearAccountScopedStorage();
        toast.success("Your account has been permanently deleted.");
        setOpen(false);
        navigate("/signup");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't delete your account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger asChild>
        <button type="button" className={btnDanger}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
        <AlertDialog.Content
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          className={cn(
            "fixed z-[1000] w-full border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-[#1A1D20]",
            // Phones: bottom sheet. sm+: centred card.
            "inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6",
          )}
        >
          <form onSubmit={handleDeleteAccount} noValidate>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <AlertDialog.Title className="text-[17px] font-semibold text-slate-900 dark:text-white">
                  Delete your account?
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-1 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
                  This is permanent and can&apos;t be undone.
                </AlertDialog.Description>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 rounded-xl border border-red-100 bg-red-50/50 px-3.5 py-3 text-[13px] text-slate-700 dark:border-red-900/30 dark:bg-red-950/10 dark:text-zinc-300">
              {LOSES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-red-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <label htmlFor="delete-account-password" className="mt-4 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
              Confirm with your password
            </label>
            <div className="relative mt-1.5">
              <input
                id="delete-account-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Your password"
                autoComplete="current-password"
                aria-invalid={Boolean(error) || undefined}
                aria-describedby="delete-account-help"
                className={cn(
                  "h-11 w-full rounded-lg border bg-white pl-3 pr-11 text-[16px] text-slate-900 outline-none transition-shadow placeholder:text-slate-400 sm:text-[14px]",
                  "focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:bg-[#131313] dark:text-white dark:placeholder:text-zinc-500 dark:focus:ring-red-950/50",
                  error ? "border-red-300 dark:border-red-800" : "border-neutral-200 dark:border-neutral-700",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p id="delete-account-help" className="mt-1.5 text-[12px] leading-snug">
              {error ? (
                <span className="font-medium text-red-600 dark:text-red-400">{error}</span>
              ) : (
                <span className="text-slate-500 dark:text-zinc-400">
                  Signed up with Google?{" "}
                  <Link to="/settings?tab=security" onClick={() => setOpen(false)} className="font-semibold text-[var(--accent-text)] hover:underline">
                    Set a password
                  </Link>{" "}
                  first.
                </span>
              )}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <AlertDialog.Cancel asChild>
                <button type="button" disabled={loading} className={cn(btnSecondary, "h-11")}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-3 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
              >
                <ButtonLoader loading={loading} loadingText="Deleting…">
                  Delete account
                </ButtonLoader>
              </button>
            </div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export default AlertDialogDemo;
