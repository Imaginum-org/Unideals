export const USER_ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
  SUPPORT: "support",
});

export const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
});

export const PRODUCT_STATUS = Object.freeze({
  DRAFT: "draft",
  LISTED: "listed",
  SOLD: "sold",
  UNLISTED: "unlisted",
  BLOCKED: "blocked",
});

export const PRODUCT_CATEGORIES = Object.freeze({
  ELECTRONICS: "electronics",
  STUDY_MATERIAL: "study_material",
  HOSTEL_ESSENTIALS: "hostel_essentials",
  CLOTHING: "clothing",
  ACCESSORIES: "accessories",
  LAB_EQUIPMENT: "lab_equipment",
  SPORTS: "sports",
  FITNESS: "fitness",
  VEHICLES: "vehicles",
  EVENT_PASSES: "event_passes",
  OTHERS: "others",
});

export const PRODUCT_CONDITION = Object.freeze({
  BRAND_NEW: "brand_new",
  LIKE_NEW: "like_new",
  GENTLY_USED: "gently_used",
  WELL_USED: "well_used",
  FOR_PARTS_OR_NOT_WORKING: "for_parts_or_not_working",
});

export const PRODUCT_PAYMENT = Object.freeze({
  CASH: "cash",
  UPI: "upi",
  BOTH: "both",
});

export const PRODUCT_USAGE_DURATION = Object.freeze({
  LESS_THAN_1_MONTH: "less_than_1_month",
  ONE_TO_THREE_MONTHS: "one_to_three_months",
  THREE_TO_SIX_MONTHS: "three_to_six_months",
  SIX_TO_TWELVE_MONTHS: "six_to_twelve_months",
  ONE_TO_TWO_YEARS: "one_to_two_years",
  MORE_THAN_TWO_YEARS: "more_than_two_years",
});

export const DEAL_STATUS = Object.freeze({
  NEGOTIATING: "negotiating",
  OFFER_ACCEPTED: "offer_accepted",
  DEAL_CONFIRMED: "deal_confirmed",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PAYMENT_CONFIRMED: "payment_confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const REPORT_REASONS = Object.freeze({
  SPAM_OR_ADVERTISEMENT: "spam_or_advertisement",
  FAKE_OR_MISLEADING: "fake_or_misleading",
  INAPPROPRIATE_CONTENT: "inappropriate_content",
  FRAUD_OR_SCAM: "fraud_or_scam",
  PROHIBITED_ITEM: "prohibited_item",
  DUPLICATE_LISTING: "duplicate_listing",
  WRONG_CATEGORY: "wrong_category",
  SOLD_OR_UNAVAILABLE: "sold_or_unavailable",
  OTHER: "other",
});

export const REPORT_STATUS = Object.freeze({
  PENDING: "pending",
  ACTION_TAKEN: "action_taken",
  DISMISSED: "dismissed",
});

export const MESSAGE_TYPE = Object.freeze({
  TEXT: "text",
  OFFER: "offer",
  SYSTEM: "system",
  IMAGE: "image",
  FILE: "file",
});

export const CONVERSATION_ROLE = Object.freeze({
  BUYER: "buyer",
  SELLER: "seller",
});

export const OFFER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
});

export const MESSAGE_STATUS = Object.freeze({
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
});

export const USER_TIER = Object.freeze({
  BASE_USER: "base_user",
  PRO: "pro",
  PRO_PLUS: "pro_plus",
});

// UI Labels
export const PRODUCT_CATEGORY_LABELS = {
  electronics: "Electronics",
  study_material: "Study Material",
  hostel_essentials: "Hostel Essentials",
  clothing: "Clothing",
  accessories: "Accessories",
  lab_equipment: "Lab Equipment",
  sports: "Sports",
  fitness: "Fitness",
  vehicles: "Vehicles",
  event_passes: "Event Passes",
  others: "Others",
};

export const PRODUCT_CONDITION_LABELS = {
  brand_new: "Brand New",
  like_new: "Like New",
  gently_used: "Gently Used",
  well_used: "Well Used",
  for_parts_or_not_working: "For Parts or Not Working",
};

export const PRODUCT_PAYMENT_LABELS = {
  cash: "Cash",
  upi: "UPI",
  both: "Cash or UPI",
};

export const PRODUCT_USAGE_DURATION_LABELS = {
  less_than_1_month: "Less than 1 month",
  one_to_three_months: "1 - 3 months",
  three_to_six_months: "3 - 6 months",
  six_to_twelve_months: "6 - 12 months",
  one_to_two_years: "1 - 2 years",
  more_than_two_years: "More than 2 years",
};

export const PRODUCT_STATUS_LABELS = {
  listed: "Listed",
  sold: "Sold",
  unlisted: "Unlisted",
  blocked: "Blocked",
};

export const DEAL_STATUS_LABELS = {
  negotiating: "Negotiating",
  offer_accepted: "Offer Accepted",
  deal_confirmed: "Deal Confirmed",
  pickup_scheduled: "Pickup Scheduled",
  payment_confirmed: "Payment Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const REPORT_REASON_LABELS = {
  spam_or_advertisement: "Spam or Advertisement",
  fake_or_misleading: "Fake or Misleading Listing",
  inappropriate_content: "Inappropriate Content",
  fraud_or_scam: "Fraud or Scam",
  prohibited_item: "Prohibited Item",
  duplicate_listing: "Duplicate Listing",
  wrong_category: "Wrong Category",
  sold_or_unavailable: "Item Already Sold or Unavailable",
  other: "Other",
};

export const REPORT_STATUS_LABELS = {
  pending: "Pending",
  action_taken: "Action Taken",
  dismissed: "Dismissed",
};

export const USER_ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  support: "Support",
};

export const USER_STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export const MESSAGE_TYPE_LABELS = {
  text: "Text",
  offer: "Offer",
  system: "System",
};

export const CONVERSATION_ROLE_LABELS = {
  buyer: "Buyer",
  seller: "Seller",
};

export const OFFER_STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const MESSAGE_STATUS_LABELS = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

export const USER_TIER_LABELS = {
  base_user: "Base User",
  pro: "Pro",
  pro_plus: "Pro Plus",
};

// Helper methods
export const enumToArray = (enumObj) => Object.values(enumObj);

export const enumToOptions = (enumObj, labelsObj) =>
  Object.values(enumObj).map((value) => ({
    value,
    label: labelsObj[value],
  }));
