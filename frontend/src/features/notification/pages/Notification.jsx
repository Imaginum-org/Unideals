import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  CheckCheck,
  ArrowUpRight,
  Check,
  MessageSquare,
  Package,
  Tag,
  Bell,
  Megaphone,
} from "lucide-react";

import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";
import { notificationApi } from "../api/notificationApi.js";
import { initialNotifications } from "../data/notifications.js";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";
const socketURL = baseURL.replace(/\/api\/?$/, "") || undefined;

// Resolve icon and style by notification type
const getNotificationTypeMeta = (type = "") => {
  const norm = String(type).toUpperCase();
  if (norm.includes("OFFER") || norm.includes("PROMOTION")) {
    return {
      Icon: Tag,
      iconColor: "text-amber-500",
      dotColor: "bg-amber-500",
      badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      displayType: "OFFER / PROMO",
    };
  }
  if (norm.includes("MESSAGE")) {
    return {
      Icon: MessageSquare,
      iconColor: "text-sky-500",
      dotColor: "bg-sky-500",
      badgeBg: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
      displayType: "DIRECT MESSAGE",
    };
  }
  if (norm.includes("ORDER")) {
    return {
      Icon: Package,
      iconColor: "text-emerald-500",
      dotColor: "bg-emerald-500",
      badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      displayType: "ORDER UPDATE",
    };
  }
  if (norm.includes("ANNOUNCE")) {
    return {
      Icon: Megaphone,
      iconColor: "text-indigo-500",
      dotColor: "bg-indigo-500",
      badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
      displayType: "ANNOUNCEMENT",
    };
  }
  return {
    Icon: Bell,
    iconColor: "text-slate-500",
    dotColor: "bg-slate-500",
    badgeBg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    displayType: "GENERAL",
  };
};

export default function Notification() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from backend on mount
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await notificationApi.getNotifications();
        if (mounted && res?.data) {
          setNotifications(res.data);
          return;
        }
      } catch {
        // Fallback to sample items if backend request fails / offline
        if (mounted) {
          setNotifications(initialNotifications);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNotifications();

    // Listen to real-time notification pushes via Socket.IO
    let socket;
    try {
      socket = io(socketURL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socket.on("notification:new", (newNotif) => {
        setNotifications((prev) => [
          {
            ...newNotif,
            id: newNotif.id || newNotif._id,
            unread: true,
            time: "Just now",
          },
          ...prev,
        ]);
      });
    } catch {
      // socket is best effort
    }

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const markRead = async (id) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    try {
      await notificationApi.markRead(id);
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setNotifications((current) =>
      current.map((n) => ({ ...n, unread: false }))
    );
    try {
      await notificationApi.markAllRead();
    } catch {
      // ignore
    }
  };

  const openNotification = async (notification) => {
    try {
      await notificationApi.trackClick(notification.id);
    } catch {
      // ignore
    }
    await markRead(notification.id);
    const targetPath =
      notification.actionPath || notification.action_url || "/deals";
    navigate(targetPath);
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#F7F8FA] font-figtree dark:bg-[#131313]">
      <div className="flex h-[calc(100vh-70px)]">
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2 xl:pb-0">
          <Profile_left_part />
        </div>

        <main className="h-full overflow-y-auto bg-[#F7F8FA] px-5 py-6 dark:bg-[#131313] md:flex-1 xl:px-[5.7rem]">
          <div className="mx-auto w-full max-w-4xl pb-10">
            <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mb-1 text-[1.4rem] font-bold text-gray-900 dark:text-white lg:text-2xl xl:text-xl">
                  Notifications
                </h1>
                <p className="text-[13px] font-semibold text-[#9AA3B2] dark:text-gray-400">
                  Stay updated with campus offers, deals, transactions, and direct messages
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-extrabold text-[#4A3CFF] transition hover:bg-[#EEEFFF] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-indigo-950/40"
                >
                  <CheckCheck size={18} />
                  Mark all read
                </button>
              </div>
            </header>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E6EF] bg-[#F7F8FA] p-10 text-center dark:border-gray-800 dark:bg-[#1c1c1c]">
                <p className="text-4xl">🎉</p>
                <h2 className="mt-3 text-base font-bold text-[#09111F] dark:text-white">
                  You&apos;re caught up
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[#9AA3B2]">
                  New announcements, messages, order updates, and campus offers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => {
                  const meta = getNotificationTypeMeta(notification.type);
                  const Icon = meta.Icon;
                  const bannerImage =
                    notification.imageUrl || notification.image_url;

                  return (
                    <article
                      key={notification.id || notification._id}
                      className={`rounded-2xl border p-4 shadow-[0_10px_26px_rgba(15,23,42,0.055)] transition dark:bg-[#1c1c1c] ${
                        notification.unread
                          ? "border-[#DEDFFC] bg-[#F7F7FF] dark:border-indigo-900/60 dark:bg-indigo-950/20"
                          : "border-[#E2E6EF] bg-[#F7F8FA] dark:border-gray-800"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                        <div className="flex items-center gap-3">
                          <Icon
                            size={22}
                            strokeWidth={1.8}
                            className={meta.iconColor}
                          />
                          {notification.unread && (
                            <span
                              className={`h-2 w-2 rounded-full ${meta.dotColor}`}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2.5 py-0.5 text-[10px] font-black tracking-wider ${meta.badgeBg}`}
                            >
                              {meta.displayType}
                            </span>
                            <h2 className="text-[15px] font-extrabold text-[#09111F] dark:text-white">
                              {notification.title}
                            </h2>
                          </div>

                          <p className="mt-2.5 max-w-3xl text-[13px] font-medium leading-6 text-[#09111F] dark:text-slate-200">
                            {notification.message || notification.description}
                          </p>

                          {/* Attached Banner Image Preview */}
                          {bannerImage && (
                            <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800">
                              <img
                                src={bannerImage}
                                alt="Offer Banner"
                                className="h-32 w-full object-cover"
                              />
                            </div>
                          )}

                          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() => openNotification(notification)}
                              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-[#4A3CFF] px-4 text-[13px] font-extrabold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-[#3832E8] sm:w-auto"
                            >
                              {notification.actionLabel ||
                                notification.action_label ||
                                "View Offers"}
                              <ArrowUpRight size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => markRead(notification.id)}
                              disabled={!notification.unread}
                              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-[#F7F8FA] px-4 text-[13px] font-bold text-[#09111F] transition hover:border-[#4A3CFF] hover:text-[#4A3CFF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-[#1c1c1c] dark:text-white sm:w-auto"
                            >
                              <Check size={14} />
                              {notification.unread ? "Mark as read" : "Read"}
                            </button>
                          </div>
                        </div>

                        <p className="text-[12px] font-bold text-[#9AA3B2] dark:text-gray-400 sm:text-right">
                          {notification.time}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
