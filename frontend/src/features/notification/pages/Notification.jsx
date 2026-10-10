import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCheck,
  ArrowUpRight,
  Check,
} from "lucide-react";

import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";
import {
  READ_KEY,
  SAMPLES_CLEARED_KEY,
  initialNotifications,
  readStoredIds,
} from "../data/notifications.js";

export default function Notification() {
  const navigate = useNavigate();
  const [samplesCleared, setSamplesCleared] = useState(() => {
    try {
      return localStorage.getItem(SAMPLES_CLEARED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [notifications, setNotifications] = useState(() => {
    const readIds = readStoredIds();
    return initialNotifications.map((n) =>
      readIds.has(n.id) ? { ...n, unread: false } : n,
    );
  });

  // Persist read state so refreshes keep what's been seen.
  useEffect(() => {
    try {
      const readIds = notifications
        .filter((n) => !n.unread)
        .map((n) => n.id);
      localStorage.setItem(READ_KEY, JSON.stringify(readIds));
    } catch {
      // private mode — in-memory state still works for the session
    }
  }, [notifications]);

  const visible = useMemo(
    () => (samplesCleared ? [] : notifications),
    [samplesCleared, notifications],
  );

  const unreadCount = useMemo(
    () => visible.filter((notification) => notification.unread).length,
    [visible],
  );

  const markRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification,
      ),
    );
  };

  const markAllRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false })),
    );
  };

  const openNotification = (notification) => {
    markRead(notification.id);
    navigate(notification.actionPath);
  };

  const handleClearSamples = () => {
    try {
      localStorage.setItem(SAMPLES_CLEARED_KEY, "true");
    } catch {
      // ignore
    }
    setSamplesCleared(true);
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
                  Stay updated with transactions, messages, and your onboarding
                  guides
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!samplesCleared && (
                  <button
                    type="button"
                    onClick={handleClearSamples}
                    className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-[13px] font-bold text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Clear samples
                  </button>
                )}
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-extrabold text-[#4A3CFF] transition hover:bg-[#EEEFFF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck size={18} />
                  Mark all read
                </button>
              </div>
            </header>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E6EF] bg-[#F7F8FA] p-10 text-center dark:border-gray-800 dark:bg-[#1c1c1c]">
                <p className="text-4xl">🎉</p>
                <h2 className="mt-3 text-base font-bold text-[#09111F] dark:text-white">
                  You&apos;re caught up
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[#9AA3B2]">
                  New messages, order updates, and price drops will appear
                  here. Manage notification preferences in Settings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visible.map((notification) => {
                  const Icon = notification.icon;

                  return (
                    <article
                      key={notification.id}
                      className={`rounded-2xl border p-4 shadow-[0_10px_26px_rgba(15,23,42,0.055)] transition dark:bg-[#1c1c1c] ${
                        notification.unread
                          ? "border-[#DEDFFC] bg-[#F7F7FF]"
                          : "border-[#E2E6EF] bg-[#F7F8FA] dark:border-gray-800"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                        <div className="flex items-center gap-3">
                          <Icon
                            size={22}
                            strokeWidth={1.8}
                            className={notification.iconColor}
                          />
                          {notification.unread && (
                            <span
                              className={`h-2 w-2 rounded-full ${notification.dotColor}`}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-[#EEF0F5] px-3 py-1 text-[10px] font-black tracking-wide text-[#9AA3B2] dark:bg-[#262626] dark:text-gray-300">
                              {notification.type}
                            </span>
                            <span className="rounded-md bg-amber-100 px-2 py-1 text-[9px] font-black tracking-wide text-amber-700">
                              Preview
                            </span>
                            <h2 className="text-[15px] font-extrabold text-[#09111F] dark:text-white">
                              {notification.title}
                            </h2>
                          </div>

                          <p className="mt-3 max-w-3xl text-[13px] font-medium leading-6 text-[#09111F] dark:text-white">
                            {notification.description}
                          </p>

                          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() => openNotification(notification)}
                              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-[#4A3CFF] px-4 text-[13px] font-extrabold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-[#3832E8] sm:w-auto"
                            >
                              {notification.actionLabel}
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
