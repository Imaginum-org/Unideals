// System (OS-level) push via Firebase Cloud Messaging, for web browsers and
// the Android app. A side channel of notification.service.js: the in-app
// notification is always stored + socket-emitted first; push is best-effort.
//
// Off unless PUSH_ENABLED=true and FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
// FIREBASE_PRIVATE_KEY are set, so local dev and tests never call Google.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import DeviceToken from "../models/DeviceToken.model.js";
import User from "../models/User.model.js";
import { AppError } from "../utils/appError.js";

const APP_NAME = "push";
const BATCH_SIZE = 500; // FCM multicast limit
const MAX_DEVICES_PER_USER = 10;
const PLATFORMS = ["web", "android", "ios"];
// Only these mean "this token will never work again". Anything else
// (quota, server errors, a bad payload) must not delete user tokens.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

let messagingClient = null;
let initAttempted = false;

const getClient = () => {
  if (initAttempted) return messagingClient;
  initAttempted = true;
  if (process.env.PUSH_ENABLED !== "true") return null;

  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
  // .env files store the key on one line with literal "\n" sequences.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[push] PUSH_ENABLED=true but Firebase credentials are missing; push is off.");
    return null;
  }
  try {
    const app =
      getApps().find((a) => a.name === APP_NAME) ||
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, APP_NAME);
    messagingClient = getMessaging(app);
  } catch (error) {
    console.error("[push] Firebase init failed; push is off:", error?.message);
  }
  return messagingClient;
};

export const isPushEnabled = () => Boolean(getClient());

// ==================== DEVICE TOKENS ====================

export const registerDeviceToken = async ({ userId, token, platform, userAgent = null }) => {
  if (typeof token !== "string" || token.trim().length < 20 || token.length > 4096) {
    throw new AppError("Invalid push token", 400);
  }
  if (!PLATFORMS.includes(platform)) throw new AppError("Invalid platform", 400);

  const update = {
    $set: { user_id: userId, platform, user_agent: clip(userAgent, 300) || null, last_seen_at: new Date() },
  };
  try {
    await DeviceToken.updateOne({ token: token.trim() }, update, { upsert: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    await DeviceToken.updateOne({ token: token.trim() }, update); // lost an upsert race; just update
  }

  // Keep the newest few devices per user; old browsers pile up otherwise.
  const stale = await DeviceToken.find({ user_id: userId })
    .sort({ last_seen_at: -1 })
    .skip(MAX_DEVICES_PER_USER)
    .select("_id")
    .lean();
  if (stale.length) await DeviceToken.deleteMany({ _id: { $in: stale.map((d) => d._id) } });
  return { ok: true };
};

export const unregisterDeviceToken = async ({ userId, token }) => {
  if (typeof token !== "string" || !token.trim()) throw new AppError("Invalid push token", 400);
  await DeviceToken.deleteOne({ token: token.trim(), user_id: userId });
  return { ok: true };
};

// ==================== SENDING ====================

/**
 * One FCM message for every platform.
 *  - web: data-only; /push-sw.js renders it (and stays quiet while the site
 *    is open and visible, where the in-app toast already shows it).
 *  - android: a notification message, shown by the OS even when the app is
 *    closed. `tag` makes a newer alert replace the older one (chat grouping).
 * FCM data values must all be strings.
 */
const buildMessage = ({ id, kind, title, message, actionPath, tag, imageUrl }) => {
  const safeTitle = clip(title, 100) || "Unideals";
  const body = clip(message, 240);
  const collapse = clip(tag || `n:${id}`, 100);
  // Already validated as https:// when the campaign was created.
  const image = typeof imageUrl === "string" && imageUrl.startsWith("https://") ? imageUrl : "";
  return {
    data: {
      notificationId: String(id || ""),
      kind: String(kind || "general"),
      title: safeTitle,
      body,
      path: actionPath || "/notification",
      tag: collapse,
      ...(image && { image }),
    },
    android: {
      priority: "high",
      collapseKey: collapse,
      notification: {
        title: safeTitle,
        body,
        tag: collapse,
        channelId: "default",
        ...(image && { imageUrl: image }),
      },
    },
    webpush: { headers: { Urgency: "high", TTL: String(24 * 60 * 60) } },
  };
};

const sendToTokens = async (tokens, message) => {
  const client = getClient();
  if (!client || !tokens.length) return { sent: 0, failed: 0, removed: 0 };

  let sent = 0;
  let failed = 0;
  const dead = [];
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const chunk = tokens.slice(i, i + BATCH_SIZE);
    const result = await client.sendEachForMulticast({ ...message, tokens: chunk });
    result.responses.forEach((response, j) => {
      if (response.success) {
        sent += 1;
        return;
      }
      failed += 1;
      if (DEAD_TOKEN_CODES.has(response.error?.code)) dead.push(chunk[j]);
      else console.warn("[push] send error:", response.error?.code || response.error?.message);
    });
  }
  if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
  return { sent, failed, removed: dead.length };
};

/**
 * Push one notification to every device of the given users.
 * Never throws: push must not break the event that triggered it.
 */
export const pushToUsers = async (userIds, notification) => {
  try {
    if (!getClient() || !userIds?.length) return null;
    const tokens = await DeviceToken.find({ user_id: { $in: userIds } }).distinct("token");
    return await sendToTokens(tokens, buildMessage(notification));
  } catch (error) {
    console.error("[push] pushToUsers failed:", error?.message);
    return null;
  }
};

/** Push a campaign to every device whose user matches a User filter. */
export const pushToUserFilter = async (userFilter, notification) => {
  try {
    if (!getClient()) return null;
    const userIds = await User.distinct("_id", userFilter);
    return await pushToUsers(userIds, notification);
  } catch (error) {
    console.error("[push] pushToUserFilter failed:", error?.message);
    return null;
  }
};
