// Chat wallpapers. IDs must match the backend allowlist in
// user.controller.js updateChatSettings. Patterns are transparent layers
// over the theme thread background, so every option works light + dark.

export const WALLPAPERS = [
  { id: "default", name: "Default", cls: "chat-doodle" },
  { id: "campus", name: "Pinstripe", cls: "wall-campus" },
  { id: "grid", name: "Indigo Grid", cls: "wall-grid" },
  { id: "paper", name: "Warm Paper", cls: "wall-paper" },
  { id: "waves", name: "Waves", cls: "wall-waves" },
];

export const wallpaperById = (id) =>
  WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];

// Merged with schema defaults (old accounts lack the subdocument).
export const chatSettingsOf = (user) => ({
  wallpaper: "default",
  read_receipts: true,
  typing_indicators: true,
  ...(user?.chat_settings || {}),
});
