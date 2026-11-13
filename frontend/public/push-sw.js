/* Unideals push service worker.
 *
 * The backend sends FCM *data-only* web pushes, so this worker decides what
 * to show. No Firebase SDK is loaded here: FCM's payload arrives as JSON
 * with our fields under `data`.
 *
 * Kept deliberately small and separate from any future offline/PWA worker.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const readPayload = (event) => {
  try {
    const json = event.data ? event.data.json() : {};
    return { ...(json.notification || {}), ...(json.data || {}) };
  } catch {
    return {};
  }
};

// In-app paths only; anything else opens the inbox.
const safePath = (path) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/notification";

self.addEventListener("push", (event) => {
  const data = readPayload(event);
  event.waitUntil(
    (async () => {
      // A visible tab already shows the in-app toast + bell; don't double up.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((w) => w.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title || "Unideals", {
        body: data.body || "",
        icon: "/push-icon.png", // PNG: Chrome/Edge don't render SVG notification icons
        // No `badge`: Android masks it to a white silhouette, and a full-bleed
        // square logo becomes a plain white block. The browser default is cleaner.
        tag: data.tag || undefined, // same tag replaces the older alert (grouped chats)
        renotify: Boolean(data.tag),
        data: { path: safePath(data.path), notificationId: data.notificationId || null },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { path, notificationId } = event.notification.data || {};
  const target = new URL(safePath(path), self.location.origin);
  // The page reads this once (NotificationContext) to mark the item read and
  // count the click, then strips it from the address bar.
  if (notificationId) target.searchParams.set("from_push", notificationId);
  const url = target.href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        try {
          await existing.focus();
          return await existing.navigate(url); // only works for tabs this worker controls
        } catch {
          // fall through to a new tab
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
