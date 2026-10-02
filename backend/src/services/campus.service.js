import Campus from "../models/Campus.model.js";

/**
 * Campus service — single place that turns "which campus?" into a Campus
 * document. Feed/search/detail layers must resolve through here so no
 * endpoint can accidentally serve cross-campus data.
 */

const err = (statusCode, message, code) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  if (code) e.code = code;
  return e;
};

// Short-lived in-memory cache for the public directory (invalidated on write).
let directoryCache = { data: [], at: 0 };
const DIRECTORY_TTL_MS = 5 * 60 * 1000;

export const invalidateCampusCache = () => {
  directoryCache = { data: [], at: 0 };
};

export const listActiveCampuses = async () => {
  const now = Date.now();
  if (directoryCache.data.length > 0 && now - directoryCache.at < DIRECTORY_TTL_MS) {
    return directoryCache.data;
  }
  const campuses = await Campus.find({ is_active: true })
    .select("slug name short_name city state")
    .sort({ name: 1 })
    .lean();
  directoryCache = { data: campuses, at: now };
  return campuses;
};

export const getCampusBySlug = async (slug) => {
  if (typeof slug !== "string" || !slug.trim()) return null;
  return await Campus.findOne({ slug: slug.trim().toLowerCase() }).lean();
};

export const getActiveCampusBySlug = async (slug) => {
  const campus = await getCampusBySlug(slug);
  if (!campus) {
    throw err(400, "Unknown campus. Please pick your campus again.", "CAMPUS_INVALID");
  }
  if (!campus.is_active) {
    throw err(400, "This campus is currently paused. Please pick another campus.", "CAMPUS_INACTIVE");
  }
  return campus;
};

/**
 * Resolve the authoritative campus for a request.
 * - Logged-in users: their profile campus_id (client param ignored — tamper-proof).
 * - Guests: validated `campus_slug` query param.
 * - Guests without one: flagship default (DEFAULT_CAMPUS_SLUG) so the
 *   public storefront is browsable pre-login. Never unscoped.
 * Throws 400 CAMPUS_REQUIRED only when even the default is unavailable.
 */
export const resolveRequestCampus = async (req) => {
  const userCampusId = req.user?.campus_id;
  if (userCampusId) {
    const id = userCampusId._id || userCampusId;
    const campus = await Campus.findById(id).lean();
    if (campus && campus.is_active) return campus;
    // Profile points at a paused/removed campus — force re-pick downstream.
    throw err(400, "Your campus is unavailable. Please pick your campus again.", "CAMPUS_INACTIVE");
  }

  const slug = req.query?.campus_slug;
  if (typeof slug === "string" && slug.trim()) {
    return await getActiveCampusBySlug(slug);
  }

  const fallbackSlug = (process.env.DEFAULT_CAMPUS_SLUG || "vit-vellore").trim();
  try {
    return await getActiveCampusBySlug(fallbackSlug);
  } catch {
    throw err(400, "Campus is required. Please pick your campus.", "CAMPUS_REQUIRED");
  }
};

export const createCampus = async (data) => {
  const campus = await Campus.create({
    slug: String(data.slug || "").trim().toLowerCase(),
    name: data.name,
    short_name: data.short_name,
    city: data.city || null,
    state: data.state || null,
    email_domains: Array.isArray(data.email_domains) ? data.email_domains : [],
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
  });
  invalidateCampusCache();
  return campus.toObject();
};

export const updateCampus = async (id, data) => {
  const allowed = {};
  if (data.name !== undefined) allowed.name = data.name;
  if (data.short_name !== undefined) allowed.short_name = data.short_name;
  if (data.city !== undefined) allowed.city = data.city;
  if (data.state !== undefined) allowed.state = data.state;
  if (data.email_domains !== undefined && Array.isArray(data.email_domains)) {
    allowed.email_domains = data.email_domains;
  }
  if (data.is_active !== undefined) allowed.is_active = Boolean(data.is_active);

  // Slug is immutable — renames go through name/short_name only.
  const campus = await Campus.findByIdAndUpdate(id, allowed, {
    new: true,
    runValidators: true,
  }).lean();
  if (!campus) throw err(404, "Campus not found");
  invalidateCampusCache();
  return campus;
};
