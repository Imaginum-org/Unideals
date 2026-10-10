import React from "react";

/**
 * Toast store + API (no UI imports here on purpose: pages that only fire
 * toasts stay light, and react-refresh keeps working).
 *
 * API:
 *   toast.success("Saved") / toast.error("Failed") / toast("Heads up")
 *   Options: { id } (same id replaces the live toast), { duration }.
 *   toast.dismiss(id?) clears one toast, or all when id is omitted.
 */

export const DEFAULT_DURATIONS = { success: 4000, error: 5200, info: 4200 };
export const MAX_TOASTS = 5;

let toastSeq = 0;
let toastState = [];
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(toastState));

function pushToast(type, message, opts = {}) {
  const id = opts?.id || `unideals-toast-${Date.now()}-${++toastSeq}`;
  const duration = opts?.duration ?? DEFAULT_DURATIONS[type] ?? 4200;
  const text = typeof message === "string" ? message : String(message ?? "");
  toastState = [
    ...toastState.filter((t) => t.id !== id),
    { id, type, message: text, duration },
  ].slice(-MAX_TOASTS);
  emit();
  return id;
}

function dismissToast(id) {
  toastState = id ? toastState.filter((t) => t.id !== id) : [];
  emit();
}

export { dismissToast };

export function toast(message, opts) {
  return pushToast("info", message, opts);
}
toast.success = (message, opts) => pushToast("success", message, opts);
toast.error = (message, opts) => pushToast("error", message, opts);
toast.dismiss = dismissToast;

export function useToasts() {
  return React.useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => toastState,
  );
}
