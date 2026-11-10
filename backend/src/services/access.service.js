import AccessPolicy from "../models/AccessPolicy.model.js";
import { logAdminAction } from "./auditLog.service.js";
import { USER_ROLES } from "../config/constants.js";
import { ACCESS_FEATURES, ACCESS_FEATURE_KEYS, ADMIN_ONLY_ACTIONS, DEFAULT_SUPPORT_PERMISSIONS } from "../config/accessFeatures.js";

/**
 * Support-role access policy. Read on every guarded admin request, so it is
 * cached in memory; a save on this instance clears the cache immediately and
 * other instances pick it up within CACHE_MS.
 */
const CACHE_MS = 15_000;
let cache = null; // { permissions, at, updatedAt, updatedBy }

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

// Stored values merged over defaults; unknown keys dropped; manage implies view
// and is forced off for sections with nothing to delegate.
export const normalizePermissions = (stored = {}) =>
  Object.fromEntries(
    ACCESS_FEATURES.map((feature) => {
      const fallback = DEFAULT_SUPPORT_PERMISSIONS[feature.key];
      const value = stored?.[feature.key] || {};
      const view = typeof value.view === "boolean" ? value.view : fallback.view;
      const manage = feature.manage && view ? (typeof value.manage === "boolean" ? value.manage : fallback.manage) : false;
      return [feature.key, { view, manage }];
    }),
  );

export const getSupportPolicy = async ({ fresh = false } = {}) => {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache;
  const doc = await AccessPolicy.findOne({ role: USER_ROLES.SUPPORT }).lean();
  cache = {
    permissions: normalizePermissions(doc?.permissions),
    at: Date.now(),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updated_by_name || null,
    id: doc?._id || null,
  };
  return cache;
};

const FULL_ACCESS = Object.fromEntries(ACCESS_FEATURES.map((f) => [f.key, { view: true, manage: Boolean(f.manage) }]));

/** Effective permissions for a staff user (Super Admin: everything). */
export const permissionsFor = async (user) => {
  if (user?.role === USER_ROLES.ADMIN) return FULL_ACCESS;
  if (user?.role === USER_ROLES.SUPPORT) return (await getSupportPolicy()).permissions;
  return Object.fromEntries(ACCESS_FEATURE_KEYS.map((key) => [key, { view: false, manage: false }]));
};

export const can = async (user, feature, level = "view") => {
  if (user?.role === USER_ROLES.ADMIN) return true;
  const permissions = await permissionsFor(user);
  return Boolean(permissions[feature]?.[level]);
};

/** Everything the access page needs. */
export const getAccessOverview = async (user) => {
  const policy = await getSupportPolicy();
  return {
    features: ACCESS_FEATURES,
    adminOnly: ADMIN_ONLY_ACTIONS,
    defaults: DEFAULT_SUPPORT_PERMISSIONS,
    mine: await permissionsFor(user),
    // The stored policy is only shown to the people who can edit it.
    ...(user?.role === USER_ROLES.ADMIN
      ? { support: policy.permissions, updatedAt: policy.updatedAt, updatedBy: policy.updatedBy }
      : {}),
  };
};

export const updateSupportPolicy = async (actor, input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw badRequest("permissions must be an object");
  const unknown = Object.keys(input).filter((key) => !ACCESS_FEATURE_KEYS.includes(key));
  if (unknown.length) throw badRequest(`Unknown sections: ${unknown.join(", ")}`);
  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== "object") throw badRequest(`${key} must be { view, manage }`);
    for (const level of ["view", "manage"]) {
      if (value[level] !== undefined && typeof value[level] !== "boolean") throw badRequest(`${key}.${level} must be true or false`);
    }
  }

  const before = (await getSupportPolicy({ fresh: true })).permissions;
  const next = normalizePermissions({ ...before, ...input });

  const changes = ACCESS_FEATURES.flatMap((feature) =>
    ["view", "manage"]
      .filter((level) => before[feature.key][level] !== next[feature.key][level])
      .map((level) => ({ section: feature.key, level, from: before[feature.key][level], to: next[feature.key][level] })),
  );

  const doc = await AccessPolicy.findOneAndUpdate(
    { role: USER_ROLES.SUPPORT },
    { $set: { permissions: next, updated_by: actor?._id || null, updated_by_name: actor?.name || null } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  cache = null;

  if (changes.length) {
    await logAdminAction({
      actor,
      action: "access.update",
      targetType: "settings",
      targetId: doc._id,
      targetSnapshot: { name: "Support role access" },
      metadata: { changes },
    }).catch(() => {});
  }

  return { permissions: next, changes: changes.length, updatedAt: doc.updatedAt, updatedBy: doc.updated_by_name };
};

// Tests only.
export const __resetAccessCache = () => {
  cache = null;
};
