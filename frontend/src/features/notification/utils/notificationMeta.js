import { Bell, Megaphone, MessageSquare, Package, ShieldAlert, Tag, TrendingDown } from "lucide-react";

// One place that maps a notification to its icon, colours and label, shared
// by the header dropdown and the /notification inbox.
//   tone      -> filled tile used in the inbox
//   iconColor -> bare icon colour used in the dropdown
//   dotColor  -> unread dot in the dropdown
const META = {
  message: {
    Icon: MessageSquare,
    label: "Message",
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
    iconColor: "text-sky-500",
    dotColor: "bg-sky-500",
  },
  order: {
    Icon: Package,
    label: "Order",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    iconColor: "text-emerald-500",
    dotColor: "bg-emerald-500",
  },
  price_drop: {
    Icon: TrendingDown,
    label: "Price alert",
    tone: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300",
    iconColor: "text-orange-500",
    dotColor: "bg-orange-500",
  },
  promotion: {
    Icon: Tag,
    label: "Offer",
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-500",
  },
  announcement: {
    Icon: Megaphone,
    label: "Announcement",
    tone: "bg-[var(--accent-soft)] text-[var(--accent-text)]",
    iconColor: "text-indigo-500",
    dotColor: "bg-indigo-500",
  },
  moderation: {
    Icon: ShieldAlert,
    label: "Moderation",
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
    iconColor: "text-rose-500",
    dotColor: "bg-rose-500",
  },
  general: {
    Icon: Bell,
    label: "Update",
    tone: "bg-neutral-100 text-slate-600 dark:bg-white/5 dark:text-zinc-300",
    iconColor: "text-slate-500",
    dotColor: "bg-slate-500",
  },
};

// Older API responses only carry the display `type` ("ORDER UPDATE",
// "OFFER / PROMO"...); newer ones also send the raw `kind`.
const kindFromLabel = (type = "") => {
  const t = String(type).toUpperCase();
  if (t.includes("MESSAGE")) return "message";
  if (t.includes("ORDER")) return "order";
  if (t.includes("PRICE") || t.includes("WISHLIST")) return "price_drop";
  if (t.includes("OFFER") || t.includes("PROMO")) return "promotion";
  if (t.includes("ANNOUNCE")) return "announcement";
  if (t.includes("MODERAT") || t.includes("FLAG")) return "moderation";
  return "general";
};

export const getNotificationMeta = (notification = {}) =>
  META[notification.kind] || META[kindFromLabel(notification.type)] || META.general;

// Computed at render time from createdAt, so "Just now" doesn't stay frozen
// on an item that arrived over the socket an hour ago.
export const formatNotificationTime = (createdAt) => {
  if (!createdAt) return "Just now";
  const diffSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (!Number.isFinite(diffSec) || diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// Links come from the server (incl. admin campaigns). In-app paths navigate
// in the SPA; https links open in a new tab; anything else (javascript:,
// protocol-relative "//host", data:) falls back to the inbox.
export const resolveNotificationTarget = (value, fallback = "/notification") => {
  if (typeof value === "string") {
    const v = value.trim();
    if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return { path: v };
    try {
      const url = new URL(v);
      if (url.protocol === "https:") return { href: url.toString() };
    } catch {
      // fall through
    }
  }
  return { path: fallback };
};

export const followNotificationTarget = (target, navigate) => {
  if (target?.href) window.open(target.href, "_blank", "noopener,noreferrer");
  else navigate(target?.path || "/notification");
};
