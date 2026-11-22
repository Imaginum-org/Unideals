/*
 * Plan-limit prompts, app-wide.
 *
 * The API answers a capped action with { code: "LISTING_LIMIT" | ... }.
 * The axios interceptor (authInterceptor.js) calls maybeShowPlanLimit() for
 * every such error, and the one <PlanLimitDialog /> in App shows it. Callers
 * just skip their own toast with isPlanLimitError(error).
 *
 * No network or storage work here: it's an in-memory event.
 */
export const PLAN_LIMIT_CODES = new Set([
  "LISTING_LIMIT",
  "WISHLIST_LIMIT",
  "BOOST_MONTHLY_LIMIT",
  "BOOST_ACTIVE_LIMIT",
  "BOOST_LIMIT",
]);

const listeners = new Set();

export const subscribePlanLimit = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const showPlanLimit = (detail) => {
  listeners.forEach((fn) => fn(detail));
};

export const planLimitCodeOf = (error) => {
  const code = error?.response?.data?.code;
  return PLAN_LIMIT_CODES.has(code) ? code : null;
};

export const isPlanLimitError = (error) => Boolean(planLimitCodeOf(error));

// Interceptor hook. A request can opt out with { skipPlanLimitDialog: true }.
export const maybeShowPlanLimit = (error) => {
  const code = planLimitCodeOf(error);
  if (!code || error?.config?.skipPlanLimitDialog) return false;
  showPlanLimit({ code, message: error.response.data.message || "" });
  return true;
};
