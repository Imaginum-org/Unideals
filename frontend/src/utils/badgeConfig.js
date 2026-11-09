// ─── Badge catalogue ─────────────────────────────────────────────────────────
// Each entry defines display metadata for a badge.
// badge_id must match exactly what the backend service uses.

export const BADGE_CATALOGUE = [
  // ── Seller ────────────────────────────────────────────────────────────────
  {
    id: "first_listing",
    category: "seller",
    name: "Freshers' Drop",
    description: "Listed your very first item on Unideals.",
    icon: "📦",
    color: { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" },
    tiers: [{ tier: "special", xp: 30, label: "Post your first listing" }],
  },
  {
    id: "power_seller",
    category: "seller",
    name: "Hostel Tycoon",
    description: "Sold a high volume of products, a true campus trader.",
    icon: "🏪",
    color: { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" },
    tiers: [
      { tier: "bronze", xp: 50,  label: "Sell 5 products" },
      { tier: "silver", xp: 100, label: "Sell 20 products" },
      { tier: "gold",   xp: 200, label: "Sell 50 products" },
    ],
  },
  {
    id: "top_rater",
    category: "seller",
    name: "Dean's List",
    description: "Consistently earned high ratings from buyers.",
    icon: "⭐",
    color: { bg: "#FFFBEB", accent: "#EAB308", text: "#713F12" },
    tiers: [
      { tier: "bronze", xp: 60,  label: "Average rating ≥ 4.0" },
      { tier: "silver", xp: 100, label: "Average rating ≥ 4.5" },
      { tier: "gold",   xp: 200, label: "Average rating ≥ 4.8" },
    ],
  },
  {
    id: "category_ace",
    category: "seller",
    name: "Major Declared",
    description: "Specialised in selling items from the same category.",
    icon: "🎯",
    color: { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E40AF" },
    tiers: [
      { tier: "bronze", xp: 40,  label: "3 items in one category" },
      { tier: "silver", xp: 80,  label: "10 items in one category" },
      { tier: "gold",   xp: 150, label: "25 items in one category" },
    ],
  },
  {
    id: "quick_flip",
    category: "seller",
    name: "Lunch-Break Flip",
    description: "Sold items super fast after listing, efficiency king.",
    icon: "⚡",
    color: { bg: "#F5F3FF", accent: "#8B5CF6", text: "#4C1D95" },
    tiers: [
      { tier: "bronze", xp: 40,  label: "Sell an item within 3 days" },
      { tier: "silver", xp: 80,  label: "Sell an item within 1 day" },
      { tier: "gold",   xp: 150, label: "5 sales each within 1 day" },
    ],
  },
  // ── Buyer ─────────────────────────────────────────────────────────────────
  {
    id: "first_buy",
    category: "buyer",
    name: "First Haul",
    description: "Completed your very first deal as a buyer.",
    icon: "🛒",
    color: { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" },
    tiers: [{ tier: "special", xp: 30, label: "Complete your first purchase" }],
  },
  {
    id: "deal_hunter",
    category: "buyer",
    name: "Semester Saver",
    description: "A seasoned buyer who knows where the best deals are.",
    icon: "🔍",
    color: { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E40AF" },
    tiers: [
      { tier: "bronze", xp: 50,  label: "5 completed purchases" },
      { tier: "silver", xp: 100, label: "15 completed purchases" },
      { tier: "gold",   xp: 200, label: "30 completed purchases" },
    ],
  },
  {
    id: "wishlist_curator",
    category: "buyer",
    name: "Window Shopper",
    description: "Curated a massive wishlist of items to snag.",
    icon: "💝",
    color: { bg: "#FFF1F2", accent: "#F43F5E", text: "#881337" },
    tiers: [
      { tier: "bronze", xp: 20, label: "10 wishlist items" },
      { tier: "silver", xp: 40, label: "25 wishlist items" },
      { tier: "gold",   xp: 80, label: "50 wishlist items" },
    ],
  },
  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "chatter",
    category: "communication",
    name: "Canteen Regular",
    description: "Always in the chat, the most conversational trader.",
    icon: "💬",
    color: { bg: "#F0F9FF", accent: "#0EA5E9", text: "#0C4A6E" },
    tiers: [
      { tier: "bronze", xp: 20,  label: "Start 10 conversations" },
      { tier: "silver", xp: 50,  label: "50 conversations" },
      { tier: "gold",   xp: 100, label: "100 conversations" },
    ],
  },
  {
    id: "deal_closer",
    category: "communication",
    name: "Viva Cleared",
    description: "Seals the deal every time, never leaves a chat hanging.",
    icon: "🤝",
    color: { bg: "#F0FDF4", accent: "#16A34A", text: "#14532D" },
    tiers: [
      { tier: "bronze", xp: 50,  label: "3 deals closed via chat" },
      { tier: "silver", xp: 100, label: "10 deals closed via chat" },
      { tier: "gold",   xp: 200, label: "25 deals closed via chat" },
    ],
  },
  // ── Trust ─────────────────────────────────────────────────────────────────
  {
    id: "verified_student",
    category: "trust",
    name: "ID Card Verified",
    description: "Verified their email, a trusted member of the community.",
    icon: "✅",
    color: { bg: "#EFF6FF", accent: "#6366F1", text: "#312E81" },
    tiers: [{ tier: "special", xp: 50, label: "Verify your email address" }],
  },
  {
    id: "profile_complete",
    category: "trust",
    name: "Admit Card Ready",
    description: "Filled in everything: avatar, mobile, and campus.",
    icon: "🪪",
    color: { bg: "#F5F3FF", accent: "#8B5CF6", text: "#4C1D95" },
    tiers: [{ tier: "special", xp: 40, label: "Complete your profile" }],
  },
  {
    id: "trusted_trader",
    category: "trust",
    name: "Batch Favourite",
    description: "Zero disputes, 10+ deals. This seller is the real deal.",
    icon: "🛡",
    color: { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E40AF" },
    tiers: [{ tier: "special", xp: 100, label: "No disputes, 10+ completed deals" }],
  },
  {
    id: "early_adopter",
    category: "trust",
    name: "First Bench",
    description: "Joined during early access, an OG from the start.",
    icon: "🎖",
    color: { bg: "#FFFBEB", accent: "#D97706", text: "#78350F" },
    tiers: [{ tier: "special", xp: 75, label: "Joined during early access period" }],
  },
  {
    id: "campus_veteran",
    category: "trust",
    name: "Alumni Material",
    description: "Been here for 6+ months, a loyal part of the community.",
    icon: "🏛",
    color: { bg: "#F0FDF4", accent: "#15803D", text: "#14532D" },
    tiers: [{ tier: "special", xp: 60, label: "Account older than 6 months" }],
  },
  // ── Milestone ─────────────────────────────────────────────────────────────
  {
    id: "century_club",
    category: "milestone",
    name: "100% Attendance",
    description: "100 total transactions, bought and sold at campus scale.",
    icon: "💯",
    color: { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" },
    tiers: [{ tier: "special", xp: 200, label: "100 total transactions" }],
  },
  {
    id: "big_deal",
    category: "milestone",
    name: "Fest Budget",
    description: "Closed a single sale worth ₹5,000 or more.",
    icon: "💰",
    color: { bg: "#FFFBEB", accent: "#EAB308", text: "#713F12" },
    tiers: [{ tier: "special", xp: 100, label: "Sell an item for ₹5,000+" }],
  },
  {
    id: "streak_seller",
    category: "milestone",
    name: "Semester Streak",
    description: "5 sales in 7 days, unstoppable hustle.",
    icon: "🔥",
    color: { bg: "#FFF7ED", accent: "#F97316", text: "#7C2D12" },
    tiers: [{ tier: "special", xp: 80, label: "5 sales in any 7-day window" }],
  },
  {
    id: "night_owl",
    category: "milestone",
    name: "All-Nighter",
    description: "Posted 10 listings between 10 PM and 2 AM.",
    icon: "🦉",
    color: { bg: "#0F172A", accent: "#6366F1", text: "#E0E7FF" },
    tiers: [{ tier: "special", xp: 30, label: "10 late-night listings" }],
  },
  {
    id: "og_badge",
    category: "milestone",
    name: "OG Batch",
    description: "Among the first 100 people to join Unideals.",
    icon: "👾",
    color: { bg: "#F5F3FF", accent: "#7C3AED", text: "#3B0764" },
    tiers: [{ tier: "special", xp: 100, label: "One of the first 100 users" }],
  },
];

// Helper maps
export const BADGE_MAP = Object.fromEntries(BADGE_CATALOGUE.map((b) => [b.id, b]));
export const BADGE_CATEGORIES = ["seller", "buyer", "communication", "trust", "milestone"];

/** Get display meta for a badge_id (strips _bronze / _silver / _gold suffix) */
export function getBadgeMeta(badgeId) {
  const cleanId = badgeId.replace(/_(bronze|silver|gold|special)$/, "");
  return BADGE_MAP[cleanId] || null;
}

// Tier styles
export const TIER_STYLES = {
  bronze: {
    label: "Bronze",
    gradient: "linear-gradient(135deg, #CD7F32, #A0522D)",
    glow: "0 0 16px rgba(205,127,50,0.5)",
    text: "#92400E",
    bg: "#FEF3C7",
  },
  silver: {
    label: "Silver",
    gradient: "linear-gradient(135deg, #C0C0C0, #808080)",
    glow: "0 0 16px rgba(192,192,192,0.5)",
    text: "#374151",
    bg: "#F3F4F6",
  },
  gold: {
    label: "Gold",
    gradient: "linear-gradient(135deg, #FFD700, #FFA500)",
    glow: "0 0 20px rgba(255,215,0,0.6)",
    text: "#78350F",
    bg: "#FFFBEB",
  },
  special: {
    label: "Special",
    gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    glow: "0 0 16px rgba(99,102,241,0.4)",
    text: "#312E81",
    bg: "#EEF2FF",
  },
};

// ─── Ranks ────────────────────────────────────────────────────────────────
// Keys are the rank_title values the backend stores (badgeService
// rankFromLevel) and rewards are keyed on, so they must not change. `name`
// is what students see: a campus-life ladder from Fresher to Campus Icon.
export const RANK_CONFIG = {
  Seedling:        { name: "Fresher",     icon: "🎒", color: "#16A34A", bg: "#F0FDF4" },
  Explorer:        { name: "Junior",      icon: "📚", color: "#0891B2", bg: "#ECFEFF" },
  Dealer:          { name: "Class Rep",   icon: "🙋", color: "#4F46E5", bg: "#EEF2FF" },
  Hustler:         { name: "Senior",      icon: "🎓", color: "#EA580C", bg: "#FFF7ED" },
  Legend:          { name: "Topper",      icon: "🏆", color: "#D97706", bg: "#FFFBEB" },
  "Campus King":   { name: "Campus King", icon: "👑", color: "#7C3AED", bg: "#F5F3FF" },
  "Campus Queen":  { name: "Campus Queen", icon: "👑", color: "#DB2777", bg: "#FDF2F8" },
  "Campus Royale": { name: "Campus Icon", icon: "👑", color: "#7C3AED", bg: "#F5F3FF" },
};

/** Display name for a stored rank title ("Seedling" → "Fresher"). */
export const rankName = (title) => RANK_CONFIG[title]?.name || title || "Fresher";

// Rank ladder + what each rank actually grants on arrival (mirrors
// RANK_REWARDS in backend/src/services/rewardService.js).
export const RANK_TIERS_GUIDE = [
  {
    title: "Seedling",
    name: "Fresher",
    icon: "🎒",
    color: "#16A34A",
    bg: "#F0FDF4",
    minLevel: 1,
    maxLevel: 4,
    minXp: 0,
    about: "Just joined campus. Post your first listing to get going.",
    rewards: ["1 boost credit"],
  },
  {
    title: "Explorer",
    name: "Junior",
    icon: "📚",
    color: "#0891B2",
    bg: "#ECFEFF",
    minLevel: 5,
    maxLevel: 9,
    minXp: 1250,
    about: "You know your way around and have a few deals done.",
    rewards: ["2 boost credits"],
  },
  {
    title: "Dealer",
    name: "Class Rep",
    icon: "🙋",
    color: "#4F46E5",
    bg: "#EEF2FF",
    minLevel: 10,
    maxLevel: 19,
    minXp: 5000,
    about: "People in your batch know you're the one to ask.",
    rewards: ["3 boost credits", "1 month of Pro, free"],
  },
  {
    title: "Hustler",
    name: "Senior",
    icon: "🎓",
    color: "#EA580C",
    bg: "#FFF7ED",
    minLevel: 20,
    maxLevel: 29,
    minXp: 20000,
    about: "A go-to seller with a solid track record.",
    rewards: ["5 boost credits", "1 semester of Pro, free", "Senior profile frame"],
  },
  {
    title: "Legend",
    name: "Topper",
    icon: "🏆",
    color: "#D97706",
    bg: "#FFFBEB",
    minLevel: 30,
    maxLevel: 39,
    minXp: 45000,
    about: "Top of the batch. Dozens of trades and great ratings.",
    rewards: ["7 boost credits", "1 semester of Pro Plus, free"],
  },
  {
    title: "Campus Royale",
    altTitles: ["Campus King", "Campus Queen"],
    name: "Campus Icon",
    icon: "👑",
    color: "#7C3AED",
    bg: "#F5F3FF",
    minLevel: 40,
    maxLevel: 100,
    minXp: 80000,
    about: "Everyone on campus knows your name. Shown as Campus King or Queen on your profile.",
    rewards: ["10 boost credits", "Pro Plus for life, free", "Campus Icon profile tag"],
  },
];

export const XP_ACTIVITIES_GUIDE = [
  { action: "List an item", xp: "+30 XP", note: "For each active listing" },
  { action: "Buy something", xp: "+30 XP", note: "For each completed purchase" },
  { action: "Verify your college email", xp: "+50 XP", note: "One time" },
  { action: "Complete your profile", xp: "+40 XP", note: "Photo and details" },
  { action: "Sell 5, 20 or 50 items", xp: "+50 to +200 XP", note: "Hostel Tycoon badge" },
  { action: "Sell within a day or two", xp: "+40 to +150 XP", note: "Lunch-Break Flip badge" },
  { action: "Get great ratings", xp: "+60 to +200 XP", note: "Dean's List badge" },
  { action: "Chat and close deals", xp: "+20 to +200 XP", note: "Canteen Regular, Viva Cleared" },
  { action: "Hit streaks and milestones", xp: "+80 to +200 XP", note: "Semester Streak, Fest Budget, 100% Attendance" },
];

// Level milestone rewards guide
// Mirrors exactly what rewardService.js grants on the backend.
export const LEVEL_REWARDS_GUIDE = [
  { level: 5,  label: "Junior unlocked",   grants: ["+1 Boost Credit"] },
  { level: 10, label: "Class Rep unlocked",      grants: ["+2 Boost Credits"] },
  { level: 15, label: "Level 15 milestone",  grants: ["+2 Boost Credits", "Bronze Profile Frame"] },
  { level: 20, label: "Senior unlocked",     grants: ["+3 Boost Credits"] },
  { level: 25, label: "Level 25 milestone",  grants: ["+3 Boost Credits", "Rising Star Tag"] },
  { level: 30, label: "Topper unlocked",      grants: ["+4 Boost Credits", "Gold Profile Frame"] },
  { level: 35, label: "Level 35 milestone",  grants: ["+4 Boost Credits"] },
  { level: 40, label: "Campus Icon unlocked",      grants: ["+5 Boost Credits", "Crown Avatar Frame"] },
  { level: 45, label: "Level 45 milestone",  grants: ["+5 Boost Credits", "Campus Legend Tag"] },
  { level: 50, label: "Max level",          grants: ["+10 Boost Credits", "Hall of Fame Profile Tag"] },
];

// Level & XP helpers
export function computeLevel(xp = 0) {
  return Math.max(1, Math.floor(Math.sqrt((xp || 0) / 50)));
}

export function xpForLevel(level = 1) {
  return level * level * 50;
}

export function xpToNextLevel(xp = 0) {
  const level = computeLevel(xp);
  return xpForLevel(level + 1) - (xp || 0);
}

export function levelProgress(xp = 0) {
  const level = computeLevel(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return Math.min(100, Math.round((((xp || 0) - current) / (next - current)) * 100));
}

