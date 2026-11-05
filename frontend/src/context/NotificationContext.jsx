import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { io } from "socket.io-client";
import { notificationApi } from "../features/notification/api/notificationApi.js";
import { useUser } from "./useUserContext.jsx";
import { toast } from "../components/ui/toast.js";

const NotificationContext = createContext(null);

const baseURL = import.meta.env.VITE_API_BASE_URL || "";
const socketURL = baseURL.replace(/\/api\/?$/, "") || undefined;

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
        actionPath: n.actionPath || n.action_url || "/notification",
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

    const socket = io(socketURL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", fetchNotifications);
    socket.on("connect_error", (socketError) => {
      console.error("Notification realtime connection failed:", socketError);
    });
    socket.on("notification:new", (item) => {
      if (!mountedRef.current || !item) return;

      const id = item.id || item._id;
      if (!id || notificationIdsRef.current.has(String(id))) return;
      notificationIdsRef.current.add(String(id));

      const newItem = {
        id,
        title: item.title || "New Notification",
        description: item.description || item.message || "",
        time: "Just now",
        actionPath: item.actionPath || item.action_url || "/notification",
        unread: true,
        type: item.type,
        imageUrl: item.imageUrl || item.image_url,
        actionLabel: item.actionLabel || item.action_label,
        _id: item._id || id,
        createdAt: item.createdAt || new Date().toISOString(),
      };
      setNotifications((current) => [newItem, ...current].slice(0, 100));
      toast(newItem.title);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
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
    } catch (requestError) {
      console.error("Failed to track notification click:", requestError);
      toast.error("Could not record this notification action.");
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

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    trackClick,
    dismiss,
    fetchNotifications,
  };

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