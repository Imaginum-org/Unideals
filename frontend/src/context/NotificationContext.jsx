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
import { useUser } from "./useUserContext.jsx";
import { toast } from "../components/ui/toast.js";
import { acquireSocket, releaseSocket } from "../services/realtime.js";

const NotificationContext = createContext(null);

// Notification links come from the server (incl. admin campaigns). Only
// in-app paths are navigated to; anything else (absolute URLs,
// protocol-relative "//host", javascript:) falls back to the inbox.
// eslint-disable-next-line react-refresh/only-export-components
export const safeActionPath = (value, fallback = "/notification") => {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return v;
  return fallback;
};

// eslint-disable-next-line react/prop-types
export function NotificationProvider({ children }) {
  const { isLoggedIn, loading: userLoading } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const mountedRef = useRef(true);
  const notificationIdsRef = useRef(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await notificationApi.getNotifications();
      const items = (res.data?.data || []).map((n) => ({
        id: n.id || n._id,
        title: n.title,
        description: n.message || n.description,
        time: n.time || "Just now",
        actionPath: safeActionPath(n.actionPath || n.action_url),
        unread: Boolean(n.unread),
        type: n.type,
        imageUrl: n.imageUrl || n.image_url,
        actionLabel: n.actionLabel || n.action_label,
        _id: n._id,
        createdAt: n.createdAt,
      }));
      if (mountedRef.current) {
        notificationIdsRef.current = new Set(items.map((item) => String(item.id)));
        setNotifications(items);
        setError("");
      }
    } catch (fetchError) {
      console.error("Failed to load notifications:", fetchError);
      if (mountedRef.current) {
        setError("Notifications could not be loaded. Please try again.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (userLoading) return undefined;

    mountedRef.current = true;
    if (!isLoggedIn) {
      notificationIdsRef.current.clear();
      setNotifications([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    fetchNotifications();
    // Throttled re-sync: the socket "connect" event fires right after the
    // mount fetch (double request on every page load), and every tab switch
    // refetched. Live items arrive via "notification:new"; a re-sync is only
    // needed after a real gap, so skip it if we synced < 30s ago.
    let lastSync = Date.now();
    const resync = () => {
      if (Date.now() - lastSync < 30000) return;
      lastSync = Date.now();
      fetchNotifications();
    };

    const socket = acquireSocket();
    socketRef.current = socket;

    const onConnectError = (socketError) => {
      console.error("Notification realtime connection failed:", socketError?.message);
    };
    const onNotification = (item) => {
      if (!mountedRef.current || !item) return;

      const id = item.id || item._id;
      if (!id || notificationIdsRef.current.has(String(id))) return;
      notificationIdsRef.current.add(String(id));

      const newItem = {
        id,
        title: item.title || "New Notification",
        description: item.description || item.message || "",
        time: "Just now",
        actionPath: safeActionPath(item.actionPath || item.action_url),
        unread: true,
        type: item.type,
        imageUrl: item.imageUrl || item.image_url,
        actionLabel: item.actionLabel || item.action_label,
        _id: item._id || id,
        createdAt: item.createdAt || new Date().toISOString(),
      };
      setNotifications((current) => [newItem, ...current].slice(0, 100));
      toast(newItem.title);
    };
    socket.on("connect", resync);
    socket.on("connect_error", onConnectError);
    socket.on("notification:new", onNotification);

    const handleVisibilityChange = () => {
      if (!document.hidden) resync();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket.off("connect", resync);
      socket.off("connect_error", onConnectError);
      socket.off("notification:new", onNotification);
      if (socketRef.current === socket) socketRef.current = null;
      releaseSocket(socket);
    };
  }, [fetchNotifications, isLoggedIn, userLoading]);

  const markRead = useCallback(async (id) => {
    const currentNotification = notifications.find((notification) => notification.id === id);
    if (!currentNotification?.unread) return;
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    try {
      await notificationApi.markRead(id);
    } catch (requestError) {
      console.error("Failed to mark notification as read:", requestError);
      toast.error("Could not update this notification. Refresh and try again.");
      await fetchNotifications();
    }
  }, [fetchNotifications, notifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, unread: false })));
    try {
      await notificationApi.markAllRead();
    } catch (requestError) {
      console.error("Failed to mark all notifications as read:", requestError);
      toast.error("Could not update your notifications. Refresh and try again.");
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const trackClick = useCallback(async (id) => {
    try {
      await notificationApi.trackClick(id);
    } catch {
      // Click analytics are best-effort — never interrupt the user with an
      // error toast for a background tracking call.
    }
  }, []);

  const dismiss = useCallback(async (id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    notificationIdsRef.current.delete(String(id));
    try {
      await notificationApi.dismiss(id);
    } catch (requestError) {
      console.error("Failed to dismiss notification:", requestError);
      toast.error("Could not dismiss this notification. Please try again.");
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  // Memoized: a fresh object every render re-rendered every consumer
  // (Header, inbox page) on any provider render.
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
      fetchNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      markRead,
      markAllRead,
      trackClick,
      dismiss,
      fetchNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}