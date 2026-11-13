// Unideals AI chat themes. The patterns are CSS (.ai-wall-* in
// styles/index.css); the choice is remembered per browser.
import { useCallback, useState } from "react";

export const ASSISTANT_THEMES = [
  { id: "doodles", name: "Doodles" },
  { id: "stars", name: "Starlight" },
  { id: "aurora", name: "Aurora" },
  { id: "notebook", name: "Notebook" },
  { id: "plain", name: "Plain" },
];

const THEME_KEY = "unideals-assistant-theme";
export const DEFAULT_ASSISTANT_THEME = ASSISTANT_THEMES[0].id;
export const isAssistantTheme = (id) => ASSISTANT_THEMES.some((theme) => theme.id === id);

const loadTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isAssistantTheme(stored) ? stored : DEFAULT_ASSISTANT_THEME;
  } catch {
    return DEFAULT_ASSISTANT_THEME;
  }
};

/** [themeId, setThemeId]: remembered in this browser (falls back quietly). */
export const useAssistantTheme = () => {
  const [theme, setTheme] = useState(loadTheme);
  const choose = useCallback((id) => {
    if (!isAssistantTheme(id)) return;
    setTheme(id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      // private mode: the choice lasts until the page closes
    }
  }, []);
  return [theme, choose];
};
