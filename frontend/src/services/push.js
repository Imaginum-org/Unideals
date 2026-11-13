// Browser system notifications via Firebase Cloud Messaging.
//
// Flow: user clicks "Turn on" -> browser permission prompt -> register
// /push-sw.js -> FCM token -> POST /api/notifications/devices. On later
// visits the token is refreshed silently (tokens rotate). Before logout the
// token is removed so this browser stops getting that account's alerts.
//
// Firebase is imported lazily so it never weighs down the first page load.
import axios from "./axiosInstance.js";

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY;
const SW_URL = "/push-sw.js";
const TOKEN_KEY = "unideals-push-token";

const storage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (value) => {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // private mode: we just re-register next time
    }
  },
};

const configured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && VAPID_KEY);

let messagingPromise = null;
const getMessagingInstance = () => {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const [{ initializeApp, getApps }, messagingModule] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!(await messagingModule.isSupported())) return null;
      const app = getApps()[0] || initializeApp(firebaseConfig);
      return { messaging: messagingModule.getMessaging(app), ...messagingModule };
    })().catch((error) => {
      console.warn("Push unavailable:", error?.message);
      return null;
    });
  }
  return messagingPromise;
};

/** "unsupported" | "default" (not asked yet) | "granted" | "denied" */
export const getPushPermission = () => {
  if (!configured() || typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported"; // e.g. iPhone Safari unless the site is added to the home screen
  }
  return Notification.permission;
};

const registerToken = async () => {
  const fcm = await getMessagingInstance();
  if (!fcm) return null;
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  const token = await fcm.getToken(fcm.messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return null;
  await axios.post("/api/notifications/devices", { token, platform: "web" });
  storage.set(token);
  return token;
};

/**
 * Ask for permission and register this browser. Call from a click handler:
 * browsers block permission prompts that aren't triggered by the user.
 */
export const enablePush = async () => {
  if (getPushPermission() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  await registerToken();
  return "granted";
};

/** On each logged-in visit: refresh the token if permission was granted before. */
export const syncPush = async () => {
  if (getPushPermission() !== "granted") return;
  try {
    await registerToken();
  } catch (error) {
    console.warn("Push token refresh failed:", error?.message);
  }
};

/** Before logout: detach this browser from the account. Never throws. */
export const disablePushForLogout = async () => {
  const token = storage.get();
  if (!token) return;
  storage.set(null);
  try {
    await axios.delete("/api/notifications/devices", { data: { token } });
  } catch {
    // the server prunes dead tokens anyway
  }
};
