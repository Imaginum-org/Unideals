/*
 * Student FAQ. One source for the FAQ tab and the Help page's popular
 * questions. Keep answers in sync with the product (limits mirror
 * backend/src/config/subscriptionPlans.js; deal stages mirror chat).
 */

export const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting started",
    icon: "rocket",
    questions: [
      {
        q: "What is Unideals?",
        a: "A marketplace just for students on your campus. You can buy and sell books, electronics, hostel essentials, cycles, event passes and more with people you can meet in person, right on campus.",
      },
      {
        q: "Who can see my listings?",
        a: "Only students from your campus. Listings, search and chats are campus-only, so everything you see is something you can actually pick up nearby.",
      },
      {
        q: "Is Unideals free to use?",
        a: "Yes. Browsing, chatting, buying and selling are free. The Free plan includes 10 active listings and 25 wishlist saves. Pro and Pro Plus are optional one-time upgrades for heavier sellers.",
      },
      {
        q: "Does Unideals take a cut of my sale?",
        a: "No. The buyer pays you directly at pickup (cash or UPI). Unideals never holds your money and takes no commission on item sales.",
      },
      {
        q: "How do I verify my account?",
        a: "We send a verification link to your email when you sign up. Open it to verify. If it expired, go to Settings → Verification and tap “Resend verification email”. Verified accounts show a badge that buyers trust more.",
      },
      {
        q: "Can I use Unideals on my phone?",
        a: "Yes. The site works like an app on any phone browser. Add it to your home screen from your browser menu for one-tap access.",
      },
    ],
  },
  {
    id: "buying",
    title: "Buying",
    icon: "bag",
    questions: [
      {
        q: "How do I buy something?",
        a: "Open the listing and tap “Chat with seller”. Ask your questions, agree on a price, and the seller confirms the deal. Then you meet on campus, check the item and pay at pickup.",
      },
      {
        q: "Can I negotiate the price?",
        a: "Yes, if the seller marked the listing “Open to offers”. In chat, tap the ₹ button to send an offer. The seller can accept, decline or send a counter offer. Fixed-price listings don't accept offers.",
      },
      {
        q: "What does “Reserved” mean?",
        a: "The seller has confirmed a deal with another buyer and is holding the item for them. If that deal falls through, the item becomes available again automatically.",
      },
      {
        q: "What is a “Hot deal”?",
        a: "A new listing that's getting a lot of attention from students on your campus. The tag shows for a limited time, then moves to newer popular listings.",
      },
      {
        q: "How does the wishlist work?",
        a: "Tap the heart on any listing to save it. You'll get a notification if the seller drops the price. Free accounts can save 25 items, Pro 100 and Pro Plus unlimited.",
      },
      {
        q: "Can I return an item after buying it?",
        a: "There's no platform return system, because deals happen directly between students. Always inspect the item before you pay. Once you mark an item as received, the deal is complete.",
      },
    ],
  },
  {
    id: "selling",
    title: "Selling",
    icon: "tag",
    questions: [
      {
        q: "How do I list an item?",
        a: "Tap “Sell”, then follow the four steps: details, photos, price & pickup, and review. Most details fill in automatically from your title. It takes about two minutes and goes live on your campus immediately.",
      },
      {
        q: "How many photos can I add?",
        a: "Up to 3 photos per listing (JPG, PNG or WEBP, up to 10 MB each). The first one is the cover, and you can change which photo is the cover any time. You can also upload straight from your phone by scanning a QR code.",
      },
      {
        q: "Can I save a listing and finish it later?",
        a: "Yes. Your progress is saved on your device automatically. On the review step you can also tap “Save as draft”. Drafts appear under My listings → Unlisted, with all photos, and only you can see them.",
      },
      {
        q: "How many items can I list?",
        a: "Free: 10 active listings. Pro: 25. Pro Plus: unlimited. Drafts, unlisted and sold items don't count towards the limit.",
      },
      {
        q: "How do I edit, unlist or delete a listing?",
        a: "Go to My listings. Every listing has Edit, Unlist and Delete. Unlisting hides it from buyers without deleting it, so you can relist later in one tap.",
      },
      {
        q: "Why can't I post the same item again?",
        a: "To keep the feed fair, you can't relist the same item (same title, category and similar price) within 24 hours of listing it.",
      },
      {
        q: "How do I get more views on my listing?",
        a: "Use a clear title (brand + model), 3 good photos in daylight, an honest description and a fair price. Listings open to offers get more chats. You can also boost a listing to show it near the top of the feed.",
      },
    ],
  },
  {
    id: "deals",
    title: "Deals & payments",
    icon: "handshake",
    questions: [
      {
        q: "What are the steps of a deal?",
        a: "1) Agree on a price in chat. 2) The seller confirms the deal, which reserves the item for you. 3) The seller sets a pickup time and place. 4) You meet, pay, and the seller confirms payment. 5) You confirm you received the item, and the deal is complete.",
      },
      {
        q: "How do I pay the seller?",
        a: "In person at pickup, by cash or UPI, whichever the listing accepts. Never pay before you've seen and checked the item.",
      },
      {
        q: "Where can I track my deals?",
        a: "Orders in your profile shows every deal you're buying or selling, with the same stages you see in chat. It updates live.",
      },
      {
        q: "Can a deal step be undone?",
        a: "Yes, sellers can undo one step at a time from the deal card in chat: release a reservation, clear a pickup plan, or mark a payment as not received. Completed deals are final.",
      },
      {
        q: "How do I cancel a deal?",
        a: "Either of you can cancel any time before it's completed, from the ⋯ menu in chat or the Cancel button in Orders. The item becomes available again.",
      },
      {
        q: "What if the seller doesn't show up or stops replying?",
        a: "Cancel the deal so the item isn't stuck as reserved, and look at other listings. If something felt off, report the user from the chat menu.",
      },
    ],
  },
  {
    id: "chat",
    title: "Chat",
    icon: "chat",
    questions: [
      {
        q: "How do I find an old message?",
        a: "Open the conversation and tap the search icon in its header. Matches are highlighted, and the arrows jump between them.",
      },
      {
        q: "Can I turn off read receipts or typing indicators?",
        a: "Yes. Go to Settings → Chat. You can also pick a chat wallpaper there.",
      },
      {
        q: "Why was my message blocked?",
        a: "Messages with abuse, threats or spam are blocked automatically and sent to our team. Repeated flagged messages pause your sending for a short cooldown.",
      },
      {
        q: "Why are some chats at the top of my list?",
        a: "Conversations with Pro and Pro Plus members are shown first under “Priority”. It's one of the paid plan perks.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety & reports",
    icon: "shield",
    questions: [
      {
        q: "Is it safe to meet a seller?",
        a: "Meet in busy, public places on campus, such as the library, canteen or main gate, ideally in daylight. Bring a friend if you like. Never share your hostel room or home address.",
      },
      {
        q: "How do I report a listing or a user?",
        a: "On a listing, tap “Report listing”, or “Report seller” on the seller card. In chat, use the ⋯ menu. Reports are confidential and reviewed by our team.",
      },
      {
        q: "What if I think I've been scammed?",
        a: "Report the user right away from the chat or listing, and contact us through Help & support with details (dates, messages, screenshots). For anything urgent on campus, contact campus security first.",
      },
      {
        q: "Will anyone see my phone number?",
        a: "No. Buyers only see the pickup spot name you choose. Your phone number is never shown on listings or in chat.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & boosts",
    icon: "crown",
    questions: [
      {
        q: "What do Pro and Pro Plus include?",
        a: "Pro: 25 listings, 100 wishlist saves, 2 boosts a month and higher search ranking, plus priority chat and support. Pro Plus: unlimited listings and wishlist, 5 longer boosts a month, the highest ranking and top priority. See Subscription for the full comparison.",
      },
      {
        q: "Is a plan a monthly subscription?",
        a: "No. Plans are a one-time payment through Razorpay. Nothing renews automatically.",
      },
      {
        q: "What is a boost?",
        a: "A boost shows your listing near the top of the feed for a few days. Paid plans include monthly boosts. Anyone can buy a one-time boost: 3 days for ₹29 or 7 days for ₹49, from My listings.",
      },
      {
        q: "Is there a discount for girls?",
        a: "Yes. Female accounts get the Girls Founder price on lifetime plans. It's applied automatically on the pricing page.",
      },
    ],
  },
  {
    id: "achievements",
    title: "Achievements",
    icon: "trophy",
    questions: [
      {
        q: "How do I earn XP?",
        a: "By being active: listing items, completing deals, getting good ratings and replying to buyers. XP raises your level and rank. Tap “How levels work” on the Achievements tab for the full list.",
      },
      {
        q: "What do levels and ranks give me?",
        a: "Higher ranks unlock perks, and milestone levels give rewards like free boost credits and profile frames. You can see the next reward on your level card.",
      },
      {
        q: "A badge didn't update. What do I do?",
        a: "Open Achievements and tap “Sync badges”. It recalculates your progress straight away.",
      },
    ],
  },
  {
    id: "girls-corner",
    title: "Girls Corner",
    icon: "flower",
    questions: [
      {
        q: "What is Girls Corner?",
        a: "A space where girls can list items only for other girls on their campus. These listings are hidden from boys everywhere: home, search, categories and chat.",
      },
      {
        q: "How do I list something only for girls?",
        a: "Turn on “Girls Corner” when listing an item. Some categories, such as Beauty or Women's Fashion, are girls-only automatically.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & privacy",
    icon: "user",
    questions: [
      {
        q: "How do I change my campus?",
        a: "Go to Settings → Profile → Campus. Your live listings move to the new campus when you save.",
      },
      {
        q: "How do I add or change pickup spots?",
        a: "Go to Settings → Pickup spots. You can save up to 3 and choose a primary one, which new listings use by default.",
      },
      {
        q: "Can I change my gender on my profile?",
        a: "Gender is set once during sign-up. To change it, open Settings → Profile → Gender and request approval. Our team reviews it.",
      },
      {
        q: "How do I log out of all devices?",
        a: "Go to Settings → Profile → Account and tap “Sign out”. It signs you out everywhere.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Profile → Account → Delete account. This is permanent and removes your listings.",
      },
    ],
  },
];

// Shown on the Help page as quick answers.
export const POPULAR_QUESTIONS = [
  ["deals", "What are the steps of a deal?"],
  ["deals", "How do I pay the seller?"],
  ["selling", "How do I list an item?"],
  ["safety", "How do I report a listing or a user?"],
  ["plans", "Is a plan a monthly subscription?"],
].map(([cat, q]) => {
  const item = FAQ_CATEGORIES.find((c) => c.id === cat)?.questions.find((x) => x.q === q);
  return item ? { ...item, category: cat } : null;
}).filter(Boolean);

export const FAQ_COUNT = FAQ_CATEGORIES.reduce((n, c) => n + c.questions.length, 0);
