import { useNavigate } from "react-router-dom";
import {
  CheckCheck,
  ArrowUpRight,
  Check,
  MessageSquare,
  Package,
  Tag,
  Bell,
  Megaphone,
  ShieldAlert,
  X,
} from "lucide-react";

import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";
import { useNotification } from "../../../context/NotificationContext.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";

// Resolve icon and style by notification type
const getNotificationTypeMeta = (type = "") => {
  const norm = String(type).toUpperCase();
  if (norm.includes("OFFER") || norm.includes("PROMOTION") || norm.includes("PROMO")) {
    return {
      Icon: Tag,
      iconColor: "text-amber-500",
      dotColor: "bg-amber-500",
      badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      displayType: "OFFER / PROMO",
    };
  }
  if (norm.includes("WISHLIST") || norm.includes("PRICE")) {
    return {
      Icon: Tag,
      iconColor: "text-orange-500",
      dotColor: "bg-orange-500",
      badgeBg: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
      displayType: "WISHLIST ALERT",
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
  if (norm.includes("MODERAT") || norm.includes("REVIEW") || norm.includes("FLAG")) {
    return {
      Icon: ShieldAlert,
      iconColor: "text-rose-500",
      dotColor: "bg-rose-500",
      badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
      displayType: "MODERATION",
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
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    trackClick,
    dismiss,
    fetchNotifications,
  } = useNotification();

  const openNotification = async (notification) => {
    await trackClick(notification.id);
    await markRead(notification.id);
    const targetPath =
      notification.actionPath || notification.action_url || "/deals";
    navigate(targetPath);
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#F7F8FA] font-figtree dark:bg-[#131313]">
      <div className="flex md:h-[calc(100dvh-var(--header-h))]">
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2 xl:pb-0">
          <Profile_left_part />
        </div>

        <main className="min-w-0 w-full md:h-full md:overflow-y-auto bg-[#F7F8FA] px-4 py-5 sm:px-5 sm:py-6 dark:bg-[#131313] md:flex-1 xl:px-[5.7rem]">
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

            {error && (
              <div
                role="alert"
                className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="font-bold underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <BrandLoader size="full" />
            ) : error && notifications.length === 0 ? null : notifications.length === 0 ? (
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
              <ul className="divide-y divide-[#EEF0F4] overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#1A1D20]">
                {notifications.map((notification) => {
                  const meta = getNotificationTypeMeta(notification.type);
                  const Icon = meta.Icon;
                  const bannerImage =
                    notification.imageUrl || notification.image_url;
                  const unread = notification.unread;

                  return (
                    <li
                      key={notification.id || notification._id}
                      className={`relative flex gap-3 px-4 py-3.5 transition-colors sm:px-5 ${
                        unread ? "bg-[var(--accent-soft)]/50" : ""
                      }`}
                    >
                      {/* Type icon tile (+ unread dot) */}
                      <span className="relative mt-0.5 shrink-0">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F3F4F8] dark:bg-white/5">
                          <Icon size={19} strokeWidth={1.9} className={meta.iconColor} />
                        </span>
                        {unread && (
                          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#1A1D20] ${meta.dotColor}`} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Whole text block is the tap target, like any inbox */}
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className="block w-full pr-7 text-left"
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            <span
                              className={`min-w-0 truncate text-[14.5px] leading-5 text-[#09111F] dark:text-white ${
                                unread ? "font-bold" : "font-semibold"
                              }`}
                            >
                              {notification.title}
                            </span>
                            <span className="shrink-0 text-[11.5px] font-medium text-[#9AA3B2] dark:text-gray-500">
                              {notification.time}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-[#5B6474] dark:text-slate-300">
                            {notification.message || notification.description}
                          </span>
                          <span className={`mt-1.5 inline-block rounded px-1.5 py-px text-[9.5px] font-black tracking-wider ${meta.badgeBg}`}>
                            {meta.displayType}
                          </span>
                        </button>

                        {bannerImage && (
                          <div className="mt-2.5 max-w-md overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800">
                            <img src={bannerImage} alt="" loading="lazy" className="h-32 w-full object-cover" />
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => openNotification(notification)}
                            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--accent-text)]"
                          >
                            {notification.actionLabel || notification.action_label || "View"}
                            <ArrowUpRight size={13} />
                          </button>
                          {unread && (
                            <button
                              type="button"
                              onClick={() => markRead(notification.id)}
                              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#5B6474] hover:text-[#09111F] dark:text-zinc-400 dark:hover:text-white"
                            >
                              <Check size={13} />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => dismiss(notification.id)}
                        aria-label="Dismiss notification"
                        className="absolute right-2 top-2.5 grid h-8 w-8 place-items-center rounded-full text-[#9AA3B2] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
