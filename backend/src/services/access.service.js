import mongoose from "mongoose";
import AccessPolicy from "../models/AccessPolicy.model.js";
import StaffAccess from "../models/StaffAccess.model.js";
import User from "../models/User.model.js";
import Campus from "../models/Campus.model.js";
import { logAdminAction } from "./auditLog.service.js";
import { USER_ROLES } from "../config/constants.js";
import {
  ACCESS_FEATURES,
  ACCESS_FEATURE_KEYS,
  ADMIN_ONLY_ACTIONS,
  CAMPUS_SCOPED_SECTIONS,
  DEFAULT_SUPPORT_PERMISSIONS,
} from "../config/accessFeatures.js";

/**
 * Admin-console access.
 *
 * - Super Admins: everything.
 * - Support staff: the Support role policy, unless a Super Admin gave that
 *   person custom access (a full set that replaces the role policy for them).
 *   Either can also be limited to some campuses (empty list = every campus);
 *   see campusScope.service.js for how records map to a campus.
 *
 * Read on every guarded request, so both are cached in memory. A save on
 * this instance clears the relevant cache at once; other instances pick
 * changes up within CACHE_MS.
 */
const CACHE_MS = 15_000;
let roleCache = null; // { permissions, campuses, at, updatedAt, updatedBy, id }
const personCache = new Map(); // userId -> { access: { permissions, campuses } | null, at }

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });
const notFound = (message) => Object.assign(new Error(message), { statusCode: 404 });

// Stored values merged over a fallback; unknown keys dropped; manage implies
// view and is forced off for sections with nothing to delegate.
export const normalizePermissions = (stored = {}, fallbackSet = DEFAULT_SUPPORT_PERMISSIONS) =>
  Object.fromEntries(
    ACCESS_FEATURES.map((feature) => {
      const fallback = fallbackSet[feature.key] || DEFAULT_SUPPORT_PERMISSIONS[feature.key];
      const value = stored?.[feature.key] || {};
      const view = typeof value.view === "boolean" ? value.view : fallback.view;
      const manage = feature.manage && view ? (typeof value.manage === "boolean" ? value.manage : fallback.manage) : false;
      return [feature.key, { view, manage }];
    }),
  );

const validateInput = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw badRequest("permissions must be an object");
  const unknown = Object.keys(input).filter((key) => !ACCESS_FEATURE_KEYS.includes(key));
  if (unknown.length) throw badRequest(`Unknown sections: ${unknown.join(", ")}`);
  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw badRequest(`${key} must be { view, manage }`);
    for (const level of ["view", "manage"]) {
      if (value[level] !== undefined && typeof value[level] !== "boolean") throw badRequest(`${key}.${level} must be true or false`);
    }
  }
};

// Campus list input: undefined = leave as is; null or [] = every campus.
const MAX_CAMPUSES = 200;
const validateCampuses = async (input) => {
  if (input === undefined) return undefined;
  if (input === null) return [];
  if (!Array.isArray(input)) throw badRequest("campuses must be a list of campus ids");
  const ids = [...new Set(input.map(String))];
  if (ids.length > MAX_CAMPUSES) throw badRequest(`Pick at most ${MAX_CAMPUSES} campuses`);
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) throw badRequest("One or more campus ids are invalid");
  if (ids.length) {
    const found = await Campus.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) throw badRequest("One or more campuses don't exist");
  }
  return ids.sort();
};

const toIds = (list) => (Array.isArray(list) ? list.map(String).sort() : []);
const sameCampuses = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

const campusNames = async (ids) => {
  if (!ids.length) return ["All campuses"];
  const rows = await Campus.find({ _id: { $in: ids } }).select("name").lean();
  const byId = new Map(rows.map((c) => [String(c._id), c.name]));
  return ids.map((id) => byId.get(id) || "Removed campus");
};

const diff = (before, after) =>
  ACCESS_FEATURES.flatMap((feature) =>
    ["view", "manage"]
      .filter((level) => before[feature.key][level] !== after[feature.key][level])
      .map((level) => ({ section: feature.key, level, from: before[feature.key][level], to: after[feature.key][level] })),
  );

// ─── Role policy ───────────────────────────────────────────────────────────

export const getSupportPolicy = async ({ fresh = false } = {}) => {
  if (!fresh && roleCache && Date.now() - roleCache.at < CACHE_MS) return roleCache;
  const doc = await AccessPolicy.findOne({ role: USER_ROLES.SUPPORT }).lean();
  roleCache = {
    permissions: normalizePermissions(doc?.permissions),
    campuses: toIds(doc?.campuses),
    at: Date.now(),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updated_by_name || null,
    id: doc?._id || null,
  };
  return roleCache;
};

// ─── Per-person access ─────────────────────────────────────────────────────

// The person's custom set ({ permissions, campuses }), or null when they
// follow the role policy.
const getPersonOverride = async (userId, { fresh = false } = {}) => {
  const key = String(userId);
  const hit = personCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.access;
  const doc = await StaffAccess.findOne({ user_id: userId }).lean();
  // Sections added after the override was saved fall back to the role policy.
  const access = doc
    ? { permissions: normalizePermissions(doc.permissions, (await getSupportPolicy()).permissions), campuses: toIds(doc.campuses) }
    : null;
  personCache.set(key, { access, at: Date.now() });
  return access;
};

const FULL_ACCESS = Object.fromEntries(ACCESS_FEATURES.map((f) => [f.key, { view: true, manage: Boolean(f.manage) }]));
const NO_ACCESS = Object.fromEntries(ACCESS_FEATURE_KEYS.map((key) => [key, { view: false, manage: false }]));

/** Effective access for a staff user: { permissions, campuses, custom }. campuses [] = all. */
export const accessFor = async (user) => {
  if (user?.role === USER_ROLES.ADMIN) return { permissions: FULL_ACCESS, campuses: [], custom: false };
  if (user?.role !== USER_ROLES.SUPPORT) return { permissions: NO_ACCESS, campuses: [], custom: false };
  const userId = user._id || user.id;
  const custom = userId ? await getPersonOverride(userId) : null;
  if (custom) return { ...custom, custom: true };
  const role = await getSupportPolicy();
  return { permissions: role.permissions, campuses: role.campuses, custom: false };
};

/** Effective permissions for a staff user. */
export const permissionsFor = async (user) => (await accessFor(user)).permissions;

/** null = every campus; otherwise the campus ObjectIds this person may see. */
export const campusScopeFor = async (user) => {
  const { campuses } = await accessFor(user);
  return campuses.length ? campuses.map((id) => new mongoose.Types.ObjectId(id)) : null;
};

export const can = async (user, feature, level = "view") => {
  if (user?.role === USER_ROLES.ADMIN) return true;
  const permissions = await permissionsFor(user);
  return Boolean(permissions[feature]?.[level]);
};

const loadSupportPerson = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw badRequest("Invalid user id");
  const person = await User.findById(userId).select("name email role").lean();
  if (!person) throw notFound("User not found");
  if (person.role !== USER_ROLES.SUPPORT) throw badRequest("Custom access is only for support staff");
  return person;
};

/** Super Admin: give one support person their own access set (and campuses). */
export const setPersonAccess = async (actor, userId, input, campusesInput) => {
  if (input === undefined && campusesInput !== undefined) input = {};
  validateInput(input);
  const person = await loadSupportPerson(userId);
  const nextCampuses = await validateCampuses(campusesInput);
  const role = await getSupportPolicy({ fresh: true });
  const before = (await getPersonOverride(userId, { fresh: true })) || { permissions: role.permissions, campuses: role.campuses };
  const next = normalizePermissions({ ...before.permissions, ...input }, role.permissions);
  const campuses = nextCampuses ?? before.campuses;
  const wasCustom = Boolean(await StaffAccess.exists({ user_id: userId }));

  const doc = await StaffAccess.findOneAndUpdate(
    { user_id: userId },
    { $set: { permissions: next, campuses, updated_by: actor?._id || null, updated_by_name: actor?.name || null } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  personCache.delete(String(userId));

  const changes = diff(before.permissions, next);
  const campusChanged = !sameCampuses(before.campuses, campuses);
  if (changes.length || campusChanged || !wasCustom) {
    await logAdminAction({
      actor,
      action: "access.person_update",
      targetType: "user",
      targetId: person._id,
      targetSnapshot: { name: person.name, email: person.email },
      metadata: {
        changes,
        startedCustom: !wasCustom,
        ...(campusChanged ? { campuses: { from: await campusNames(before.campuses), to: await campusNames(campuses) } } : {}),
      },
    }).catch(() => {});
  }
  return {
    permissions: next,
    campuses,
    custom: true,
    changes: changes.length + (campusChanged ? 1 : 0),
    updatedAt: doc.updatedAt,
    updatedBy: doc.updated_by_name,
  };
};

/** Super Admin: put a support person back on the role policy. */
export const resetPersonAccess = async (actor, userId) => {
  const person = await loadSupportPerson(userId);
  const removed = await StaffAccess.findOneAndDelete({ user_id: userId }).lean();
  personCache.delete(String(userId));
  if (removed) {
    await logAdminAction({
      actor,
      action: "access.person_reset",
      targetType: "user",
      targetId: person._id,
      targetSnapshot: { name: person.name, email: person.email },
      metadata: { previous: removed.permissions, previousCampuses: await campusNames(toIds(removed.campuses)) },
    }).catch(() => {});
  }
  const role = await getSupportPolicy();
  return { permissions: role.permissions, campuses: role.campuses, custom: false, reset: Boolean(removed) };
};

/** Drop a person's custom access (e.g. their support role was removed). */
export const dropPersonAccess = async (userId) => {
  await StaffAccess.deleteOne({ user_id: userId }).catch(() => {});
  personCache.delete(String(userId));
};

// ─── Overview ──────────────────────────────────────────────────────────────

const listSupportStaff = async () => {
  const [people, overrides, role] = await Promise.all([
    User.find({ role: USER_ROLES.SUPPORT }).select("name email avatar status").sort({ name: 1 }).lean(),
    StaffAccess.find({}).lean(),
    getSupportPolicy(),
  ]);
  const byUser = new Map(overrides.map((o) => [String(o.user_id), o]));
  return people.map((person) => {
    const override = byUser.get(String(person._id));
    return {
      id: String(person._id),
      name: person.name,
      email: person.email,
      avatar: person.avatar || null,
      status: person.status,
      custom: Boolean(override),
      permissions: override ? normalizePermissions(override.permissions, role.permissions) : role.permissions,
      campuses: override ? toIds(override.campuses) : role.campuses,
      updatedAt: override?.updatedAt || null,
      updatedBy: override?.updated_by_name || null,
    };
  });
};

// Campus picker options (all, or just `ids`), active first.
const campusList = async (ids) => {
  const rows = await Campus.find(ids ? { _id: { $in: ids } } : {})
    .select("name short_name is_active")
    .sort({ is_active: -1, name: 1 })
    .lean();
  return rows.map((c) => ({ id: String(c._id), name: c.name, shortName: c.short_name || "", active: c.is_active !== false }));
};

/** Everything the access page needs. */
export const getAccessOverview = async (user) => {
  const policy = await getSupportPolicy();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const mine = await accessFor(user);
  return {
    features: ACCESS_FEATURES,
    adminOnly: ADMIN_ONLY_ACTIONS,
    campusScoped: CAMPUS_SCOPED_SECTIONS,
    defaults: DEFAULT_SUPPORT_PERMISSIONS,
    mine: mine.permissions,
    mineIsCustom: mine.custom,
    // [] = every campus; otherwise the campuses this person's data is limited to.
    mineCampuses: mine.campuses.length ? await campusList(mine.campuses) : [],
    // The stored policies are only shown to the people who can edit them.
    ...(isAdmin
      ? {
          support: policy.permissions,
          supportCampuses: policy.campuses,
          updatedAt: policy.updatedAt,
          updatedBy: policy.updatedBy,
          staff: await listSupportStaff(),
          campuses: await campusList(),
        }
      : {}),
  };
};

export const updateSupportPolicy = async (actor, input, campusesInput) => {
  if (input === undefined && campusesInput !== undefined) input = {};
  validateInput(input);
  const nextCampuses = await validateCampuses(campusesInput);
  const current = await getSupportPolicy({ fresh: true });
  const before = current.permissions;
  const next = normalizePermissions({ ...before, ...input });
  const changes = diff(before, next);
  const campuses = nextCampuses ?? current.campuses;
  const campusChanged = !sameCampuses(current.campuses, campuses);

  const doc = await AccessPolicy.findOneAndUpdate(
    { role: USER_ROLES.SUPPORT },
    { $set: { permissions: next, campuses, updated_by: actor?._id || null, updated_by_name: actor?.name || null } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  roleCache = null;
  // Custom sets fill new sections from the role policy, so refresh them too.
  personCache.clear();

  if (changes.length || campusChanged) {
    await logAdminAction({
      actor,
      action: "access.update",
      targetType: "settings",
      targetId: doc._id,
      targetSnapshot: { name: "Support role access" },
      metadata: {
        changes,
        ...(campusChanged ? { campuses: { from: await campusNames(current.campuses), to: await campusNames(campuses) } } : {}),
      },
    }).catch(() => {});
  }

  return {
    permissions: next,
    campuses,
    changes: changes.length + (campusChanged ? 1 : 0),
    updatedAt: doc.updatedAt,
    updatedBy: doc.updated_by_name,
  };
};

// Tests only.
export const __resetAccessCache = () => {
  roleCache = null;
  personCache.clear();
};
