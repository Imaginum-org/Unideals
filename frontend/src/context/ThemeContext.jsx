import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";

const ThemeContext = createContext();

// Circular theme reveal: the new theme expands from the toggle button
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

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  // Accepts the click event so the reveal can originate from the button.
  // Uses the button's center (works for keyboard activation too, where
  // clientX/clientY are 0). Coordinates are read synchronously — before
  // React re-renders — so the transition snapshot picks them up.
  const toggleDarkMode = useCallback((event) => {
    if (typeof document !== "undefined") {
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const x =
        rect != null
          ? rect.left + rect.width / 2
          : (event?.clientX || window.innerWidth / 2);
      const y =
        rect != null
          ? rect.top + rect.height / 2
          : (event?.clientY || window.innerHeight / 2);
      document.documentElement.style.setProperty("--theme-tx", `${x}px`);
      document.documentElement.style.setProperty("--theme-ty", `${y}px`);
    }
    runThemeSwap(() => {
      setDarkMode((prev) => !prev);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
};
