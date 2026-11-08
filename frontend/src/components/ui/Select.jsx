import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn.js";

/**
 * Select — the app's one dropdown (replaces native <select>).
 *
 * Same look as the profile menu: `.dd-panel` + `.dd-item` (index.css).
 * Accessible listbox: trigger has aria-haspopup/expanded; the list uses
 * aria-activedescendant. Keyboard: ↑/↓, Home/End, Enter/Space, Esc, Tab,
 * and type-to-jump. Closes on outside click. Opens upward when there isn't
 * room below (bottom of a sheet / short screen).
 *
 * variant="toolbar" → compact pill (Sort by …)
 * variant="field"   → full-width form control (matches form inputs)
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  prefix,
  ariaLabel,
  variant = "field",
  align = "left",
  className,
  triggerClassName,
  disabled = false,
  invalid = false,
}) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typeahead = useRef({ text: "", t: 0 });
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const openList = useCallback(() => {
    if (disabled) return;
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [disabled, selectedIndex]);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choose = (index) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    if (opt.value !== value) onChange(opt.value);
    close();
  };

  // Flip upward when the panel would run off the bottom of the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = Math.min(300, options.length * 42 + 12);
    const below = window.innerHeight - rect.bottom;
    setDropUp(below < panelH + 16 && rect.top > below);
  }, [open, options.length]);

  // Outside click closes.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || highlight < 0) return;
    listRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const move = (delta) => {
    if (!options.length) return;
    let i = highlight;
    for (let n = 0; n < options.length; n += 1) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setHighlight(i);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setHighlight(0);
        break;
      case "End":
        e.preventDefault();
        setHighlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(highlight);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          const ta = typeahead.current;
          ta.text = now - ta.t > 700 ? e.key.toLowerCase() : ta.text + e.key.toLowerCase();
          ta.t = now;
          const hit = options.findIndex((o) => String(o.label).toLowerCase().startsWith(ta.text));
          if (hit >= 0) setHighlight(hit);
        }
    }
  };

  const trigger =
    variant === "toolbar"
      ? "h-10 rounded-lg border border-neutral-200 bg-white pl-3 pr-2.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]"
      : cn(
          "h-11 w-full rounded-xl border bg-[#F7F8FA] pl-3.5 pr-3 text-sm dark:bg-[#131313]",
          invalid ? "border-red-400" : "border-neutral-200 dark:border-neutral-700",
        );

  return (
    <div ref={rootRef} className={cn("relative", variant === "field" && "w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open && highlight >= 0 ? `${id}-opt-${highlight}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60",
          "hover:border-neutral-300 dark:hover:border-neutral-600",
          open && "border-[var(--accent)] ring-2 ring-[var(--accent-ring)] hover:border-[var(--accent)]",
          trigger,
          triggerClassName,
        )}
      >
        {prefix && <span className="shrink-0 whitespace-nowrap text-slate-400 max-[359px]:hidden dark:text-zinc-500">{prefix}</span>}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selected ? "font-semibold text-slate-800 dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500",
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            initial={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "dd-panel absolute z-50 max-h-[300px] min-w-full overflow-y-auto p-1.5",
              variant === "toolbar" && "w-max min-w-[220px]",
              dropUp ? "bottom-full mb-2" : "top-full mt-2",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={String(opt.value)}
                  id={`${id}-opt-${i}`}
                  role="option"
                  data-index={i}
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  data-highlighted={i === highlight}
                  onPointerMove={() => i !== highlight && setHighlight(i)}
                  onClick={() => choose(i)}
                  className={cn("dd-item cursor-pointer select-none", opt.disabled && "pointer-events-none opacity-40")}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  <Check
                    className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
