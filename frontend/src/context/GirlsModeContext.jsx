import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";

const GirlsModeContext = createContext(null);

const STORAGE_KEY = "girlsMode";

// Same circular reveal as ThemeToggle: reuse --theme-tx/--theme-ty so the
// pink wash expands from the toggle button via View Transitions API.
const runSwap = (swap) => {
  if (typeof document !== "undefined" && document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(() => {
        swap();
      });
    });
  } else {
    swap();
  }
};

export const GirlsModeProvider = ({ children }) => {
  const [girlsMode, setGirlsMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      return false;
    }
  });

  // Safety: pink mode is meaningless without eligibility — any stored "on"
  // for non-eligible viewers is cleared by the feed pages' canSeeGirls
  // guards. This effect only paints the theme + persists it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("girls-mode", girlsMode);
    try {
      localStorage.setItem(STORAGE_KEY, girlsMode ? "on" : "off");
    } catch {
      // private mode: in-memory only
    }
  }, [girlsMode]);

  const toggleGirlsMode = useCallback((event) => {
    if (typeof document !== "undefined") {
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const x = rect != null ? rect.left + rect.width / 2 : event?.clientX || window.innerWidth / 2;
      const y = rect != null ? rect.top + rect.height / 2 : event?.clientY || window.innerHeight / 2;
      document.documentElement.style.setProperty("--theme-tx", `${x}px`);
      document.documentElement.style.setProperty("--theme-ty", `${y}px`);
    }
    runSwap(() => setGirlsMode((v) => !v));
  }, []);

  const setGirlsModeExplicit = useCallback((on) => {
    runSwap(() => setGirlsMode(Boolean(on)));
  }, []);

  return (
    <GirlsModeContext.Provider value={{ girlsMode, toggleGirlsMode, setGirlsMode: setGirlsModeExplicit }}>
      {children}
    </GirlsModeContext.Provider>
  );
};

export const useGirlsMode = () => {
  const ctx = useContext(GirlsModeContext);
  if (!ctx) throw new Error("useGirlsMode must be used within GirlsModeProvider");
  return ctx;
};
