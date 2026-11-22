import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";

const ThemeContext = createContext();

/*
 * Theme preference, saved in localStorage("theme"):
 *   light (default) | dark | system | rose | lavender
 * "rose" and "lavender" are subtle light themes offered to female students
 * (see AppearanceSettings); they add a theme-* class on <html> that softly
 * tints surfaces and the accent. New visitors always start on light, never
 * on the OS setting; "system" is an explicit choice.
 */
export const THEMES = ["light", "dark", "system", "rose", "lavender"];
export const FEMALE_ONLY_THEMES = ["rose", "lavender"];
const TINT_CLASSES = FEMALE_ONLY_THEMES.map((t) => `theme-${t}`);
const STORAGE_KEY = "theme";
const LAST_LIGHT_KEY = "themeLastLight";

const readStored = () => {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : "light";
  } catch {
    return "light";
  }
};

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

// Circular theme reveal: the new theme expands from the clicked control
// via the View Transitions API (::view-transition-new clip-path in CSS).
// flushSync forces React to apply the class change inside the transition
// callback so the snapshot actually captures both themes.
// Falls back to an instant swap where the API is unavailable.
const runThemeSwap = (swapColors) => {
  if (typeof document !== "undefined" && document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(() => {
        swapColors();
      });
    });
  } else {
    swapColors();
  }
};

// Reveal origin = the control's center (works for keyboard activation too).
const setRevealOrigin = (event) => {
  if (typeof document === "undefined") return;
  const rect = event?.currentTarget?.getBoundingClientRect?.();
  const x = rect != null ? rect.left + rect.width / 2 : event?.clientX || window.innerWidth / 2;
  const y = rect != null ? rect.top + rect.height / 2 : event?.clientY || window.innerHeight / 2;
  document.documentElement.style.setProperty("--theme-tx", `${x}px`);
  document.documentElement.style.setProperty("--theme-ty", `${y}px`);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readStored);
  const [osDark, setOsDark] = useState(systemPrefersDark);

  // Follow the OS live, but only matters while "system" is picked.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const onChange = (e) => setOsDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const darkMode = theme === "dark" || (theme === "system" && osDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    TINT_CLASSES.forEach((c) => root.classList.remove(c));
    if (FEMALE_ONLY_THEMES.includes(theme)) root.classList.add(`theme-${theme}`);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      if (theme !== "dark" && theme !== "system") localStorage.setItem(LAST_LIGHT_KEY, theme);
    } catch {
      // private mode: in-memory only
    }
  }, [theme, darkMode]);

  const setTheme = useCallback((next, event) => {
    if (!THEMES.includes(next)) return;
    setRevealOrigin(event);
    runThemeSwap(() => setThemeState(next));
  }, []);

  // Header sun/moon toggle: dark <-> the last light theme used (light, rose
  // or lavender), so a quick toggle never throws away the chosen tint.
  const toggleDarkMode = useCallback(
    (event) => {
      let lastLight = "light";
      try {
        const v = localStorage.getItem(LAST_LIGHT_KEY);
        if (THEMES.includes(v) && v !== "dark" && v !== "system") lastLight = v;
      } catch {
        // ignore
      }
      setTheme(darkMode ? lastLight : "dark", event);
    },
    [darkMode, setTheme],
  );

  const value = useMemo(() => ({ theme, setTheme, darkMode, toggleDarkMode }), [theme, setTheme, darkMode, toggleDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
};
