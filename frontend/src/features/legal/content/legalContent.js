/*
 * Terms & Privacy content, written for students first: every section has a
 * one-line "In short" and the details below it. Keep facts in sync with the
 * product (FAQ data, subscriptionPlans, deal stages and the handover flow in
 * deal.service.js, retention TTLs, the self-delete flow in
 * user.controller.js, collegeVerification.service.js, labs.service.js and
 * the AI knowledge base).
 *
 * Block types: { p } paragraph · { list: [string | { label, text }] } ·
 * { note, tone: "info" | "warn" }. Wrap words in **double stars** for bold.
 */

export const LEGAL_UPDATED = "22 November 2026";
export const LEGAL_EMAIL = "unideals.support@gmail.com";

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
          p: "Unideals is a campus marketplace where verified students buy and sell with other students on their own campus. This policy explains what personal data we collect, why, who can see it, how we protect it, and the rights you have over it. It follows India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000.",
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
            { label: "Sign-in", text: "Your password, stored only as an irreversible hash, or your basic Google profile (name, email, photo) if you sign in with Google. If your Google account shares your gender with us, we use it to set your gender so you don't have to." },
            { label: "College email (optional)", text: "If you verify your college email for the verified tick, the address and a 6-digit code we email to it. We store only a scrambled (hashed) form of the code, it works for 10 minutes, and it's erased once used. We keep the verified address so one college email can't verify more than one account." },
            { label: "Gender change requests", text: "If you ask to change your gender, a photo of your college ID card. Only our review team sees it, and it's deleted as soon as your request is decided or cancelled." },
            { label: "Listings", text: "Titles, descriptions, photos, prices, categories, condition, pickup spots and drafts. Photos you add from your phone using the QR code are stored the same way." },
            { label: "Activity", text: "Wishlist saves, ratings and reviews you give or receive, boosts, plans, XP, badges and ranks." },
            { label: "Deals", text: "The agreed price, each stage and when it happened, the meetup date, time and place, how the deal was completed (handover code, both of you confirming, or automatically), cancellations with their reason, and any “didn't show up” report." },
            { label: "Messages", text: "Your chats, including photos, voice notes (up to 2 minutes) and reactions you send, so conversations continue across devices. Every text message passes an automatic safety check (see “How we use it”)." },
            { label: "Unideals AI", text: "If you're signed in, your chats with the Unideals AI assistant and any thumbs up or down you give. Phone numbers, UPI IDs, emails and card or Aadhaar numbers are hidden before saving, and photos or voice notes you send are never stored. As a guest, nothing is saved on our servers." },
            { label: "Payments", text: "The plan, amount and Razorpay order and payment IDs. Never card numbers, UPI PINs or bank logins." },
            { label: "Notifications", text: "If you allow push notifications, a notification token for that browser or app and its device type, so we can reach it. Also whether you've switched off the unread-notifications email." },
            { label: "Signed-in devices", text: "For each device you're signed in on: the browser and device type and when it was last used, so we can keep you signed in and sign that device out when you ask." },
            { label: "Support", text: "Anything you send us through Help & support, reports or feedback." },
            { label: "Technical", text: "Your IP address, device and browser type, basic logs (pages visited, searches, errors), and a short-lived record that you viewed a listing, so each person counts once a day." },
          ],
        },
        { note: "We don't collect government IDs, Aadhaar numbers or your exact location. The only ID we ever ask for is your college ID card, and only for a gender change. Your handover code is never stored: it's worked out fresh each time from a random value and a secret key.", tone: "info" },
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
            "Send the messages you'd expect: verification, password resets, deal updates, price-drop alerts and replies to reports, by email, in the app and as push notifications if you turn them on",
            "Run your deals: show the handover code to the buyer, check it when the seller enters it, remind you both after a meetup, finish a deal that one side marked as done if the other doesn't reply within 48 hours, and end a reservation that nobody finished",
            "Show the verified tick on your profile once you've confirmed your college email",
            "Power the campus price guide and demand meter: we combine the prices of listings and completed sales on your campus into anonymous ranges. Nobody can see what you, or any other single person, sold something for",
            "Apply offers you're eligible for, such as the Girls Founder price on plans",
            "Keep the community safe: check reported content and catch spam, scams, fake accounts and abuse. A listing that gets several reports is hidden automatically until our team reviews it",
            "Screen chat messages automatically. Messages with abuse, threats or sexual content are hidden and sent to our team for review. A computer never bans anyone on its own",
            "Answer you in Unideals AI using your campus, plan and your own listings, wishlist and deals, so replies fit you. It never sees your phone number or email. Your AI chats and ratings also help us find and fix answers that miss",
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
            { label: "Visible to students on your campus", text: "Your name, profile photo, campus, rank, badges, rating, plan badge, verified tick (if you have one) and your active listings with their pickup spot name." },
            { label: "Visible to the other person in a deal", text: "The meetup date, time and place you agree, the deal's stage, and messages the app adds to the chat about it, such as “marked as done” or a no-show report." },
            { label: "Reviews", text: "When you rate a seller, your name, photo, star rating and comment appear on their profile." },
            { label: "Visible only in a chat", text: "What you write or send in that conversation, and whether you've read it (if read receipts are on)." },
            { label: "Never shown", text: "Your phone number, email, college email, gender, password, payment details or exact location. Even our staff see only whether you're verified, not your college address." },
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
            { label: "Service providers", text: "Vercel and Render (hosting), MongoDB Atlas (database), ImageKit (listing photos, profile photos and chat voice notes), Cloudinary (photos sent in chat), Razorpay (payments), Resend and EmailJS (email and the contact form), and Google (Google sign-in and Firebase push notifications). They may use your data only to provide their service to us." },
            { label: "AI providers", text: "What you type, photograph or record in Unideals AI is sent to Google's Gemini service to write the reply, along with the marketplace details needed to answer (never your phone number or email). If Gemini is unavailable, text-only messages may go to Groq instead. When you use AI Polish while listing, your notes about the item are sent to Gemini too." },
            { label: "Safety", text: "Our moderation and support team sees reported listings, chats and accounts." },
            { label: "The law", text: "When a court, the police or a regulator in India lawfully requires it." },
            { label: "Business changes", text: "If Unideals merges or is acquired, your data stays protected by this policy." },
          ],
        },
        { note: "Some of these providers store or process data outside India. We only use providers that are bound to keep it secure, as the DPDP Act allows.", tone: "info" },
      ],
    },
    {
      id: "gender",
      icon: "flower",
      title: "Gender and Girls Corner",
      short: "We use your gender only for Girls Corner and the Girls Founder price.",
      body: [
        {
          p: "Girls Corner listings are visible only to girls (and to our moderation team, so they can review reports). To make that work we set your gender once, when you sign up: from your Google account if it shares one with us, otherwise from what you choose. We also use it to apply the Girls Founder price on plans. It isn't shown on your profile and it's never used for ads.",
        },
        {
          list: [
            "To change it later, go to Settings → Profile → Gender, choose the new gender and add a photo of your college ID card. You see a preview before you send it",
            "Our review team checks the photo and approves or rejects the request. You can cancel it at any time before then",
            "The photo is kept in our own database, never on our public photo service, and isn't shared with anyone. Only staff who review these requests can open it, and every view is logged",
            "It's deleted as soon as the request is approved, rejected or cancelled, and automatically after 30 days if it hasn't been reviewed",
          ],
        },
      ],
    },
    {
      id: "cookies",
      icon: "cookie",
      title: "Cookies and on-device storage",
      short: "Only essential cookies. No ad trackers.",
      body: [
        {
          list: [
            "Secure, HttpOnly cookies keep you signed in. Sign-in doesn't work without them",
            "If you aren't signed in, an anonymous visitor cookie (kept for up to a year) makes sure each listing view is counted only once. It holds a random ID, not your name or email",
            "Your browser also stores small conveniences: your theme (Light, Dark, System or another look you pick), a draft you haven't finished, recent searches, anti-spam timers and, if you allow them, your notification settings. You can clear them in your browser settings at any time",
            "When your connection seems slow or drops, the app briefly loads a tiny file from our own site to check it, so it can tell you the problem is the internet. Nothing about you is sent or saved",
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
            "Sign-ups that never verify their email are deleted automatically after 24 hours",
            "Sold listings disappear from the marketplace straight away and are deleted with their photos after about 15 days. Listings you delete are erased after 30 days, and drafts you haven't touched for 30 days are deleted",
            "Photos sent from your phone with the QR code are deleted after 15 minutes if you don't use them",
            "Chat photos and voice notes stay while the chat exists. When both people have deleted a chat, its photos and voice notes are deleted. Voice notes recorded but never sent are deleted after a day",
            "College email codes stop working after 10 minutes and are erased once used. Your verified college address is kept while your account is open",
            "Deal records, including how each deal was completed and any no-show report, are kept until either person deletes their account, because they back up ratings, order history and safety reviews. Sale prices may stay in the anonymous campus price data",
            "Signed-in device records end when you sign out or the session expires",
            "Notifications are kept for 30 days. Records of who viewed a listing are kept for 24 hours",
            "Push notification tokens are removed after about 8 months without opening Unideals on that device",
            "College ID photos for gender change requests are deleted as soon as the request is approved, rejected or cancelled, or after 30 days if it hasn't been reviewed",
            "Unideals AI chats are deleted automatically 90 days after your last message in them. You can delete them sooner from Recent chats in the assistant",
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
            "Only people and systems that need your data for the purposes above can access it, and staff actions are logged",
            "Rate limits and automatic checks block spam and brute-force attempts",
            "If a data breach ever affects you, we'll tell you and the Data Protection Board of India as the law requires",
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
            { label: "Access", text: "Ask for a summary or copy of the personal data we hold about you and who we've shared it with." },
            { label: "Correct", text: "Fix anything wrong. Most of it you can edit yourself in Settings." },
            { label: "Delete", text: "Delete your account from Settings at any time." },
            { label: "Withdraw consent", text: "Stop using Unideals and delete your account. Some features can't work without the data they need. Push notifications can be turned off any time in your browser or phone settings." },
            { label: "Complain", text: "Raise a grievance with us, and if you aren't satisfied, with the Data Protection Board of India." },
            { label: "Nominate", text: "Name someone to exercise these rights for you if you can't." },
          ],
        },
        { p: `Email **${LEGAL_EMAIL}** from your account email, or use Help & support in the app. To stop the unread-notifications email, use the unsubscribe link at the bottom of any of those emails.` },
      ],
    },
    {
      id: "delete",
      icon: "trash",
      title: "Deleting your account",
      short: "One step in Settings. Your account closes and your listings come down immediately.",
      body: [
        {
          list: [
            "Go to Settings → Profile → Account → Delete account and confirm with your password. If you sign in with Google and haven't set a password yet, set one first in Settings → Security",
            "Straight away: you're signed out everywhere, your account can no longer be used, your listings are taken down and removed from other people's wishlists, your boosts end (unused boosts are lost), your chats and the deals and reviews in them are removed for both sides, and your Unideals AI chats and any college ID photo are deleted",
            "The rest of your personal data, such as your profile, pickup spots and chats, is erased within 30 days",
            "Reported chats, reports, payment records and moderation history may be kept in limited form, as explained in “How long we keep it”",
            `Changed your mind? Write to ${LEGAL_EMAIL} soon after deleting and we'll try to restore your account. A deleted account's email can't be used to sign up again until its data has been erased`,
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
    { icon: "handshake", tone: "emerald", title: "Deals are between students", text: "We connect you. Check the item, pay the seller directly, then share your handover code." },
    { icon: "ban", tone: "rose", title: "Be honest, be kind", text: "No scams, fakes, harassment or banned items. We act on reports." },
    { icon: "card", tone: "amber", title: "Plans never auto-renew", text: "Pay once through Razorpay. Founder plans are lifetime, semester plans last 180 days. Activated plans aren't refundable." },
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
            "You've verified your email before you list, buy, chat or boost. Verification links expire after 24 hours, and sign-ups that aren't verified in that time are deleted",
            "You have only one account. Duplicate, shared or sold accounts can all be suspended",
            "Your details are accurate and up to date, including your campus and gender",
          ],
        },
      ],
    },
    {
      id: "verified",
      icon: "check",
      title: "The verified student tick",
      short: "Confirm a college email you own to get the tick. One college email, one account.",
      body: [
        {
          list: [
            "The tick means you proved you can read email at an address on your campus's college domain. It's optional, and you don't need it to buy or sell",
            "Use only your own college email. Verifying with someone else's address, or a shared or borrowed one, is a violation and we'll remove the tick or suspend the account",
            "A college email can verify only one Unideals account. If yours is already linked to another account, contact us",
            "If your sign-in email is already your college email, you get the tick automatically",
            "The tick shows you're a student here. It isn't a promise about any item or deal, so still meet safely and check before you pay",
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
            "Only list items you own or are allowed to sell. Your title, photos, price, category, condition and purchase date must be accurate. Pick the condition whose description matches the item (for example, “Like New” means used a few times with no marks)",
            "The app can fill in parts of your listing for you, such as the category from your title or a description from your details. Check and edit anything it fills in: you're responsible for everything in your listing",
            "Use your own photos. Don't use stock images, other people's photos or scanned textbook pages",
            "Don't post the same item again within 24 hours. Edit or relist it instead",
            "Mark items as sold, or unlist them, when they're no longer available",
            "Drafts and unlisted items are visible only to you. Drafts you don't touch for 30 days are deleted",
            "Your listings show only on your current campus, and move with you if you change campus",
            "Your plan sets how many listings you can have active at once. At the limit, you can't publish or relist until you mark something sold, unlist something or upgrade",
            "Girls-only categories (such as Beauty and Women's Fashion) make a listing Girls Only automatically, and choosing any other category switches it off. You can still choose Girls Only for other categories yourself",
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
      short: "Agree in chat, meet in a public spot, check the item, pay, then the buyer shares their handover code.",
      body: [
        {
          list: [
            "A deal moves through these stages in chat: agree on a price → the seller confirms (the item is **Reserved** for you) → the seller sets the meetup (date, place and optionally a time, in India time) → you meet and finish the deal → **Completed**",
            "Meet in busy public campus places such as the library, canteen or main gate. Never meet in a private room or at a home address",
            "Check the item, and test electronics, **before** you pay. Pay the seller directly, in cash or by UPI. Never pay in advance, and never share an OTP, PIN or bank password",
          ],
        },
        { p: "**Finishing the deal with the handover code**" },
        {
          list: [
            "The buyer has a 4-digit handover code in the chat. **Buyer:** show it to the seller only after you've checked the item and paid. Sharing it is how you confirm you got the item. Never send it in the chat or give it out before the meetup",
            "**Seller:** enter the buyer's code only once you have the money. A correct code completes the deal straight away",
            "Five wrong codes pause code entry for 15 minutes. Trying to guess a code is a violation",
          ],
        },
        { p: "**If the code can't be used**" },
        {
          list: [
            "Either of you can tap “Mark as done”. The other person can confirm it, which completes the deal, or tap “There's a problem” to stop it",
            "If the other person doesn't reply within **48 hours**, the deal completes automatically. Marking a deal as done when it isn't is a violation",
          ],
        },
        { p: "**Missed and forgotten meetups**" },
        {
          list: [
            "After the meetup time, we ask you both whether you met. If nobody finishes or reschedules the deal, the reservation ends about a week after the meetup and the item is available again. If the seller had already confirmed payment, the deal completes instead",
            "If the other person didn't turn up, either of you can report a no-show once the meetup time has passed. This cancels the deal and is recorded. Repeated no-shows, or false no-show reports, may limit your account",
            "Before completion, the seller can undo one stage at a time, or reschedule the meetup, which keeps the same code. Either of you can cancel, and the item becomes available again",
          ],
        },
        { p: "**After completion**" },
        {
          list: [
            "A completed deal is final and the listing is marked sold. There's no platform return or refund for items",
            "If something went wrong, such as an item not as described, report it from the chat. Our team may review the chat and the deal's history, and may correct a deal's status (for example cancel one that never happened). We can't recover money paid between students",
            "If you ever feel unsafe, leave and report the user. No deal is worth the risk",
          ],
        },
      ],
    },
    {
      id: "reviews",
      icon: "star",
      title: "Ratings and reviews",
      short: "Rate honestly, once per completed deal.",
      body: [
        {
          list: [
            "After a completed deal, the buyer can rate the seller once, with an optional comment. Your name and photo show with your review",
            "Rate the deal you actually had. Fake, paid-for or swapped reviews, and reviews used to threaten or pressure someone, aren't allowed",
            "We may remove reviews that are abusive, share personal details or break these terms",
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
            "Photos and voice notes (up to 2 minutes) follow the same rules as text. Don't record or share anyone without their consent, and don't send explicit, violent or someone else's private content",
            "Deleting a chat removes it for you only. Once both of you have deleted it, its photos and voice notes are deleted too. Reports keep the evidence our team needs",
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
            "Girls Corner listings are visible only to girls on your campus, and to our moderation team so they can review reports",
            "Giving a false gender to get into Girls Corner, or to get the Girls Founder price, is a serious violation. We may remove the listing, the plan or the account",
            "Gender changes need a photo of your own, real college ID card. Sending someone else's ID, or an edited or fake one, gets your account suspended",
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
            "Pro and Pro Plus are **one-time payments**. They never renew automatically. Founder plans are lifetime plans: they stay active for as long as your account does. Semester plans last 180 days. The price you see at checkout, including any offer such as the Girls Founder price, is the price you pay",
            "Each plan sets your limits: active listings, wishlist saves, free boosts a month and how many boosts can run at once. The Plans page always shows the current numbers. When you reach a limit, the app tells you which one and what you can do",
            "When a semester plan ends, your account moves to Free. Listings already live stay live, but you can't publish or relist until you're under the Free limit. Saved wishlist items stay, but you can't add more until you're under the limit. A boost that's already running finishes its time",
            "One-time boost add-ons (3 or 7 days) can be bought on any plan, for one listing at a time",
            "Payments are processed by Razorpay. We never see your card, UPI or bank details",
            "Plans and boosts are digital and start working immediately, so they're **non-refundable once activated**, unless the law requires otherwise. If you're charged twice or a payment fails, contact us and we'll sort it out",
            "Raising a chargeback after you've received the benefits removes the plan and may lead to suspension",
            "Monthly boosts reset at the start of each calendar month (India time) and don't roll over. Boost credits earned from ranks are used once your monthly boosts for the month run out. Deleting a boosted listing ends its boost",
            "If a plan is refunded, it ends and the boosts that came with it stop. One-time boost add-ons you bought separately aren't affected",
            "Plans belong to your account and can't be transferred, shared or sold. Deleting your account ends your plan",
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
      id: "ai",
      icon: "sparkles",
      title: "Unideals AI",
      short: "A helpful assistant, not an expert. Check what it tells you.",
      body: [
        {
          list: [
            "Unideals AI and AI Polish can make mistakes. Price estimates, comparisons, checklists and listing drafts are suggestions, so check them before you rely on them",
            "The price guide and demand meter use real listings and sales on your campus, adjusted for condition and age. They're a guide, not a valuation or a promise that your item will sell at that price. When there's little data we say so, and you always choose your own price",
            "Early-access features (marked “Early access”) may change, move to a different plan or be removed",
            "The AI can't make deals, pay, contact sellers or change your account for you",
            "Don't use it to write scams, abuse or banned listings, or try to trick it into ignoring its rules",
            "Don't share passwords, OTPs or bank details with it. You're responsible for anything you post that the AI helped write",
          ],
        },
      ],
    },
    {
      id: "notifications",
      icon: "bell",
      title: "Emails and notifications",
      short: "We send what you need for your account and deals. Push is optional.",
      body: [
        {
          list: [
            "We send account and safety emails, such as verification, password resets and replies to reports, for as long as your account is open",
            "We also send deal updates and reminders, such as a new offer, a scheduled pickup, “mark as done” requests and “did you meet up?” after a meetup",
            "If notifications pile up unread, we may email you a short summary, at most once a day. Every one of those emails has an unsubscribe link",
            "Push notifications are off until you allow them, and you can turn them off any time in your browser or phone settings",
            "Unideals will never ask for your password, OTP or payment details by email, chat or call",
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
            "The Unideals name, logo, design and software belong to us. Please don't copy, scrape or reuse them, or use bots to access Unideals",
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
            "A listing that gets several reports is hidden automatically until our team reviews it",
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
            "You can delete your account from Settings at any time. Your listings come down, your plan ends and unused boosts are lost",
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
            "We're not responsible for losses that come from deals, meetups, listings, AI suggestions, price guides or the behaviour of other users, including someone who shares a handover code, confirms a deal or marks it as done before the item and money have actually changed hands",
            "As far as the law allows, our total liability for any claim is limited to ₹1,000, and we're not liable for indirect losses such as lost profits or data",
            "Nothing in these terms takes away rights you have under Indian consumer law that can't be excluded",
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
      id: "general",
      icon: "info",
      title: "General",
      short: "The usual legal housekeeping.",
      body: [
        {
          list: [
            "These Terms and the Privacy Policy are the whole agreement between you and Unideals about using Unideals",
            "If a court finds part of these terms invalid, the rest still applies",
            "If we don't enforce a rule straight away, we can still enforce it later",
            "You can't transfer your rights under these terms to someone else. We may transfer ours if Unideals merges or is acquired",
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
          p: `We'll announce important changes in the app or by email at least 7 days before they take effect. If you keep using Unideals after that, you accept the new terms. Questions? Write to ${LEGAL_EMAIL} or use Help & support in the app.`,
        },
      ],
    },
  ],
};

export const LEGAL_DOCS = { privacy: PRIVACY, terms: TERMS };
