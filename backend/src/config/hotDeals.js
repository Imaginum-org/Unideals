/**
 * "Hot deal" tag rules.
 *
 * A listing earns the tag when it pulls in enough UNIQUE viewers soon after
 * going live, keeps it for a fixed run, then loses it for good, so the tag
 * keeps rotating to newer listings. A per-campus cap keeps it scarce (a tag
 * on everything means nothing).
 *
 * All numbers can be tuned per environment without a deploy of code.
 */
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const HOT_DEAL = Object.freeze({
  // Only listings this young can qualify.
  QUALIFY_WINDOW_HOURS: num(process.env.HOT_QUALIFY_WINDOW_HOURS, 48),
  // Unique viewers (24h-deduped, owner/bots excluded) needed to qualify.
  MIN_UNIQUE_VIEWS: num(process.env.HOT_MIN_UNIQUE_VIEWS, 15),
  // How long the tag stays once earned.
  DURATION_HOURS: num(process.env.HOT_DURATION_HOURS, 48),
  // Max listings tagged at once per campus.
  MAX_PER_CAMPUS: num(process.env.HOT_MAX_PER_CAMPUS, 8),
});
