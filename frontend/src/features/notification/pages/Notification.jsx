import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, BellOff, Check, CheckCheck, X } from "lucide-react";
import { useNotification } from "../../../context/NotificationContext.jsx";
import { formatNotificationTime, getNotificationMeta } from "../utils/notificationMeta.js";
import {
  AccountLayout,
  CARD,
  ErrorState,
  FLUSH_ON_PHONE,
  ListSkeleton,
  TabBar,
  btnSecondary,
} from "../../user/components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

export default function Notification() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead, openNotification, dismiss, fetchNotifications } =
    useNotification();
  const [filter, setFilter] = useState("all");

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => n.unread) : notifications),
    [filter, notifications],
  );

  const open = (notification) => openNotification(notification, navigate);

  return (
    <AccountLayout
      seoTitle="Notifications | Unideals"
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      actions={
        <button type="button" onClick={markAllRead} disabled={unreadCount === 0} className={btnSecondary}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all read
        </button>
      }
    >
      <TabBar
        className="mb-4"
        ariaLabel="Filter notifications"
        stretch
        tabs={[
          { value: "all", label: "All", count: notifications.length },
          { value: "unread", label: "Unread", count: unreadCount },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {loading && notifications.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : error && notifications.length === 0 ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : visible.length === 0 ? (
        <div className={cn(CARD, "flex flex-col items-center px-6 py-12 text-center")}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
            {filter === "unread" ? <CheckCheck className="h-6 w-6" aria-hidden="true" /> : <BellOff className="h-6 w-6" aria-hidden="true" />}
          </span>
          <h2 className="mt-3 text-[16px] font-semibold text-slate-900 dark:text-white">
            {filter === "unread" ? "No unread notifications" : "You're all caught up"}
          </h2>

        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
              <button type="button" onClick={fetchNotifications} className="font-semibold underline underline-offset-2">
                Retry
              </button>
            </p>
          )}
          <ul className={cn(CARD, FLUSH_ON_PHONE, "divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-800")}>
            {visible.map((n) => {
              const meta = getNotificationMeta(n);
              const Icon = meta.Icon;
              const banner = n.imageUrl;
              return (
                <li
                  key={n.id}
                  className={cn("group relative flex gap-3 px-4 py-4 transition-colors sm:px-5", n.unread ? "bg-[var(--accent-soft)]/40" : "hover:bg-neutral-50/70 dark:hover:bg-white/[0.02]")}
                >
                  <span className="relative mt-0.5 shrink-0">
                    <span className={cn("grid h-10 w-10 place-items-center rounded-xl", meta.tone)}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    {n.unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-2 ring-white dark:ring-[#1A1D20]" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => open(n)} className="block w-full pr-8 text-left">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("min-w-0 truncate text-[14.5px] text-slate-900 dark:text-white", n.unread ? "font-semibold" : "font-medium")}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[12px] text-slate-400 dark:text-zinc-500">
                          {formatNotificationTime(n.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-slate-600 dark:text-zinc-300">
                        {n.description}
                      </span>
                    </button>

                    {banner && (
                      <div className="mt-2.5 max-w-md overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <img src={banner} alt="" loading="lazy" className="h-32 w-full object-cover" />
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[11.5px] font-medium text-slate-400 dark:text-zinc-500">
                        {meta.label}
                        {n.count > 1 && ` · ${n.count}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline"
                      >
                        {n.actionLabel}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      {n.unread && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    aria-label="Dismiss notification"
                    className="absolute right-2.5 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-neutral-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AccountLayout>
  );
}