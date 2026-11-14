/**
 * Video guides shown on Profile → Video guides (/guides).
 *
 * To add or update a video, paste its YouTube video ID into `youtubeId`:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ   →  youtubeId: "dQw4w9WgXcQ"
 *   https://youtu.be/dQw4w9WgXcQ                  →  youtubeId: "dQw4w9WgXcQ"
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ    →  youtubeId: "dQw4w9WgXcQ"
 *
 * Videos play right on the page (privacy-enhanced youtube-nocookie embed),
 * nobody is sent to YouTube. Entries without an ID show as "Coming soon".
 * `duration` is optional display text, e.g. "1:45".
 */
export const VIDEO_GUIDES = [
  {
    key: "first-listing",
    topic: "Selling",
    title: "List your first item",
    description: "Photos, price and pickup spot. Live on your campus in about two minutes.",
    youtubeId: "",
    duration: "",
  },
  {
    key: "chat-and-deals",
    topic: "Selling",
    title: "Chat, offers and closing a deal",
    description: "Reply to buyers, accept an offer, meet up and mark it done.",
    youtubeId: "",
    duration: "",
  },
  {
    key: "boosts",
    topic: "Selling",
    title: "Boost a listing",
    description: "Put a listing in the Boosted row on Home and the Deals page.",
    youtubeId: "",
    duration: "",
  },
  {
    key: "buying-safely",
    topic: "Buying",
    title: "Buy safely on campus",
    description: "Check the item, meet in a busy spot, pay at pickup.",
    youtubeId: "",
    duration: "",
  },
  {
    key: "price-insights",
    topic: "Pro features",
    title: "Smart price suggestions and the demand meter",
    description: "See what similar items sell for on your campus before you price.",
    youtubeId: "",
    duration: "",
  },
  {
    key: "girls-corner",
    topic: "Girls Corner",
    title: "Girls Corner",
    description: "Girls-only listings and chats, and how to turn Girl Mode on.",
    youtubeId: "",
    duration: "",
  },
];

/** Accepts a bare ID or any common YouTube URL; returns the ID or "". */
export const toYouTubeId = (value = "") => {
  const v = String(value).trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : "";
};
