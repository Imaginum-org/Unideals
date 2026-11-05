import { MessageSquare, Package, Tag } from "lucide-react";

export const READ_KEY = "unideals-notifications-read";
export const SAMPLES_CLEARED_KEY = "unideals-notifications-samples-cleared";

export const initialNotifications = [
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

export const readStoredIds = () => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const samplesCleared = () => {
  try {
    return localStorage.getItem(SAMPLES_CLEARED_KEY) === "true";
  } catch {
    return false;
  }
};

export const persistReadState = (list) => {
  try {
    const readIds = list.filter((n) => !n.unread).map((n) => n.id);
    localStorage.setItem(READ_KEY, JSON.stringify(readIds));
  } catch {
    // private mode — in-memory state still works for the session
  }
};

/** Full list with persisted read state applied (empty when cleared). */
export const loadNotifications = () => {
  if (samplesCleared()) return [];
  const readIds = readStoredIds();
  return initialNotifications.map((n) =>
    readIds.has(n.id) ? { ...n, unread: false } : n,
  );
};

export const markStoredRead = (id) => {
  const ids = readStoredIds();
  ids.add(id);
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
};

export const markStoredAllRead = () => {
  try {
    localStorage.setItem(
      READ_KEY,
      JSON.stringify(initialNotifications.map((n) => n.id)),
    );
  } catch {
    // ignore
  }
};

export const unreadCountOf = (list) => list.filter((n) => n.unread).length;

/** Unread first, stable order — for dropdown previews. */
export const latestFirst = (list) =>
  [...list].sort((a, b) => Number(b.unread) - Number(a.unread));
