// ─── Badge catalogue ─────────────────────────────────────────────────────────
// Each entry defines display metadata for a badge.
// badge_id must match exactly what the backend service uses.

export const BADGE_CATALOGUE = [
  // ── Seller ────────────────────────────────────────────────────────────────
  {
    id: "first_listing",
    category: "seller",
    name: "First Drop",
    description: "Listed your very first item on Unideals.",
    icon: "📦",
    color: { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" },
    tiers: [{ tier: "special", xp: 30, label: "Post your first listing" }],
  },
  {
    id: "power_seller",
    category: "seller",
    name: "Power Seller",
    description: "Sold a high volume of products — a true campus trader.",
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
    name: "Top Rated",
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
    name: "Category Ace",
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
    name: "Quick Flip",
    description: "Sold items super fast after listing — efficiency king.",
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
    name: "First Purchase",
    description: "Completed your very first deal as a buyer.",
    icon: "🛒",
    color: { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" },
    tiers: [{ tier: "special", xp: 30, label: "Complete your first purchase" }],
  },
  {
    id: "deal_hunter",
    category: "buyer",
    name: "Deal Hunter",
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
    name: "Curator",
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
    name: "Social Butterfly",
    description: "Always in the chat — the most conversational trader.",
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
    name: "Deal Closer",
    description: "Seals the deal every time — never leaves a chat hanging.",
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
    name: "Verified Student",
    description: "Verified their email — a trusted member of the community.",
    icon: "✅",
    color: { bg: "#EFF6FF", accent: "#6366F1", text: "#312E81" },
    tiers: [{ tier: "special", xp: 50, label: "Verify your email address" }],
  },
  {
    id: "profile_complete",
    category: "trust",
    name: "Profile Pro",
    description: "Filled in everything — avatar, mobile, and campus.",
    icon: "🪪",
    color: { bg: "#F5F3FF", accent: "#8B5CF6", text: "#4C1D95" },
    tiers: [{ tier: "special", xp: 40, label: "Complete your profile" }],
  },
  {
    id: "trusted_trader",
    category: "trust",
    name: "Trusted Trader",
    description: "Zero disputes, 10+ deals — this seller is the real deal.",
    icon: "🛡",
    color: { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E40AF" },
    tiers: [{ tier: "special", xp: 100, label: "No disputes, 10+ completed deals" }],
  },
  {
    id: "early_adopter",
    category: "trust",
    name: "Early Adopter",
    description: "Joined during early access — an OG from the start.",
    icon: "🎖",
    color: { bg: "#FFFBEB", accent: "#D97706", text: "#78350F" },
    tiers: [{ tier: "special", xp: 75, label: "Joined during early access period" }],
  },
  {
    id: "campus_veteran",
    category: "trust",
    name: "Campus Veteran",
    description: "Been here for 6+ months — a loyal part of the community.",
    icon: "🏛",
    color: { bg: "#F0FDF4", accent: "#15803D", text: "#14532D" },
    tiers: [{ tier: "special", xp: 60, label: "Account older than 6 months" }],
  },
  // ── Milestone ─────────────────────────────────────────────────────────────
  {
    id: "century_club",
    category: "milestone",
    name: "Century Club",
    description: "100 total transactions — bought and sold at campus scale.",
    icon: "💯",
    color: { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" },
    tiers: [{ tier: "special", xp: 200, label: "100 total transactions" }],
  },
  {
    id: "big_deal",
    category: "milestone",
    name: "Big Deal",
    description: "Closed a single sale worth ₹5,000 or more.",
    icon: "💰",
    color: { bg: "#FFFBEB", accent: "#EAB308", text: "#713F12" },
    tiers: [{ tier: "special", xp: 100, label: "Sell an item for ₹5,000+" }],
  },
  {
    id: "streak_seller",
    category: "milestone",
    name: "On A Roll",
    description: "5 sales in 7 days — unstoppable hustle.",
    icon: "🔥",
    color: { bg: "#FFF7ED", accent: "#F97316", text: "#7C2D12" },
    tiers: [{ tier: "special", xp: 80, label: "5 sales in any 7-day window" }],
  },
  {
    id: "night_owl",
    category: "milestone",
    name: "Night Owl",
    description: "Posted 10 listings between 10 PM and 2 AM.",
    icon: "🦉",
    color: { bg: "#0F172A", accent: "#6366F1", text: "#E0E7FF" },
    tiers: [{ tier: "special", xp: 30, label: "10 late-night listings" }],
  },
  {
    id: "og_badge",
    category: "milestone",
    name: "OG Member",
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

// Rank tier config
export const RANK_CONFIG = {
  Seedling:      { icon: "🌱", color: "#22C55E", bg: "#F0FDF4" },
  Explorer:      { icon: "🔵", color: "#06B6D4", bg: "#ECFEFF" },
  Dealer:        { icon: "⚡", color: "#6366F1", bg: "#EEF2FF" },
  Hustler:       { icon: "🔥", color: "#F97316", bg: "#FFF7ED" },
  Legend:        { icon: "💎", color: "#F59E0B", bg: "#FFFBEB" },
  "Campus King": { icon: "👑", color: "#7C3AED", bg: "#F5F3FF" },
  "Campus Queen":{ icon: "👑", color: "#EC4899", bg: "#FDF2F8" },
  "Campus Royale":{ icon: "👑", color: "#8B5CF6", bg: "#F5F3FF" },
};

// ─── Rank Roadmap & Levels Guide ───────────────────────────────────────────
export const RANK_TIERS_GUIDE = [
  {
    title: "Seedling",
    icon: "🌱",
    color: "#22C55E",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    minLevel: 1,
    maxLevel: 4,
    minXp: 0,
    tagline: "The Campus Sprout",
    description: "Every campus legend starts somewhere. Welcome to trading on Unideals!",
    perks: [
      "Access to post and browse items on campus",
      "Basic buyer & seller in-app messaging",
      "Eligible for Verified Student status",
    ],
  },
  {
    title: "Explorer",
    icon: "🔵",
    color: "#06B6D4",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    minLevel: 5,
    maxLevel: 9,
    minXp: 1250,
    tagline: "Active Campus Trader",
    description: "Exploring listings, making deals, and building an early reputation.",
    perks: [
      "Bronze flair on your profile card",
      "Higher discovery in campus browse feeds",
      "Unlocks multi-category badge milestones",
    ],
  },
  {
    title: "Dealer",
    icon: "⚡",
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    minLevel: 10,
    maxLevel: 19,
    minXp: 5000,
    tagline: "Trusted Dealmaker",
    description: "A seasoned regular in campus trades with strong community trust.",
    perks: [
      "Trusted Trader badge priority verification",
      "Highlighted listings with 'Active Trader' chip",
      "Faster response badge eligibility",
    ],
  },
  {
    title: "Hustler",
    icon: "🔥",
    color: "#F97316",
    bg: "#FFF7ED",
    border: "#FED7AA",
    minLevel: 20,
    maxLevel: 29,
    minXp: 20000,
    tagline: "Power Seller & Buyer",
    description: "High volume, swift deal turnaround, and a trusted campus commerce powerhouse.",
    perks: [
      "Silver profile aura & featured seller ranking",
      "Boosted visibility in search results",
      "Special streak & volume badge recognition",
    ],
  },
  {
    title: "Legend",
    icon: "💎",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    minLevel: 30,
    maxLevel: 39,
    minXp: 45000,
    tagline: "Campus Marketplace Elite",
    description: "Top-tier rating, dozens of completed trades, and unmatched campus trust.",
    perks: [
      "Gold glowing badge across all product listings",
      "Top-tier recommendation placement",
      "Special recognition in campus leaderboard",
    ],
  },
  {
    title: "Campus Royale",
    altTitles: ["Campus King", "Campus Queen"],
    icon: "👑",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    minLevel: 40,
    maxLevel: 100,
    minXp: 80000,
    tagline: "The Pinnacle of Campus Commerce",
    description: "The highest honor on Unideals — undisputed campus trading royalty.",
    perks: [
      "Exclusive Crown icon & Royale badge flair",
      "Permanent top spotlight across university pages",
      "Lifetime VIP perks & community leader badge",
    ],
  },
];

export const XP_ACTIVITIES_GUIDE = [
  { action: "Post a new listing", xp: "+30 XP", icon: "📦", note: "Earn XP for each active product you drop" },
  { action: "Complete a purchase", xp: "+30 XP", icon: "🛒", note: "Earn XP when you buy from fellow students" },
  { action: "Sell items (Power Seller)", xp: "+50 to +200 XP", icon: "🏪", note: "Tiered rewards for 5, 20, and 50+ sales" },
  { action: "High buyer ratings (4.0 – 4.8+)", xp: "+60 to +200 XP", icon: "⭐", note: "Keep your trust score high" },
  { action: "Verify student email", xp: "+50 XP", icon: "✅", note: "One-time boost for university verification" },
  { action: "Complete profile details", xp: "+40 XP", icon: "🪪", note: "Avatar + contact details completed" },
  { action: "Fast deal closing", xp: "+40 to +150 XP", icon: "⚡", note: "Sell items within 24–72 hours" },
  { action: "Chat conversations & deals", xp: "+20 to +200 XP", icon: "💬", note: "Active chats leading to closed trades" },
  { action: "Milestones & streaks", xp: "+80 to +200 XP", icon: "🔥", note: "5 sales in 7 days, ₹5,000+ sales, 100 deals" },
];

