import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCheck,
  MessageSquare,
  Package,
  Tag,
  ArrowUpRight,
  Check,
} from "lucide-react";

import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";

const initialNotifications = [
  {
    id: 1,
    type: "DIRECT MESSAGE",
    title: "New Message from Rahul",
    description:
      'Rahul sent you a message about MacBook Pro: "Hey, is the battery cycle count under 100?"',
    time: "2 hours ago",
    icon: MessageSquare,
    iconColor: "text-[#1688D8]",
    dotColor: "bg-[#5B50F5]",
    actionLabel: "Reply in Chat",
    actionPath: "/chat",
    unread: true,
  },
  {
    id: 2,
    type: "ORDER UPDATE",
    title: "Order Completed Successfully",
    description:
      "Your Dell XPS 15 has been delivered to Anurag. Check your balance.",
    time: "Yesterday",
    icon: Package,
    iconColor: "text-[#10B981]",
    dotColor: "bg-[#10B981]",
    actionLabel: "View Order Details",
    actionPath: "/myorders",
    unread: false,
  },
  {
    id: 3,
    type: "WISHLIST ALERT",
    title: "Price Drop Alert",
    description:
      "Sony WH-1000XM4 on your wishlist dropped by ₹1,500. Buy it now before it goes out of stock!",
    time: "3 days ago",
    icon: Tag,
    iconColor: "text-[#F59E0B]",
    dotColor: "bg-[#F59E0B]",
    actionLabel: "Buy Now",
    actionPath: "/wishlist",
    unread: false,
  },
];

export default function Notification() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
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

  return (
    <div className="h-screen w-full overflow-hidden bg-[#F7F8FC] font-figtree dark:bg-[#131313]">
      <div className="flex h-[calc(100vh-70px)]">
        <aside className="hidden bg-white dark:bg-[#131313] md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%]">
          <Profile_left_part />
        </aside>

        <main className="h-full overflow-y-auto bg-[#F7F8FC] px-5 py-6 dark:bg-[#131313] md:w-[77.5%] lg:w-[79%] xl:w-[79.5%] xl:px-[5.7rem] 2xl:w-[79.5%]">
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

              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-extrabold text-[#4A3CFF] transition hover:bg-[#EEEFFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck size={18} />
                Mark all read
              </button>
            </header>

            <div className="space-y-4">
              {notifications.map((notification) => {
                const Icon = notification.icon;

                return (
                  <article
                    key={notification.id}
                    className={`rounded-2xl border p-4 shadow-[0_10px_26px_rgba(15,23,42,0.055)] transition dark:bg-[#1c1c1c] ${
                      notification.unread
                        ? "border-[#DEDFFC] bg-[#F7F7FF]"
                        : "border-[#E2E6EF] bg-white dark:border-gray-800"
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
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-md bg-[#EEF0F5] px-3 py-1 text-[10px] font-black tracking-wide text-[#9AA3B2] dark:bg-[#262626] dark:text-gray-300">
                            {notification.type}
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
                            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2E6EF] bg-white px-4 text-[13px] font-bold text-[#09111F] transition hover:border-[#4A3CFF] hover:text-[#4A3CFF] disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-[#1c1c1c] dark:text-white sm:w-auto"
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
          </div>
        </main>
      </div>
    </div>
  );
}
