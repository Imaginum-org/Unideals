/*
 * Terms & Privacy content, written for students first: every section has a
 * one-line "In short" and the details below it. Keep facts in sync with the
 * product (FAQ data, subscriptionPlans, deal stages).
 *
 * Block types: { p } paragraph · { list: [string | { label, text }] } ·
 * { note, tone: "info" | "warn" }. Wrap words in **double stars** for bold.
 */

export const LEGAL_UPDATED = "9 November 2026";
export const LEGAL_EMAIL = "hi@unideals.in";

export const PRIVACY = {
  id: "privacy",
  title: "Privacy Policy",
  intro:
    "What we collect, why we need it, who can see it and how you stay in control. We wrote this in plain language. If anything is unclear, ask us.",
  summary: [
    { icon: "ban", tone: "emerald", title: "We never sell your data", text: "No ads, no data brokers, no selling or renting your info." },
    { icon: "phone", tone: "sky", title: "Your number stays private", text: "Buyers see your name, photo and pickup spot, never your phone or email." },
    { icon: "card", tone: "violet", title: "We never see card or UPI details", text: "Payments go through Razorpay. We only keep the receipt." },
    { icon: "trash", tone: "rose", title: "Delete any time", text: "Delete your account from Settings. We erase your data within 30 days." },
  ],
  sections: [
    {
      id: "about",
      icon: "info",
      title: "Who we are and what this covers",
      short: "This policy covers the Unideals website and app. Deals you make offline are between you and the other student.",
      body: [
        {
          p: "Unideals is a campus marketplace where verified students buy and sell with other students on their own campus. This policy explains what personal data we collect, why, who can see it, how we protect it, and the rights you have over it.",
        },
        {
          p: "It doesn't cover what happens offline between you and another student, or websites you open from links in listings or chats.",
        },
      ],
    },
    {
      id: "collect",
      icon: "database",
      title: "What we collect",
      short: "Only what we need to run your account, your listings and your chats.",
      body: [
        {
          list: [
            { label: "Account", text: "Name, email, profile photo, campus and gender. Mobile number only if you add it." },
            { label: "Sign-in", text: "Your password, stored only as an irreversible hash, or your basic Google profile (name, email, photo) if you sign in with Google." },
            { label: "Listings", text: "Titles, descriptions, photos, prices, categories, condition, pickup spots and drafts." },
            { label: "Activity", text: "Wishlist saves, deals and their stages, ratings, boosts, plans, XP, badges and ranks." },
            { label: "Messages", text: "Your chats, so conversations continue across devices. Every message passes an automatic safety check (see “How we use it”)." },
            { label: "Payments", text: "The plan, amount and Razorpay order and payment IDs. Never card numbers, UPI PINs or bank logins." },
            { label: "Support", text: "Anything you send us through Help & support, reports or feedback." },
            { label: "Technical", text: "Basic logs (pages visited, searches, errors), device and browser type, and one view per person per listing so view counts are accurate." },
          ],
        },
        { note: "We don't collect government IDs, Aadhaar numbers or your exact location.", tone: "info" },
      ],
    },
    {
      id: "use",
      icon: "settings",
      title: "How we use it",
      short: "To run the marketplace, keep students safe and fix things. Never for ads.",
      body: [
        {
          list: [
            "Create your account, verify your student email and keep you signed in",
            "Show your listings to students on your campus, power search, wishlist, deals, boosts, plans and achievements",
            "Send the messages you'd expect: verification, password resets, deal updates, price-drop alerts and replies to reports",
            "Keep the community safe: check reported content and catch spam, scams, fake accounts and abuse",
            "Screen chat messages automatically. Messages with abuse, threats or sexual content are hidden and sent to our team for review. A computer never bans anyone on its own",
            "Understand how Unideals is used, through combined, anonymous numbers, so we can improve it",
            "Meet our legal duties, for example keeping payment records",
          ],
        },
      ],
    },
    {
      id: "visible",
      icon: "eye",
      title: "What other students can see",
      short: "Your public profile and listings. Not your phone number, email or address.",
      body: [
        {
          list: [
            { label: "Visible to students on your campus", text: "Your name, profile photo, campus, rank, badges, rating, plan badge and your active listings with their pickup spot name." },
            { label: "Visible only in a chat", text: "What you write in that conversation, and whether you've read it (if read receipts are on)." },
            { label: "Never shown", text: "Your phone number, email, password, payment details or exact location." },
          ],
        },
      ],
    },
    {
      id: "share",
      icon: "share",
      title: "Who we share it with",
      short: "Only with services that help us run Unideals, and only when needed.",
      body: [
        { p: "We **do not sell, rent or trade** your personal data. We share it only in these cases:" },
        {
          list: [
            { label: "Service providers", text: "Hosting and database, image storage, Razorpay for payments, and email and Google sign-in providers. They may use your data only to provide their service to us." },
            { label: "Safety", text: "Our moderation team sees reported listings, chats and accounts." },
            { label: "The law", text: "When a court, the police or a regulator in India lawfully requires it." },
            { label: "Business changes", text: "If Unideals merges or is acquired, your data stays protected by this policy." },
          ],
        },
      ],
    },
    {
      id: "gender",
      icon: "flower",
      title: "Gender and Girls Corner",
      short: "We use your gender only to decide who can see Girls Corner listings.",
      body: [
        {
          p: "Girls Corner listings are visible only to girls. To make that work we ask for your gender once, when you sign up. It isn't shown on your profile and it's never used for ads.",
        },
        { p: "To change it later, request it in Settings and our team will review the request." },
      ],
    },
    {
      id: "cookies",
      icon: "cookie",
      title: "Cookies and on-device storage",
      short: "Only essential cookies to keep you signed in. No ad trackers.",
      body: [
        {
          list: [
            "Secure, HttpOnly cookies keep you signed in. Sign-in doesn't work without them",
            "Your browser also stores small conveniences: your theme, a draft you haven't finished, recent searches and anti-spam timers. You can clear them in your browser settings at any time",
            "We use no third-party advertising or tracking cookies",
          ],
        },
      ],
    },
    {
      id: "retention",
      icon: "clock",
      title: "How long we keep it",
      short: "While your account is open. Deleted accounts are erased within 30 days.",
      body: [
        {
          list: [
            "Account data is kept while your account is active",
            "Sold listings disappear from the marketplace straight away and are deleted with their photos after about 15 days",
            "When you delete your account, we erase your data within 30 days",
            "Some records are kept longer when the law or safety requires it: payment records (tax law), and minimal moderation history to stop banned users from coming back",
            "Backups are overwritten on their normal schedule",
          ],
        },
      ],
    },
    {
      id: "security",
      icon: "lock",
      title: "How we protect it",
      short: "Encryption, hashed passwords and strict access. You can help with a strong password.",
      body: [
        {
          list: [
            "Everything travels over HTTPS. Passwords are hashed, sessions are short-lived and can be signed out everywhere at once",
            "Only people and systems that need your data for the purposes above can access it",
            "Rate limits and automatic checks block spam and brute-force attempts",
            "If a data breach ever affects you, we'll tell you and the authorities as required by law",
          ],
        },
        { note: "No system is 100% secure. Use a unique password and sign out on shared computers.", tone: "warn" },
      ],
    },
    {
      id: "rights",
      icon: "user",
      title: "Your rights and choices",
      short: "See, fix, download or delete your data. Just ask.",
      body: [
        { p: "Under India's Digital Personal Data Protection Act, 2023 you can:" },
        {
          list: [
            { label: "Access", text: "Ask for a copy of the personal data we hold about you." },
            { label: "Correct", text: "Fix anything wrong. Most of it you can edit yourself in Settings." },
            { label: "Delete", text: "Delete your account from Settings at any time." },
            { label: "Withdraw consent", text: "Stop using Unideals and delete your account. Some features can't work without the data they need." },
            { label: "Complain", text: "Raise a grievance with us, and if you aren't satisfied, with the Data Protection Board of India." },
            { label: "Nominate", text: "Name someone to exercise these rights for you if you can't." },
          ],
        },
        { p: `Email **${LEGAL_EMAIL}** from your account email, or use Help & support in the app.` },
      ],
    },
    {
      id: "delete",
      icon: "trash",
      title: "Deleting your account",
      short: "One step in Settings. Your profile and listings go away immediately.",
      body: [
        {
          list: [
            "Go to Settings → Profile → Account → Delete account and confirm with your password. If you sign in with Google, first set a password using “Forgot password”",
            "Your profile, listings, wishlist, pickup spots and unused boosts are removed, and you're signed out everywhere",
            "Reported chats, reports, payment records and moderation history may be kept in limited form, as explained in “How long we keep it”",
            "To come back, you'll need to create a new account",
          ],
        },
      ],
    },
    {
      id: "minors",
      icon: "shield",
      title: "Under 18s",
      short: "Unideals is for students aged 18 and over.",
      body: [
        {
          p: "We don't knowingly collect data from anyone under 18. If we find an account that belongs to a minor, we remove it and its data.",
        },
      ],
    },
    {
      id: "changes",
      icon: "refresh",
      title: "Changes to this policy",
      short: "We'll tell you at least 7 days before any important change.",
      body: [
        {
          p: "If we make an important change, we'll let you know in the app or by email at least 7 days before it takes effect. If you keep using Unideals after that, the new version applies. The date at the top of this page shows the latest version.",
        },
      ],
    },
    {
      id: "contact",
      icon: "mail",
      title: "Contact and grievance officer",
      short: `Write to ${LEGAL_EMAIL}. We reply within 48 hours.`,
      body: [
        {
          list: [
            { label: "Email", text: `${LEGAL_EMAIL} (please write from your account email)` },
            { label: "In the app", text: "Help & support" },
            { label: "Timelines", text: "We acknowledge grievances within 48 hours and resolve them within 15 days." },
            { label: "Address", text: "Grievance Officer, Unideals, India" },
          ],
        },
      ],
    },
  ],
};

export const TERMS = {
  id: "terms",
  title: "Terms of Use",
  intro:
    "The rules for using Unideals, written so they're easy to follow. By using Unideals you agree to them, so please give them a read.",
  summary: [
    { icon: "grad", tone: "indigo", title: "Students, 18+ only", text: "One account per person, verified with your student email." },
    { icon: "handshake", tone: "emerald", title: "Deals are between students", text: "We connect you. You check the item and pay the seller directly." },
    { icon: "ban", tone: "rose", title: "Be honest, be kind", text: "No scams, fakes, harassment or banned items. We act on reports." },
    { icon: "card", tone: "amber", title: "Plans are one-time", text: "Pay once through Razorpay. Nothing renews. Activated plans aren't refundable." },
  ],
  sections: [
    {
      id: "accept",
      icon: "check",
      title: "Agreeing to these terms",
      short: "Using Unideals means you accept these terms and our Privacy Policy.",
      body: [
        {
          p: "When you create an account, tap Accept or use Unideals in any way, you agree to these Terms and our Privacy Policy. Together they're a binding agreement between you and Unideals. If you don't agree, please don't use Unideals.",
        },
      ],
    },
    {
      id: "eligibility",
      icon: "grad",
      title: "Who can use Unideals",
      short: "Students aged 18+, at a recognised college, with one verified account.",
      body: [
        {
          list: [
            "You're at least 18 years old",
            "You're currently studying at a recognised college or university in India",
            "You've verified your email before you list, buy, chat or boost. Verification links expire after 24 hours",
            "You have only one account. Duplicate, shared or sold accounts can all be suspended",
            "Your details are accurate and up to date, including your campus and gender",
          ],
        },
      ],
    },
    {
      id: "role",
      icon: "store",
      title: "What Unideals does (and doesn't)",
      short: "We're the meeting place. The deal itself is between the buyer and the seller.",
      body: [
        {
          p: "Unideals helps students find each other to buy and sell. **We are not a party to any deal.** We don't hold your money, own or inspect items, deliver anything, or guarantee that an item is genuine, safe or as described.",
        },
        { p: "The buyer and seller agree the price, payment and handover between themselves." },
      ],
    },
    {
      id: "account",
      icon: "user",
      title: "Your account",
      short: "Keep your login safe. You're responsible for what happens on your account.",
      body: [
        {
          list: [
            "Keep your password private and sign out on shared devices",
            "Everything done from your account counts as done by you",
            "Tell us straight away if you think someone else is using your account",
          ],
        },
      ],
    },
    {
      id: "selling",
      icon: "tag",
      title: "Selling: listing rules",
      short: "Only list what you own, describe it honestly and keep listings up to date.",
      body: [
        {
          list: [
            "Only list items you own or are allowed to sell. Your title, photos, price, category and condition must be accurate",
            "Use your own photos. Don't use stock images, other people's photos or scanned textbook pages",
            "Don't post the same item again within 24 hours. Edit or relist it instead",
            "Mark items as sold, or unlist them, when they're no longer available",
            "Drafts and unlisted items are visible only to you",
            "Your listings show only on your current campus, and move with you if you change campus",
            "We may edit, hide or remove any listing that breaks these rules or the law",
          ],
        },
      ],
    },
    {
      id: "prohibited",
      icon: "ban",
      title: "Items you can't sell",
      short: "Nothing illegal, unsafe, fake or adult.",
      body: [
        {
          list: [
            "Illegal, stolen, counterfeit or recalled goods",
            "Weapons, drugs, alcohol, tobacco, vapes or prescription medicines",
            "Adult or sexual content",
            "Exam papers, assignments-for-hire or anything that breaks your college's academic rules",
            "Digital accounts, subscriptions or tickets you're not allowed to transfer",
            "Animals, or anything that's dangerous to hand over on campus",
          ],
        },
      ],
    },
    {
      id: "deals",
      icon: "handshake",
      title: "Buying, deals and meetups",
      short: "Agree in chat, meet in a public spot on campus, check the item, then pay.",
      body: [
        {
          list: [
            "A deal moves through these stages in chat: agree on a price → the seller confirms (the item is **Reserved** for you) → pickup is set → payment is received → the item is received",
            "The seller can undo one stage at a time before the deal is completed. Either of you can cancel before completion, and the item becomes available again",
            "Meet in busy public campus places such as the library, canteen or main gate. Never meet in a private room or at a home address",
            "Check the item, and test electronics, **before** you pay. Pay the seller directly, in cash or by UPI",
            "Never pay in advance, and never share an OTP, PIN or bank password",
            "Once you confirm you've received the item, the deal is final. There's no platform return or refund for items",
            "If you ever feel unsafe, leave and report the user. No deal is worth the risk",
          ],
        },
      ],
    },
    {
      id: "chat",
      icon: "chat",
      title: "Chat and conduct",
      short: "Keep deals in Unideals chat and treat everyone with respect.",
      body: [
        {
          list: [
            "Keep negotiations in Unideals chat so there's a record. We can't help with deals made entirely off the platform",
            "No harassment, threats, hate speech, discrimination or sexual content. We have zero tolerance for this",
            "No scams, fake payment screenshots, phishing links or pretending to be someone else, including Unideals staff",
            "Don't share anyone's room number, address, live location or ID details",
            "Every message is screened automatically. Flagged messages are hidden and reviewed by our team, and repeat flags pause your messaging for a short time",
            "Turning off read receipts is a Pro and Pro Plus feature. When you turn them off, you also can't see whether others have read your messages",
            "Use block and report rather than arguing",
          ],
        },
      ],
    },
    {
      id: "girls-corner",
      icon: "flower",
      title: "Girls Corner",
      short: "A space for girls only. Misusing it gets your account suspended.",
      body: [
        {
          list: [
            "Girls Corner listings are visible only to girls on your campus",
            "Giving a false gender to get into Girls Corner is a serious violation",
            "Some categories, such as Beauty and Women's Fashion, are automatically girls-only",
          ],
        },
      ],
    },
    {
      id: "payments",
      icon: "card",
      title: "Plans, boosts and payments",
      short: "One-time payments through Razorpay. Nothing renews. Activated purchases aren't refundable.",
      body: [
        {
          list: [
            "Pro and Pro Plus are **one-time payments**. They never renew automatically. The price you see at checkout, including any offer, is the price you pay",
            "Payments are processed by Razorpay. We never see your card, UPI or bank details",
            "Plans and boosts are digital and start working immediately, so they're **non-refundable once activated**, unless the law requires otherwise. If you're charged twice or a payment fails, contact us and we'll sort it out",
            "Raising a chargeback after you've received the benefits removes the plan and may lead to suspension",
            "Monthly boosts reset each calendar month and don't roll over. Deleting a boosted listing ends its boost",
            "Plans belong to your account and can't be transferred, shared or sold",
            "We may change features or prices with reasonable notice. Lifetime benefits you've already bought are honoured",
          ],
        },
      ],
    },
    {
      id: "rewards",
      icon: "trophy",
      title: "XP, ranks and rewards",
      short: "Rewards are a thank-you for being active. They have no cash value.",
      body: [
        {
          list: [
            "XP, levels, ranks (Fresher to Campus Icon) and badges show your reputation. They can't be exchanged for money or transferred",
            "Rank rewards, such as boost credits and free Pro or Pro Plus time, are added automatically. We may adjust or reverse them if they were earned by gaming the system",
            "Fake deals, alternate accounts or other farming can reset your progress and lead to further action",
            "We may adjust how XP, badges and rewards work as Unideals grows",
          ],
        },
      ],
    },
    {
      id: "content",
      icon: "image",
      title: "Your content and our brand",
      short: "You own your photos and text. You let us show them on Unideals.",
      body: [
        {
          list: [
            "You keep ownership of what you upload. You give Unideals a free, non-exclusive licence to store and show it so that Unideals can work, for example showing your listing photos to buyers",
            "Only upload content you have the right to use",
            "The Unideals name, logo, design and software belong to us. Please don't copy, scrape or reuse them",
          ],
        },
      ],
    },
    {
      id: "moderation",
      icon: "flag",
      title: "Reports, moderation and appeals",
      short: "Report anything that feels wrong. People review every report.",
      body: [
        {
          list: [
            "Report a listing, a seller or a chat from the app. Reports are confidential and reviewed by our team",
            "Depending on how serious it is, the outcome can be a warning, removal of the listing, a temporary suspension or a permanent ban",
            "Deliberately false or revenge reports are themselves a violation",
            "If you think we got it wrong, appeal through Help & support. Include your account email and the details",
          ],
        },
      ],
    },
    {
      id: "suspension",
      icon: "lock",
      title: "Suspension and leaving",
      short: "We can suspend accounts that break the rules. You can delete yours any time.",
      body: [
        {
          list: [
            "We may suspend or close accounts for breaking these terms, fraud, chargeback abuse or safety concerns. When that happens, access ends immediately",
            "You can delete your account from Settings at any time. Your listings come down and unused boosts are lost",
            "Some records may be kept, as explained in the Privacy Policy",
          ],
        },
      ],
    },
    {
      id: "liability",
      icon: "scale",
      title: "Our liability",
      short: "We work hard to keep Unideals running well, but we can't guarantee every deal or every minute of uptime.",
      body: [
        {
          list: [
            "Unideals is provided “as is”. We don't promise it will always be available, error-free or completely secure",
            "We're not responsible for losses that come from deals, meetups, listings or the behaviour of other users",
            "As far as the law allows, our total liability for any claim is limited to ₹1,000, and we're not liable for indirect losses such as lost profits or data",
          ],
        },
      ],
    },
    {
      id: "indemnity",
      icon: "shield",
      title: "Your responsibility to us",
      short: "If your actions cause a legal claim against us, you cover the cost.",
      body: [
        {
          p: "If someone makes a claim against Unideals because of your listings, deals, content or a breach of these terms, you agree to cover the resulting losses and reasonable legal costs.",
        },
      ],
    },
    {
      id: "disputes",
      icon: "gavel",
      title: "Disputes and governing law",
      short: "Talk to each other first. Indian law applies, and the courts in Vellore have jurisdiction.",
      body: [
        {
          list: [
            "If a deal goes wrong, try to sort it out with the other student first, using your chat history. Our support team may help informally, but that doesn't make us part of the deal",
            "For a dispute with Unideals, contact us first and we'll try to resolve it in good faith",
            "These terms are governed by Indian law, including the IT Act 2000, the Consumer Protection Act 2019 and the DPDP Act 2023. The courts at Vellore, Tamil Nadu have exclusive jurisdiction",
          ],
        },
      ],
    },
    {
      id: "changes",
      icon: "refresh",
      title: "Changes to these terms",
      short: "We'll tell you at least 7 days before any important change.",
      body: [
        {
          p: `We'll announce important changes in the app or by email at least 7 days before they take effect. If you keep using Unideals after that, you accept the new terms. Questions? Write to ${LEGAL_EMAIL}.`,
        },
      ],
    },
  ],
};

export const LEGAL_DOCS = { privacy: PRIVACY, terms: TERMS };
