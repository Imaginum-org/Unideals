import crypto from "crypto";
import { customAlphabet } from "nanoid";
import PhotoHandoff from "../models/PhotoHandoff.model.js";
import { uploadImageBuffer } from "../utils/imagekit.js";

const HANDOFF_TTL_MS = 15 * 60 * 1000;
const MAX_HANDOFF_IMAGES = 3;

// Unambiguous alphabet (no 0/O/1/I) for dictating codes if needed.
const nanocode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

const hashSecret = (secret) =>
  crypto.createHash("sha256").update(String(secret)).digest("hex");

const timingSafeEqualHex = (a, b) => {
  try {
    const ba = Buffer.from(String(a || ""), "hex");
    const bb = Buffer.from(String(b || ""), "hex");
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
};

const notFoundError = () => {
  const error = new Error("Photo session not found.");
  error.statusCode = 404;
  return error;
};

const expiredError = () => {
  const error = new Error("This photo session has expired. Generate a new QR code.");
  error.statusCode = 410;
  error.code = "HANDOFF_EXPIRED";
  throw error;
};

const findLiveSession = async (code, { withSecret = false } = {}) => {
  if (!/^[A-Z2-9]{6}$/.test(String(code || ""))) {
    throw notFoundError();
  }
  const query = PhotoHandoff.findOne({ code: String(code).toUpperCase() });
  if (withSecret) query.select("+secretHash");
  const session = await query;
  if (!session) {
    throw notFoundError();
  }
  if (session.expiresAt <= new Date()) {
    throw expiredError();
  }
  return session;
};

export const createHandoff = async (userId) => {
  const code = nanocode();
  const secret = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);

  await PhotoHandoff.create({
    code,
    secretHash: hashSecret(secret),
    user: userId,
    images: [],
    expiresAt,
  });

  const base = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  return {
    code,
    secret, // returned once; the desktop embeds it in the QR, never stored client-side
    url: `${base}/p/${code}?k=${secret}`,
    expiresAt,
  };
};

// Owner view for desktop polling. Never exposes the secret hash.
export const getHandoffStatus = async ({ code, userId }) => {
  const session = await findLiveSession(code);
  if (String(session.user) !== String(userId)) {
    throw notFoundError();
  }
  return {
    code: session.code,
    images: session.images.map((img) => ({
      url: img.url,
      fileId: img.fileId,
    })),
    imageCount: session.images.length,
    expiresAt: session.expiresAt,
  };
};

// Phone upload: capability-token auth (QR secret), NOT the user session.
export const addHandoffPhotos = async ({ code, secret, files }) => {
  const session = await findLiveSession(code, { withSecret: true });
  if (!timingSafeEqualHex(hashSecret(secret), session.secretHash)) {
    const error = new Error("Invalid photo session.");
    error.statusCode = 401;
    throw error;
  }

  const incoming = Array.isArray(files) ? files : [];
  if (incoming.length === 0) {
    const error = new Error("No photos received.");
    error.statusCode = 400;
    throw error;
  }
  if (session.images.length + incoming.length > MAX_HANDOFF_IMAGES) {
    const error = new Error(
      `Maximum ${MAX_HANDOFF_IMAGES} photos per listing.`,
    );
    error.statusCode = 400;
    throw error;
  }

  const uploaded = [];
  for (const file of incoming) {
    // Defense in depth: multer already gates MIME + size; re-check here
    // since this endpoint is reachable with only the QR secret.
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype || "")) {
      const error = new Error("Only JPG, PNG or WEBP photos are allowed.");
      error.statusCode = 400;
      throw error;
    }
    const safeName = String(file.originalname || "photo.jpg")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);
    const result = await uploadImageBuffer(
      file.buffer,
      `${Date.now()}_${safeName}`,
    );
    uploaded.push(result);
  }

  session.images.push(
    ...uploaded.map((img) => ({ url: img.url, fileId: img.fileId })),
  );
  await session.save();

  return { images: uploaded, imageCount: session.images.length };
};
