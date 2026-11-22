import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MapPin, Star, X } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import { createPickupSpot, updatePickupSpot } from "../../../features/user/api/userApi.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Add / edit a pickup spot (Settings, and inline while listing an item).
 * Bottom sheet on phones, centred card from sm. Escape / overlay / X close
 * it; focus stays inside while open. Limits match the PickupSpot model.
 *
 * onSave(formData) (optional): the caller saves (and toasts) itself; throw
 * to keep the dialog open. Without it, the dialog calls the API directly.
 */

const NAME_MAX = 80;
const DETAIL_MAX = 180;
const EMPTY = { name: "", detail: "", isPrimary: false };

const fieldCls = (invalid) =>
  cn(
    "h-11 w-full rounded-xl border bg-white px-3.5 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-[#131416] dark:text-white dark:placeholder:text-zinc-500",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
      : "border-neutral-200 focus:border-[var(--accent)] focus:ring-[var(--accent-soft)] dark:border-neutral-700",
  );

function Field({ id, label, hint, error, count, max, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
          {label}
        </label>
        <span className={cn("text-[11.5px] tabular-nums", count > max - 10 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-zinc-500")}>
          {count}/{max}
        </span>
      </div>
      {children}
      <p
        id={`${id}-help`}
        role={error ? "alert" : undefined}
        className={cn("mt-1.5 text-[12px]", error ? "font-medium text-red-600 dark:text-red-400" : "text-slate-500 dark:text-zinc-400")}
      >
        {error || hint}
      </p>
    </div>
  );
}

const PickupSpotModal = ({ isOpen, onClose, onSave, initialData, pickupSpotId, mode = "create" }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  // Fresh form each time it opens (edit: the spot's values). Keyed on
  // opening only: callers pass a new initialData object every render, and
  // a re-render mid-typing must not wipe the form.
  const initialRef = useRef(initialData);
  initialRef.current = initialData;
  useEffect(() => {
    if (!isOpen) return;
    const init = initialRef.current || {};
    setForm({ name: init.name || "", detail: init.detail || "", isPrimary: Boolean(init.isPrimary) });
    setErrors({});
  }, [isOpen]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Give this spot a short name";
    if (!form.detail.trim()) next.detail = "Add a detail so the buyer can find you";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) {
      (form.name.trim() ? document.getElementById("pickup-spot-detail") : nameRef.current)?.focus();
      return;
    }
    const payload = { ...form, name: form.name.trim(), detail: form.detail.trim() };
    setSubmitting(true);
    try {
      if (onSave) {
        await onSave(payload);
      } else {
        const res = mode === "create" ? await createPickupSpot(payload) : await updatePickupSpot(pickupSpotId, payload);
        if (!res?.data?.success) throw new Error(res?.data?.message || "Failed to save pickup spot");
        toast.success(res.data.message || `Pickup spot ${mode === "create" ? "added" : "updated"}`);
      }
      onClose?.();
    } catch (err) {
      // onSave toasts its own errors; only report direct API failures here.
      if (!onSave) toast.error(err?.response?.data?.message || err?.message || "Failed to save pickup spot");
    } finally {
      setSubmitting(false);
    }
  };

  const editing = mode !== "create";

  return (
    <Dialog.Root open={Boolean(isOpen)} onOpenChange={(open) => !open && !submitting && onClose?.()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            nameRef.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "fixed z-[1000] w-full border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-[#1A1D20]",
            "inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6",
          )}
        >
          {/* grab handle (phones) */}
          <span aria-hidden="true" className="mx-auto -mt-1 mb-3 block h-1 w-10 rounded-full bg-neutral-200 sm:hidden dark:bg-neutral-700" />

          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <MapPin className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] font-semibold leading-snug text-slate-900 dark:text-white">
                {editing ? "Edit pickup spot" : "Add a pickup spot"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-zinc-400">
                Where buyers meet you to collect items. Pick a busy, public place on campus.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                disabled={submitting}
                className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-neutral-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <Field id="pickup-spot-name" label="Spot name" hint="e.g. Central Library, Hostel 4 gate" error={errors.name} count={form.name.length} max={NAME_MAX}>
              <input
                ref={nameRef}
                id="pickup-spot-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX}
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                aria-describedby="pickup-spot-name-help"
                placeholder="Spot name"
                className={fieldCls(errors.name)}
              />
            </Field>

            <Field id="pickup-spot-detail" label="How to find you" hint="e.g. Ground floor, near the main entrance" error={errors.detail} count={form.detail.length} max={DETAIL_MAX}>
              <input
                id="pickup-spot-detail"
                value={form.detail}
                onChange={(e) => set("detail", e.target.value.slice(0, DETAIL_MAX))}
                maxLength={DETAIL_MAX}
                autoComplete="off"
                aria-invalid={Boolean(errors.detail)}
                aria-describedby="pickup-spot-detail-help"
                placeholder="Short detail"
                className={fieldCls(errors.detail)}
              />
            </Field>

            <label
              htmlFor="pickup-spot-primary"
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                form.isPrimary
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-white/[0.03]",
              )}
            >
              <input
                id="pickup-spot-primary"
                type="checkbox"
                checked={Boolean(form.isPrimary)}
                onChange={(e) => set("isPrimary", e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800 dark:text-zinc-100">
                  <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> Make this my main spot
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500 dark:text-zinc-400">
                  Filled in automatically on new listings and pickups.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ButtonLoader loading={submitting} loadingText="Saving…">
                  {editing ? "Save changes" : "Add spot"}
                </ButtonLoader>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PickupSpotModal;
