/**
 * Rent & Borrow — students lend or share small things inside their campus
 * (a racket, an iron, a packet of Maggie) or post what they need right now.
 * Money changes hands offline (UPI/cash); the app only runs the
 * request → accept → handover → return flow.
 *
 * The whole feature lives in its own collections (rentposts, rentbookings,
 * rentprofiles, rentcampusconfigs) and is off unless RENT_ENABLED=true.
 * See docs/features/rent-and-borrow.md (incl. how to remove it).
 */

/** Global kill switch. Off by default so a deploy never turns it on by accident. */
export const isRentEnabled = () => String(process.env.RENT_ENABLED || "").trim().toLowerCase() === "true";

// "I have it" vs "I need it".
export const RENT_KIND = Object.freeze({ OFFER: "offer", REQUEST: "request" });

// lend = the item comes back; share = it gets used up (Maggie, snacks).
export const RENT_MODE = Object.freeze({ LEND: "lend", SHARE: "share" });

export const RENT_PRICE_UNITS = Object.freeze(["hour", "day", "use", "item", "free"]);

export const RENT_CATEGORIES = Object.freeze([
  "sports",
  "kitchen",
  "appliances",
  "electronics",
  "study",
  "food",
  "other",
]);

// Offers only, optional. Consumables (food) don't need one.
export const RENT_CONDITIONS = Object.freeze(["new", "like_new", "good", "fair"]);

export const RENT_POST_STATUS = Object.freeze({
  ACTIVE: "active",
  PAUSED: "paused", // owner hid it for now
  LENT_OUT: "lent_out", // lend offer with an accepted/active booking
  FULFILLED: "fulfilled", // request matched, or share stock used up
  EXPIRED: "expired", // request past needed_by, or offer past available_until
  HIDDEN: "hidden", // reports or staff
  DELETED: "deleted",
});

// Statuses a viewer can see on the board.
export const RENT_VISIBLE_STATUSES = Object.freeze([RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.LENT_OUT]);

// pending → accepted → active (lend: item handed over) → completed
// share:   pending → accepted → completed (handover is the end)
export const RENT_BOOKING_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  ACTIVE: "active",
  COMPLETED: "completed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

export const RENT_OPEN_BOOKING_STATUSES = Object.freeze([
  RENT_BOOKING_STATUS.PENDING,
  RENT_BOOKING_STATUS.ACCEPTED,
  RENT_BOOKING_STATUS.ACTIVE,
]);

export const RENT_LIMITS = Object.freeze({
  activeRequests: 3, // per user
  activeOffers: 10, // per user
  postsPerHour: 5, // per user
  openBookingsPerUser: 10,
  requestDefaultHours: 6,
  requestMaxHours: 48,
  lendMaxDays: 14,
  pendingBookingHours: 12, // unanswered booking requests expire
  messagesPerBooking: 50,
  messageLength: 300,
  alertRecipientsCap: 300,
  alertsPerRecipientPerHour: 6,
  messageNotifyCooldownMs: 10 * 60 * 1000,
  reportsToHide: 3,
  maxBlocks: 80,
  blockLength: 40,
  maxPrice: 5000,
  maxDeposit: 20000,
  maxQuantity: 20,
  pageSize: 20,
  availableMaxDays: 90, // offers: "available until" at most this far ahead
  handoverSpotLength: 60,
  handoverTimingLength: 80,
  returnPolicyLength: 200,
  handoverNotesLength: 300,
});

// Never on the board, whatever the price.
export const RENT_BANNED_RE =
  /\b(alcohol|beer|vodka|whisk(?:e)?y|rum|wine|liquor|daru|cigarettes?|cigars?|vapes?|tobacco|gutkha|weed|ganja|marijuana|drugs?|cocaine|lsd|mdma|prescription|medicines?|pills?|guns?|pistols?)\b/i;

// Phone numbers and room-level detail stay in the private booking chat.
export const RENT_UNSAFE_TEXT_RE = /(?:\+?91[\s-]?)?\b\d{10}\b|\broom\s*(?:no\.?|number|#)?\s*\d+|\bflat\s*(?:no\.?)?\s*\d+|house\s*no|door\s*no/i;
