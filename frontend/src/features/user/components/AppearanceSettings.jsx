import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Panel } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";
import { useTheme } from "../../../context/ThemeContext.jsx";

/*
 * Settings → Appearance. Everyone gets Light (default), Dark and System.
 * Female students also get two quiet light themes, Rose and Lavender:
 * the same clean layout with a softly tinted surface and a muted accent,
 * nothing loud.
 */

// Mini page mock per theme: page, panel, text lines, accent button.
const PREVIEW = {
  light: { page: "#FFFFFF", panel: "#F7F8FA", line: "#E2E5EA", text: "#CBD0D8", accent: "#3838EC" },
  dark: { page: "#131313", panel: "#1A1D20", line: "#2A2D33", text: "#3A3E45", accent: "#6D6DF5" },
  rose: { page: "#FFFCFC", panel: "#FBF6F7", line: "#EFE3E6", text: "#DCCBD0", accent: "#B2456C" },
  lavender: { page: "#FDFCFF", panel: "#F7F6FC", line: "#E6E3F1", text: "#D0CBE2", accent: "#6D55C4" },
};

const BASE_OPTIONS = [
  { value: "light", label: "Light", hint: "Default", icon: Sun },
  { value: "dark", label: "Dark", hint: "Easy on the eyes at night", icon: Moon },
  { value: "system", label: "System", hint: "Matches your device", icon: Monitor },
];

const EXTRA_OPTIONS = [
  { value: "rose", label: "Rose", hint: "Soft warm tint" },
  { value: "lavender", label: "Lavender", hint: "Soft cool tint" },
];

function Mock({ p }) {
  return (
    <span className="block h-full w-full p-2" style={{ background: p.page }}>
      <span className="flex h-full flex-col gap-1.5 rounded-md p-2" style={{ background: p.panel, boxShadow: `inset 0 0 0 1px ${p.line}` }}>
        <span className="block h-1.5 w-3/5 rounded-full" style={{ background: p.text }} />
        <span className="block h-1.5 w-2/5 rounded-full" style={{ background: p.line }} />
        <span className="mt-auto block h-2.5 w-8 rounded" style={{ background: p.accent }} />
      </span>
    </span>
  );
}

function Preview({ value }) {
  if (value === "system") {
    // Half light, half dark, split diagonally.
    return (
      <span className="relative block h-full w-full">
        <span className="absolute inset-0">
          <Mock p={PREVIEW.light} />
        </span>
        <span className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
          <Mock p={PREVIEW.dark} />
        </span>
      </span>
    );
  }
  return <Mock p={PREVIEW[value]} />;
}

function ThemeCard({ option, selected, onSelect }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={(e) => onSelect(option.value, e)}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white text-left outline-none transition-[border-color,box-shadow] dark:bg-[#131313]",
        "focus-visible:ring-4 focus-visible:ring-[var(--accent-soft-strong)]",
        selected
          ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600",
      )}
    >
      <span className="block aspect-[16/10] w-full border-b border-neutral-100 dark:border-neutral-800">
        <Preview value={option.value} />
      </span>
      <span className="flex min-h-[52px] items-center gap-2.5 px-3 py-2.5">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
        ) : (
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white dark:ring-[#131313]"
            style={{ background: PREVIEW[option.value].accent }}
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{option.label}</span>
          <span className="block truncate text-[11.5px] text-slate-500 dark:text-zinc-400">{option.hint}</span>
        </span>
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
            selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-neutral-300 dark:border-neutral-600",
          )}
          aria-hidden="true"
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

export default function AppearanceSettings({ gender }) {
  const { theme, setTheme } = useTheme();
  const isFemale = gender === "female";
  const options = isFemale ? [...BASE_OPTIONS, ...EXTRA_OPTIONS] : BASE_OPTIONS;

  return (
    <Panel title="Theme" description="Choose how Unideals looks on this device.">
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", isFemale && "xl:grid-cols-5")}
      >
        {options.map((o) => (
          <ThemeCard key={o.value} option={o} selected={theme === o.value} onSelect={setTheme} />
        ))}
      </div>
      {(theme === "rose" || theme === "lavender") && (
        <p className="mt-3 text-[12px] text-slate-500 dark:text-zinc-400">
          The sun/moon button in the header still switches to dark, and back to {theme === "rose" ? "Rose" : "Lavender"}.
        </p>
      )}
    </Panel>
  );
}
