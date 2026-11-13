// Unideals AI chat themes: the wallpaper behind the assistant's messages and
// the small picker in its header (theme list + saved choice: utils/assistantThemes.js).
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { ASSISTANT_THEMES, DEFAULT_ASSISTANT_THEME, isAssistantTheme } from "../utils/assistantThemes.js";

/** The wallpaper layer. Place it behind the scrolling message list. */
export const AssistantWallpaper = ({ theme, className = "" }) => (
  <div aria-hidden="true" className={`ai-wall ai-wall-${isAssistantTheme(theme) ? theme : DEFAULT_ASSISTANT_THEME} ${className}`} />
);

/**
 * Header button + popover. `open`/`onOpenChange` are controlled so the panel's
 * Esc handler can close the popover before minimizing the assistant.
 */
export const AssistantThemePicker = ({ theme, onChange, open, onOpenChange, reducedMotion }) => {
  const rootRef = useRef(null);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          open
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        }`}
        aria-label="Chat theme"
        aria-expanded={open}
        aria-haspopup="true"
        title="Chat theme"
      >
        <Palette className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="group"
            aria-label="Chat theme"
            initial={reducedMotion ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[262px] rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_18px_44px_-16px_rgba(30,27,75,0.35)] dark:border-zinc-800 dark:bg-[#1A1C21]"
          >
            <p className="px-0.5 pb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Chat theme
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {ASSISTANT_THEMES.map(({ id, name }) => {
                const active = id === theme;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-1.5 rounded-xl p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span
                      className={`relative block h-[58px] w-full overflow-hidden rounded-[10px] bg-[#F8F9FC] ring-1 transition dark:bg-[#111215] ${
                        active
                          ? "ring-2 ring-indigo-500 dark:ring-indigo-400"
                          : "ring-slate-200 group-hover:ring-slate-300 dark:ring-zinc-700 dark:group-hover:ring-zinc-600"
                      }`}
                    >
                      <AssistantWallpaper theme={id} className="ai-wall-swatch" />
                      {/* two tiny bubbles, so the swatch reads as a chat */}
                      <span className="absolute bottom-1.5 right-1.5 h-1.5 w-4 rounded-full bg-indigo-500/80" />
                      <span className="absolute bottom-[14px] left-1.5 h-1.5 w-5 rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-zinc-700 dark:ring-zinc-600" />
                      {active && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold leading-none ${
                        active ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 dark:text-zinc-400"
                      }`}
                    >
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
