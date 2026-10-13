export const GENDER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export const GIRLS_ERRORS = Object.freeze({
  NOT_ELIGIBLE_GIRLS_ONLY: {
    statusCode: 403,
    code: "NOT_ELIGIBLE_GIRLS_ONLY",
    message: "Only accounts set as Female can create girls-only listings.",
  },
  GIRLS_CORNER_RESTRICTED: {
    statusCode: 403,
    code: "GIRLS_CORNER_RESTRICTED",
    message: "Girls Corner is a girls-only space. Only accounts set as Female can view listings here.",
  },
  GIRLS_ONLY_PRODUCT: {
    statusCode: 403,
    code: "GIRLS_ONLY_PRODUCT",
    message: "This is a girls-only listing. Only girls can start this chat.",
  },
  GENDER_LOCKED: {
    statusCode: 429,
    code: "GENDER_LOCKED",
    message: "Gender was changed recently. Please try again later.",
  },
});

export const isEligibleGender = (gender) => gender === "female";

export const isAdminRole = (role) => role === "admin" || role === "support";

// Admins see everything (both feeds) for moderation. Female users see
// everything + girls-only feed. Everyone else sees only the mixed feed and
// gets zero hint of Girls Corner existence.
export const canViewGirlsFeed = (gender, role) =>
  gender === "female" || isAdminRole(role);

export const canSeeGirlsProduct = (gender, role) =>
  gender === "female" || isAdminRole(role);

export const girlsCornerError = (key, extra = {}) => {
  const base = GIRLS_ERRORS[key] || { statusCode: 403, code: key, message: key };
  const err = new Error(extra.message || base.message);
  err.statusCode = extra.statusCode || base.statusCode;
  err.code = extra.code || base.code;
  if (extra.retryAfter !== undefined) err.retryAfter = extra.retryAfter;
  if (extra.unlistedCount !== undefined) err.unlistedCount = extra.unlistedCount;
  return err;
};
