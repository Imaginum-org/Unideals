export const SITE_URL = "https://unideals.in";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/** Absolute canonical URL for an app path ("/explore" → https://unideals.in/explore). */
export const canonicalFor = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Title + description for every public, indexable route. One place to keep
// them unique and on-message (search snippets, link previews, AI answers).
// Titles stay under ~60 chars, descriptions under ~160.

export const ROUTE_SEO = {
  "/": {
    title: "Unideals: Buy & Sell on Campus | Student Marketplace India",
    description:
      "Buy and sell used textbooks, electronics, cycles and hostel essentials with verified students on your campus. No listing fees, no shipping: meet and pay at pickup.",
  },
  "/explore": {
    title: "Explore Campus Listings | Unideals",
    description:
      "Browse every live listing on your campus: books, gadgets, cycles, hostel gear and more. Filter by category, price and condition, then chat with the seller.",
  },
  "/deals": {
    title: "Hot & Boosted Deals on Campus | Unideals",
    description: "Limited-time and boosted deals from students on your campus, updated through the day.",
  },
  "/price": {
    title: "Pricing: Free, Pro & Pro+ Plans | Unideals",
    description:
      "Buying, selling and chatting are free. Pro and Pro+ add more listings, monthly boosts and higher placement. One-time boosts from ₹29.",
  },
  "/faq": {
    title: "FAQ: Buying, Selling & Safety | Unideals",
    description:
      "Answers about buying and selling on Unideals: payments at pickup, safe campus meetups, listings, boosts, verification and your account.",
  },
  "/contact": {
    title: "Contact & Support | Unideals",
    description: "Get help with your account, a listing or a deal. Raise a support ticket or email unideals.support@gmail.com.",
  },
  "/termscondition": {
    title: "Terms of Use | Unideals",
    description: "The rules for using Unideals, the campus marketplace for students in India.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Unideals",
    description: "What Unideals collects, why, how long it is kept, and how to control or delete your data.",
  },
};

// Category landing pages: /category/<value>.
export const categorySeo = (label) => ({
  title: `Used ${label} for Students on Campus | Unideals`,
  description: `Buy and sell second-hand ${label.toLowerCase()} with verified students on your campus. Chat with the seller, meet on campus and pay at pickup.`,
});

export const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Unideals",
  url: "https://unideals.in",
  logo: "https://unideals.in/icon-512.png",
  email: "unideals.support@gmail.com",
  sameAs: [
    "https://x.com/unidealsdotin",
    "https://www.instagram.com/unidealsdotin/",
    "https://www.youtube.com/@unidealsdotin",
  ],
};
