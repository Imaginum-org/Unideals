import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { notificationApi } from "../features/notification/api/notificationApi.js";
import {
  followNotificationTarget,
  resolveNotificationTarget,
} from "../features/notification/utils/notificationMeta.js";
import { useUser } from "./useUserContext.jsx";
import { toast } from "../components/ui/toast.js";
import { acquireSocket, releaseSocket } from "../services/realtime.js";

const NotificationContext = createContext(null);
const MAX_ITEMS = 100;
const RESYNC_MIN_GAP_MS = 30000;

// Kept for existing imports: an in-app path for a server-supplied link.
// eslint-disable-next-line react-refresh/only-export-components
export const safeActionPath = (value, fallback = "/notification") =>
  resolveNotificationTarget(value, fallback).path || fallback;

// One client shape for feed rows and live socket pushes.
const normalize = (n, { unread } = {}) => {
  const id = String(n.id || n._id);
  return {
    id,
    kind: n.kind,
    type: n.type,
    title: n.title || "New notification",
    description: n.message || n.description || "",
    target: resolveNotificationTarget(n.actionPath || n.action_url),
    actionLabel: n.actionLabel || n.action_label || "View",
    imageUrl: n.imageUrl || n.image_url || null,
    count: n.count || 1,
    createdAt: n.createdAt || new Date().toISOString(),
    unread: unread ?? Boolean(n.unread),
  };
};

// eslint-disable-next-line react/prop-types
export function NotificationProvider({ children }) {
  const { isLoggedIn, loading: userLoading } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const listRef = useRef(notifications);
  listRef.current = notifications;

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      // notificationApi already unwraps axios: `res` is the JSON body,
      // { success, data: Notification[], unreadCount }.
      const res = await notificationApi.getNotifications();
      const items = (Array.isArray(res?.data) ? res.data : []).map((n) => normalize(n));
      if (mountedRef.current) {
        setNotifications(items);
        setError("");
      }
    } catch (fetchError) {
      console.error("Failed to load notifications:", fetchError);
      if (mountedRef.current) setError("Notifications could not be loaded. Please try again.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (userLoading) return undefined;

    mountedRef.current = true;
    if (!isLoggedIn) {
      setNotifications([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    fetchNotifications();

    // Live items arrive via "notification:new"; a full re-sync is only needed
    // after a real gap (reconnect, tab coming back), and never twice in 30s —
    // "connect" fires right after the mount fetch.
    let lastSync = Date.now();
    const resync = () => {
      if (Date.now() - lastSync < RESYNC_MIN_GAP_MS) return;
      lastSync = Date.now();
      fetchNotifications();
    };

    const socket = acquireSocket();
    const onConnectError = (socketError) => {
      console.error("Notification realtime connection failed:", socketError?.message);
    };
    // Upsert: a known id means a grouped item was updated ("3 new messages
    // from Sam"), so replace it and move it to the top as unread.
    const onNotification = (raw) => {
      if (!mountedRef.current || !raw || !(raw.id || raw._id)) return;
      const item = normalize(raw, { unread: true });
      setNotifications((current) =>
        [item, ...current.filter((n) => n.id !== item.id)].slice(0, MAX_ITEMS),
      );
      toast(item.title);
    };
    const onVisibility = () => {
      if (!document.hidden) resync();
    };

    socket.on("connect", resync);
    socket.on("connect_error", onConnectError);
    socket.on("notification:new", onNotification);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      socket.off("connect", resync);
      socket.off("connect_error", onConnectError);
      socket.off("notification:new", onNotification);
      releaseSocket(socket);
    };
  }, [fetchNotifications, isLoggedIn, userLoading]);

  // Optimistic update, then re-sync from the server if the request fails.
  const optimistic = useCallback(
    async (apply, request, failMessage) => {
      setNotifications(apply);
      try {
        await request();
      } catch (requestError) {
        console.error(failMessage, requestError);
        toast.error(failMessage);
        await fetchNotifications();
      }
    },
    [fetchNotifications],
  );

  const markRead = useCallback(
    async (id) => {
      if (!listRef.current.find((n) => n.id === id)?.unread) return;
      await optimistic(
        (list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        () => notificationApi.markRead(id),
        "Could not update this notification. Refresh and try again.",
      );
    },
    [optimistic],
  );

  const markAllRead = useCallback(
    () =>
      optimistic(
        (list) => list.map((n) => ({ ...n, unread: false })),
        () => notificationApi.markAllRead(),
        "Could not update your notifications. Refresh and try again.",
      ),
    [optimistic],
  );

  const dismiss = useCallback(
    (id) =>
      optimistic(
        (list) => list.filter((n) => n.id !== id),
        () => notificationApi.dismiss(id),
        "Could not dismiss this notification. Please try again.",
      ),
    [optimistic],
  );

  // Click analytics are best-effort — never interrupt the user over them.
  const trackClick = useCallback(async (id) => {
    try {
      await notificationApi.trackClick(id);
    } catch {
      // ignore
    }
  }, []);

  // Shared click handler for the dropdown and the inbox: navigate first so
  // the UI feels instant, record click + read in the background.
  const openNotification = useCallback(
    (notification, navigate) => {
      followNotificationTarget(notification.target, navigate);
      trackClick(notification.id);
      markRead(notification.id);
    },
    [markRead, trackClick],
  );

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      markRead,
      markAllRead,
      trackClick,
      dismiss,
      openNotification,
      fetchNotifications,
    }),
    [notifications, unreadCount, loading, error, markRead, markAllRead, trackClick, dismiss, openNotification, fetchNotifications],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
}
