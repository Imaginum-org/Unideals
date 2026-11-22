import {
  ArrowLeftRight,
  BookOpen,
  Dumbbell,
  Gift,
  HandHeart,
  IndianRupee,
  Laptop,
  Package,
  PackageOpen,
  Plug,
  Search,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

// Mirrors backend/src/config/rent.js.
export const RENT_CATEGORIES = [
  { value: "sports", label: "Sports", Icon: Dumbbell },
  { value: "kitchen", label: "Kitchen", Icon: UtensilsCrossed },
  { value: "appliances", label: "Appliances", Icon: Plug },
  { value: "electronics", label: "Electronics", Icon: Laptop },
  { value: "study", label: "Study", Icon: BookOpen },
  { value: "food", label: "Food & snacks", Icon: Soup },
  { value: "other", label: "Other", Icon: Package },
];

export const categoryOf = (value) => RENT_CATEGORIES.find((c) => c.value === value) || RENT_CATEGORIES.at(-1);

/*
 * Listing types in the create form. The API stores two modes: lend (comes
 * back) and share (used up / kept). "Rent" and "Lend" are both mode lend,
 * told apart by the price: Rent is paid, Lend is free. "Give away" is share.
 */
export const INTENT_OPTIONS = [
  { value: "offer", label: "I have something to offer", description: "Rent it out, lend it or give it away", Icon: PackageOpen },
  { value: "request", label: "I'm looking for something", description: "Ask around; people in your block get a ping", Icon: Search },
];

export const LISTING_TYPES = {
  offer: [
    { value: "rent", label: "Rent", description: "Paid usage, item comes back", Icon: IndianRupee },
    { value: "lend", label: "Lend", description: "Free usage, item comes back", Icon: ArrowLeftRight },
    { value: "give", label: "Give away", description: "Handed over for good", Icon: Gift },
  ],
  request: [
    { value: "rent", label: "Rent it", description: "You pay to use it, then return it", Icon: IndianRupee },
    { value: "lend", label: "Borrow for free", description: "A favour; you return it after use", Icon: HandHeart },
    { value: "give", label: "Get to keep", description: "Snacks, Maggie or anything used up", Icon: Gift },
  ],
};

/** "rent" | "lend" | "give" for a saved post. */
export const listingTypeOf = (post) =>
  post?.mode === "share" ? "give" : !post?.price?.amount || post?.price?.unit === "free" ? "lend" : "rent";

/** Short badge for board cards and the detail page. */
export const listingBadge = (post) =>
  post?.kind === "request" ? "Needed" : { rent: "Rent", lend: "Lend", give: "Give away" }[listingTypeOf(post)];

export const CONDITION_OPTIONS = [
  { value: "new", label: "Brand new", hint: "Unused" },
  { value: "like_new", label: "Like new", hint: "No marks" },
  { value: "good", label: "Good", hint: "Light wear" },
  { value: "fair", label: "Fair", hint: "Works, shows wear" },
];
export const conditionLabel = (value) => CONDITION_OPTIONS.find((c) => c.value === value)?.label || "";

export const PICKUP_SPOTS = ["Block lobby", "Hostel gate", "Main gate", "Mess", "Library", "Sports complex"];
export const HANDOVER_TIMES = ["Anytime", "Mornings", "Afternoons", "Evenings", "After 9 PM", "Weekends"];
export const RETURN_POLICY_PRESETS = [
  "Return it clean.",
  "Same condition as handed over.",
  "Message me if you'll be late.",
  "Deposit back on return.",
];

const UNIT_SUFFIX = { hour: "/hr", day: "/day", use: "/use", item: " each" };

/** Price split for big displays: { free, amount: "₹30", unit: "/day" }. */
export const priceParts = (price) => {
  if (!price || !price.amount || price.unit === "free") return { free: true, amount: "Free", unit: "" };
  return { free: false, amount: `₹${Number(price.amount).toLocaleString("en-IN")}`, unit: UNIT_SUFFIX[price.unit] || "" };
};

export const TYPE_LABELS = { rent: "Rent", lend: "Lend", give: "Give away" };

/** "₹30/day", "₹15 each", "Free". */
export const formatPrice = (price) => {
  if (!price || !price.amount || price.unit === "free") return "Free";
  return `₹${Number(price.amount).toLocaleString("en-IN")}${UNIT_SUFFIX[price.unit] || ""}`;
};

export const formatRupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const BOOKING_STATUS_LABELS = {
  pending: "Waiting for reply",
  accepted: "Accepted",
  active: "With borrower",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const BOOKING_STATUS_TONES = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  accepted: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  active: "bg-[var(--accent-soft)] text-[var(--accent-text)]",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  declined: "bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400",
  cancelled: "bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400",
  expired: "bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400",
};

export const POST_STATUS_LABELS = {
  active: "Live",
  paused: "Paused",
  lent_out: "Lent out",
  fulfilled: "Done",
  expired: "Expired",
  hidden: "Hidden for review",
};

/** "in 3h", "in 25m", "2h ago". */
export const relativeTime = (date, now = Date.now()) => {
  if (!date) return "";
  const diff = new Date(date).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const text = mins < 60 ? `${Math.max(1, mins)}m` : mins < 48 * 60 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
};

export const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "";

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Value for <input type="date"> in local time. */
export const toDateInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
