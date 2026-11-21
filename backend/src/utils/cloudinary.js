import crypto from "crypto";

/**
 * Cloudinary, without the SDK (signing is a sha1; the few Admin API calls
 * are plain HTTPS). Used for chat photos so ImageKit keeps its quota for
 * listings and voice notes.
 *
 * Flow: the server signs an upload locked to the user's own folder, tag and
 * formats; the browser uploads straight to Cloudinary; the client sends back
 * public_id + version + Cloudinary's response signature, which the server
 * verifies locally with the API secret. No Admin API call per message (the
 * Admin API is rate-limited per hour), and no image bytes through our server.
 */

export const CHAT_IMAGE_TAG = "chat";
export const CHAT_IMAGE_FORMATS = "jpg,jpeg,png,webp,heic,heif,avif";
// Incoming transformation (applied before storing): at most 1600px and
// recompressed with q_auto:good, so even an uncompressed upload (e.g. HEIC
// straight from an iPhone) is stored small. Saves storage credits; delivery
// adds f_auto/q_auto on top.
const INCOMING = "c_limit,h_1600,w_1600,q_auto:good";
const SIGN_TTL_S = 10 * 60;

// Hosting dashboards often keep stray quotes/spaces in pasted values.
const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "").trim();

// Either the three separate variables, or Cloudinary's single
// CLOUDINARY_URL (cloudinary://<api_key>:<api_secret>@<cloud_name>).
const fromUrl = () => {
  const raw = clean(process.env.CLOUDINARY_URL);
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(raw);
  return m ? { apiKey: m[1], apiSecret: m[2], cloudName: m[3] } : {};
};

const cfg = () => {
  const url = fromUrl();
  return {
    cloudName: clean(process.env.CLOUDINARY_CLOUD_NAME) || url.cloudName || "",
    apiKey: clean(process.env.CLOUDINARY_API_KEY) || url.apiKey || "",
    apiSecret: clean(process.env.CLOUDINARY_API_SECRET) || url.apiSecret || "",
  };
};

/** Names of the missing settings (never values), for the startup log. */
export const cloudinaryMissing = () => {
  const c = cfg();
  return [
    !c.cloudName && "CLOUDINARY_CLOUD_NAME",
    !c.apiKey && "CLOUDINARY_API_KEY",
    !c.apiSecret && "CLOUDINARY_API_SECRET",
  ].filter(Boolean);
};

export const cloudinaryConfigured = () => {
  const c = cfg();
  return Boolean(c.cloudName && c.apiKey && c.apiSecret);
};

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// Cloudinary signature: params sorted by key, "k=v" joined with "&", then
// the API secret appended, sha1 hex.
const signParams = (params, secret) =>
  sha1(
    Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== "")
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + secret,
  );

export const userChatFolder = (userId) => `unideals/chat/${String(userId)}`;

/**
 * Signed params for ONE direct browser upload. The server picks the exact
 * public_id (inside the user's chat folder), so it works the same on
 * fixed- and dynamic-folder Cloudinary accounts, and overwrite=false means
 * a sent photo can never be swapped for another later.
 */
export const signChatImageUpload = (userId) => {
  const c = cfg();
  const params = {
    allowed_formats: CHAT_IMAGE_FORMATS,
    overwrite: "false",
    public_id: `${userChatFolder(userId)}/${crypto.randomBytes(12).toString("hex")}`,
    tags: CHAT_IMAGE_TAG,
    timestamp: Math.floor(Date.now() / 1000),
    transformation: INCOMING,
  };
  return {
    cloudName: c.cloudName,
    apiKey: c.apiKey,
    ...params,
    signature: signParams(params, c.apiSecret),
    expiresIn: SIGN_TTL_S,
  };
};

const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a || ""), "utf8");
  const y = Buffer.from(String(b || ""), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** True when public_id/version came from a real Cloudinary upload response. */
export const verifyUploadResponse = ({ publicId, version, signature }) => {
  const c = cfg();
  if (!c.apiSecret) return false;
  const expected = sha1(`public_id=${publicId}&version=${version}${c.apiSecret}`);
  return safeEqualHex(expected, signature);
};

const PUBLIC_ID_RE = /^[A-Za-z0-9_\-/]+$/;
export const isOwnChatImage = (publicId, userId) =>
  typeof publicId === "string" &&
  publicId.length <= 255 &&
  PUBLIC_ID_RE.test(publicId) &&
  publicId.startsWith(`${userChatFolder(userId)}/`);

/** Canonical delivery URL (auto format/quality); the client adds sizing. */
export const chatImageUrl = (publicId, version) =>
  `https://res.cloudinary.com/${cfg().cloudName}/image/upload/f_auto,q_auto/v${version}/${publicId}`;

// ---- Admin API (cleanup only: a handful of calls per day) ----

const adminFetch = async (path, init = {}) => {
  const c = cfg();
  const auth = Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
  return res.json();
};

/** One page of uploaded images carrying a tag (newest first per Cloudinary). */
export const listByTag = async (tag, { cursor } = {}) => {
  const qs = new URLSearchParams({ max_results: "500", ...(cursor ? { next_cursor: cursor } : {}) });
  return adminFetch(`/resources/image/tags/${encodeURIComponent(tag)}?${qs}`);
};

/** Delete up to 100 public ids per call; best effort, returns how many. */
export const deleteChatImages = async (publicIds = []) => {
  if (!cloudinaryConfigured()) return 0;
  const ids = [...new Set(publicIds.filter((id) => typeof id === "string" && PUBLIC_ID_RE.test(id)))];
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const qs = new URLSearchParams();
    ids.slice(i, i + 100).forEach((id) => qs.append("public_ids[]", id));
    try {
      await adminFetch(`/resources/image/upload?${qs}`, { method: "DELETE" });
      deleted += Math.min(100, ids.length - i);
    } catch (err) {
      console.error("Cloudinary delete failed:", err.message);
    }
  }
  return deleted;
};
