// Shared chat theme, mirrors the navbar Sell button and the white-input rule:
// every input is white with black text (both modes), every primary button is
// solid #3838EC / rounded-lg / medium / off-white text with the same hover pop.

export const SELL_BTN =
  "rounded-lg bg-[#3838EC] font-medium text-[#FCFCFC] transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100";

// Same Sell look for the deal flow, but with zero scale motion.
export const SELL_BTN_FLAT =
  "rounded-lg bg-[#3838EC] font-medium text-[#FCFCFC] transition-colors duration-200 hover:bg-[#2f2fd9] disabled:opacity-50";

// White bg + black text in BOTH themes (dark: variants forced, not flipped).
export const INPUT_BASE =
  "rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#3838EC] dark:border-zinc-200 dark:bg-white dark:text-zinc-900 dark:placeholder:text-zinc-400";
