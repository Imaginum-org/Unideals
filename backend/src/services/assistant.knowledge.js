/**
 * UniDeals AI Assistant Knowledge Base — COMPREHENSIVE EDITION v3.0
 * 40+ dense structured entries covering every aspect of the platform,
 * from extreme basics to extreme advanced policies and procedures.
 *
 * Entry scoring: multi-word phrases = 6pts, single keyword = 3pts, term overlap = 1pt
 */

const normalize = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitTerms = (value = "") => normalize(value).split(" ").filter(Boolean);

const makeEntry = ({
  id,
  title,
  keywords,
  answer,
  steps = [],
  route = null,
  source = "UniDeals knowledge base",
  suggestions = [],
}) => ({
  id,
  title,
  keywords: keywords.map(normalize),
  answer,
  steps,
  route,
  source,
  suggestions,
});

export const ASSISTANT_KNOWLEDGE_BASE = [

  // ═══════════════════════════════════════════════════
  //  PLATFORM BASICS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "what_is_unideals",
    title: "What is UniDeals?",
    keywords: [
      "what is unideals", "what is this", "about unideals", "unideals kya hai",
      "ye kya hai", "tell me about", "what is campus mart", "what is this app",
      "what is this website", "what does unideals do", "kya karta hai",
      "introduce yourself", "platform kya hai", "marketplace kya hai",
      "about this platform", "about campus mart", "what is this site",
      "campus marketplace", "student marketplace", "peer to peer",
    ],
    answer:
      "UniDeals (Campus-Mart) is a peer-to-peer campus marketplace built exclusively for verified Indian college students. It lets you buy, sell, and exchange pre-owned items — electronics, cycles, books, hostel essentials, clothing, lab equipment, event passes, and more — safely within your own campus community. Think of it as OLX, but only for your campus, with student verification, AI-powered price estimates, smart listing tools, in-app chat, boost features, and subscription plans designed for student budgets.",
    steps: [
      "Students sign up and verify their college email to join.",
      "Sellers upload listings with photos, price, condition, and a campus pickup location.",
      "Buyers browse, search by category, or ask the AI assistant to find deals.",
      "Buyer and seller negotiate via in-app chat.",
      "They meet at a safe public campus spot, inspect the item, and exchange payment (UPI/cash).",
      "UniDeals never handles money — all transactions happen directly between students.",
    ],
    route: "/",
    suggestions: ["How do I sign up?", "Is UniDeals free?", "How do I sell something?"],
  }),

  makeEntry({
    id: "who_can_use",
    title: "Who Can Use UniDeals? — Eligibility",
    keywords: [
      "who can use", "eligibility", "eligible", "college student", "university",
      "age limit", "age requirement", "koun use kar sakta", "student only",
      "non student", "alumni", "faculty", "teacher", "staff", "school student",
      "18 years", "minor", "underage", "verified student", "student verification",
      "which college", "recognized college", "indian college", "valid student email",
      "one account per person", "duplicate account policy",
    ],
    answer:
      "UniDeals is exclusively for students aged 18+ currently enrolled at a recognized Indian college or university. You must verify your student email (e.g., @college.edu, @domain.ac.in) to access selling, chatting, wishlisting, and all protected features. Guest browsing of public listings is allowed without an account. Alumni, faculty, school students, and non-students cannot use the marketplace. Strict one account per person — duplicate or fake accounts are permanently banned without appeal.",
    steps: [
      "Must be at least 18 years old.",
      "Must be an active student at a recognized Indian college or university.",
      "Verify your student/university email during signup.",
      "Only one account per person — duplicates result in permanent suspension.",
      "Guest browsing of public listings is allowed without an account.",
      "Alumni, faculty, staff, school students, and non-students are NOT eligible.",
    ],
    route: "/signup",
    suggestions: ["How do I verify my email?", "Can alumni use UniDeals?", "How do I sign up?"],
  }),

  makeEntry({
    id: "is_it_free",
    title: "Is UniDeals Free? — Cost & Charges",
    keywords: [
      "is it free", "free hai kya", "cost", "charge", "paisa lagta hai",
      "fees", "kharcha", "subscription zaruri", "do i need to pay",
      "free to use", "hidden charges", "commission", "platform fee",
      "koi charge hai", "free account", "paid", "kitna paisa",
      "transaction fee", "no commission", "0 commission",
    ],
    answer:
      "Yes, UniDeals is completely free to use! You can sign up, browse, search, wishlist, chat, and buy — all at zero cost. The Free plan includes up to 10 active listings and 25 wishlist saves. UniDeals NEVER charges commission on any transaction. Optional paid plans (Pro: ₹99 lifetime, Pro+: ₹199 lifetime) unlock extra listings, monthly boosts, and search priority — but the core marketplace is 100% free.",
    steps: [
      "Sign up for free with your college email.",
      "Free plan: 10 active listings, 25 wishlist saves, standard search visibility.",
      "Pro plan (₹99 lifetime): 25 listings, 2 monthly 3-day boosts, 100 wishlist, high search priority.",
      "Pro+ plan (₹199 lifetime): Unlimited listings, 5 monthly 7-day boosts, unlimited wishlist, highest priority.",
      "No commission or hidden fees on any transaction — ever.",
      "Add-on boosts: ₹29 (3-day) or ₹49 (7-day), available to ALL users including Free plan.",
    ],
    route: "/price",
    suggestions: ["What does Pro give me?", "How do I upgrade?", "What are boost add-ons?"],
  }),

  makeEntry({
    id: "how_it_works",
    title: "How Does UniDeals Work? — Full Process",
    keywords: [
      "how does it work", "how it works", "kaise kaam karta", "kaise use kare",
      "explain the process", "buying selling process", "step by step",
      "process kya hai", "flow", "how to use unideals", "getting started",
      "start kaise kare", "shuru kaise kare", "guide me", "walk me through",
      "how does buying work", "how does selling work", "samjhao",
    ],
    answer:
      "UniDeals works in 6 simple steps: Sign up → List or Browse → Chat → Meet on Campus → Inspect → Pay & Exchange. Sellers create listings with photos and pricing. Buyers find items via search, categories, or the AI assistant. All negotiations happen through in-app chat. Meetups must be at public campus locations. Payment (UPI or cash) happens only AFTER the buyer inspects the item in person. UniDeals never handles money or arranges shipping — it's a direct peer-to-peer exchange.",
    steps: [
      "Step 1: Sign up with your college email and verify your account.",
      "Step 2 (Sellers): Upload your item with photos, price, condition, and pickup address.",
      "Step 2 (Buyers): Browse the home page, search, explore categories, or ask the AI assistant.",
      "Step 3: Use in-app Chat to negotiate price and confirm meetup details.",
      "Step 4: Agree on a public campus meetup spot and time.",
      "Step 5: Meet in person. Buyer inspects the item BEFORE paying.",
      "Step 6: Pay via UPI (GPay/PhonePe/Paytm) or cash ONLY after confirming the product is as described.",
    ],
    route: "/",
    suggestions: ["How do I sell something?", "How do I buy?", "Is it safe?"],
  }),

  makeEntry({
    id: "campus_coverage",
    title: "Which Colleges Does UniDeals Cover?",
    keywords: [
      "which college", "campus coverage", "my college", "available at",
      "supported college", "kaunsa college", "mere college mein", "city",
      "college list", "university list", "all india", "pan india",
      "is my college supported", "does it work at my college", "available in my city",
    ],
    answer:
      "UniDeals is designed for ALL recognized Indian colleges and universities. As long as you have a valid student email from a recognized institution, you can join. The marketplace works best when multiple students from the same campus join, so invite your hostel-mates and classmates! The more students on your campus, the more deals you'll find and the faster items sell.",
    steps: [
      "Any recognized Indian college or university student can join.",
      "You need a valid student email to verify your account.",
      "The platform becomes more useful as more students from your campus join.",
      "Share UniDeals with hostel-mates and classmates to build your campus marketplace.",
      "There is no college-specific approval needed — your student email is sufficient.",
    ],
    route: "/signup",
    suggestions: ["How do I sign up?", "How do I invite friends?", "Is UniDeals free?"],
  }),

  // ═══════════════════════════════════════════════════
  //  ACCOUNT & AUTHENTICATION
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "forgot_password",
    title: "Forgot Password / Reset Password",
    keywords: [
      "forgot password", "reset password", "password bhool gaya", "can't login",
      "login nahi ho raha", "change password", "new password", "password reset",
      "password change", "lost password", "mera password", "pwd reset",
      "account access", "locked out", "sign in problem", "login issue",
      "unable to login", "password nahi pata", "password yaad nahi",
    ],
    answer:
      "If you've forgotten your password, use the 'Forgot Password' link on the login page. You'll receive a password reset email at your registered address. Click the reset link (valid for a limited time), set a new password, and log in. If you signed up with Google OAuth, you don't have a separate UniDeals password — just click 'Sign in with Google'.",
    steps: [
      "Go to the Login page (/login).",
      "Click 'Forgot Password' below the login form.",
      "Enter your registered email address.",
      "Check your inbox and spam folder for the reset email.",
      "Click the password reset link in the email (expires after a set time).",
      "Set a new strong password and confirm it.",
      "Log in with your new password.",
      "If you used Google Sign-In, click 'Sign in with Google' — no separate password needed.",
    ],
    route: "/login",
    suggestions: ["How do I sign up?", "How do I sign in with Google?", "How do I contact support?"],
  }),

  makeEntry({
    id: "delete_account",
    title: "Delete Account / Remove Data",
    keywords: [
      "delete account", "remove account", "account delete", "account hatao",
      "data delete", "erase data", "remove my data", "mera account band karo",
      "close account", "deactivate", "account delete kaise kare",
      "privacy delete", "mera data hatao", "gdpr", "data removal",
      "30 days deletion", "how long to delete", "data purge",
    ],
    answer:
      "To delete your UniDeals account and associated data, email privacy@campusmart.in with your registered email and a deletion request. Your account, listings, chat history, and personal data will be permanently removed within 30 days. Some records may be retained if required by Indian law (e.g., fraud investigations). This action is irreversible — all your listings, wishlist, and chat history will be permanently lost.",
    steps: [
      "Send an email to privacy@campusmart.in from your registered email.",
      "Subject line: 'Account Deletion Request'.",
      "Include your registered email address and reason (optional).",
      "Receive a confirmation with an estimated deletion timeline.",
      "Your data will be deleted within 30 days.",
      "You will receive a confirmation email once deletion is complete.",
      "Note: This is permanent — listings, chats, and wishlist cannot be recovered after deletion.",
      "Records required for fraud investigations or legal compliance may be retained longer.",
    ],
    route: "/settings",
    suggestions: ["What data does UniDeals collect?", "How do I change my password?", "Contact support"],
  }),

  makeEntry({
    id: "google_login",
    title: "Google Sign-In / OAuth Login",
    keywords: [
      "google login", "sign in with google", "google se login", "oauth",
      "google account", "gmail login", "google sign up", "google se signup",
      "social login", "one click login", "google button", "google authentication",
    ],
    answer:
      "UniDeals supports Google OAuth2 for quick, secure sign-in. Click 'Sign in with Google' on the login or signup page, select your Google account, and your UniDeals account is created instantly — no separate password needed. You can update your display name and other details later in Settings. Note: Google OAuth users manage passwords via Google account settings.",
    steps: [
      "Go to the Login or Signup page.",
      "Click the 'Sign in with Google' button.",
      "Select your Google account from the popup.",
      "Your UniDeals account is created automatically.",
      "Update your profile details in Settings if needed.",
      "To change your display name, go to Settings → Edit Profile.",
    ],
    route: "/login",
    suggestions: ["How do I edit my profile?", "How do I verify my email?", "How do I sell something?"],
  }),

  makeEntry({
    id: "email_verification",
    title: "Email Verification — Why and How",
    keywords: [
      "verify email", "email verification", "verification", "verify kaise kare",
      "email confirm", "verification link", "email nahi aaya", "otp",
      "verify account", "why verify", "verification required", "unverified",
      "resend verification", "verification email not received", "verification expired",
      "student email required", "college email required", "ac.in email",
    ],
    answer:
      "Email verification confirms you're a real student at a recognized Indian college. After signing up, check your inbox for a verification email from UniDeals. Click the verification link to activate your account. Verified accounts unlock: listing products, wishlisting, chatting with sellers, and all protected features. Without verification, you can only browse public listings. If the email doesn't arrive, check spam or request a resend.",
    steps: [
      "Sign up with your student/university email.",
      "Check your inbox for the verification email from UniDeals.",
      "If not in inbox, check the Spam/Junk folder.",
      "Click the verification link in the email.",
      "Your account is now verified — all features are unlocked!",
      "If the link expired, request a new verification email from the login page.",
      "Contact support@campusmart.in if you continue to have issues.",
    ],
    route: "/signup",
    suggestions: ["How do I sign up?", "I didn't receive the email", "What can I do without verification?"],
  }),

  makeEntry({
    id: "logout_steps",
    title: "How to Log Out",
    keywords: [
      "logout", "log out", "sign out", "signout", "logout kaise kare",
      "sign out kaise kare", "exit account", "account se bahar kaise jaaye",
    ],
    answer:
      "To log out, click your profile avatar or menu icon in the top-right corner, then select 'Logout' from the dropdown. You'll be signed out and redirected to the homepage. Your listings and data remain safe — log back in anytime.",
    steps: [
      "Click your profile avatar or the menu icon (top-right corner of any page).",
      "Select 'Logout' from the dropdown menu.",
      "You'll be signed out and redirected to the homepage.",
      "All your listings and saved data remain safe and will be available when you log back in.",
    ],
    route: "/",
    suggestions: ["How do I change my password?", "How do I edit my profile?", "How do I delete my account?"],
  }),

  // ═══════════════════════════════════════════════════
  //  TERMS, POLICIES & LEGAL
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "terms_overview",
    title: "Terms and Conditions — Overview",
    keywords: [
      "terms", "terms and conditions", "rules", "conditions", "legal",
      "what are the rules", "everything about terms", "platform rules",
      "user agreement", "terms of service", "tos", "terms of use",
      "full terms", "all rules", "complete terms",
    ],
    answer:
      "UniDeals operates as a Section 79 IT Act intermediary — a technology facilitator, not a party to transactions. Key rules: Must be 18+, active Indian college student, one verified account per person. Post honest listings of legally owned items, meet safely on campus, and avoid prohibited items or fraudulent activities. Violations result in warnings, suspension, or permanent ban. Platform liability is capped at ₹1,000 under Indian law. Governing law: Republic of India, IT Act 2000, DPDP Act 2023.",
    steps: [
      "Use only one verified student account.",
      "Post accurate product details, real photos, honest prices, and a campus pickup location.",
      "Meet buyers or sellers only in safe public campus locations during daylight.",
      "Do not sell prohibited items (drugs, weapons, alcohol, stolen goods, counterfeit, exam leaks, etc.).",
      "Do not harass users, create fake reviews, misrepresent products, or move transactions off-platform.",
      "Report suspicious users or listings from the report/flag option.",
      "Violations: 1st = Warning + listing removed. 2nd = Suspension. 3rd or serious = Permanent ban.",
    ],
    route: "/termscondition",
    suggestions: ["What items are prohibited?", "How do I report a scam?", "What is the liability cap?"],
  }),

  makeEntry({
    id: "prohibited_items",
    title: "What Items Are Prohibited on UniDeals?",
    keywords: [
      "prohibited items", "banned items", "not allowed", "what can i sell",
      "restricted items", "illegal items", "kya nahi bech sakte", "banned products",
      "prohibited list", "not permitted", "contraband", "restricted",
      "can i sell alcohol", "can i sell medicines", "can i sell weapons",
      "can i sell exam papers", "can i sell services", "can i resell commercially",
      "counterfeit goods", "stolen goods", "adult content", "drugs", "tobacco",
      "prescription medicines", "explosive", "firearms", "knives", "exam leaks",
      "academic dishonesty", "dropshipping", "bulk reselling", "digital products",
      "hazardous chemicals", "flammable", "medical equipment",
    ],
    answer:
      "UniDeals strictly prohibits: Alcohol, drugs, tobacco, e-cigarettes, prescription medicines. Weapons (knives, firearms, explosives). Counterfeit/fake products, stolen goods. Adult/explicit content. Exam leaks, answer keys, academic dishonesty materials, contract cheating services. Bulk commercial reselling or dropshipping (not personal student sales). Digital-only products or services/freelancing. Hazardous chemicals, flammable liquids. Banned activities: Bait-and-switch pricing, misrepresenting condition, harassment, scraping, off-platform solicitation. Violations = listing removal + account penalties up to permanent ban.",
    steps: [
      "Banned: Alcohol, drugs, tobacco, prescription medicines, e-cigarettes.",
      "Banned: Weapons (knives, firearms, explosives, edged weapons).",
      "Banned: Counterfeit/fake products, stolen property.",
      "Banned: Adult/obscene/explicit content.",
      "Banned: Exam leaks, academic dishonesty materials, plagiarized work.",
      "Banned: Bulk commercial reselling, dropshipping (platform is for genuine personal student sales).",
      "Banned: Services, freelancing gigs, digital-only products (physical campus goods only).",
      "Banned: Hazardous chemicals, flammable liquids.",
      "Banned activities: Bait-and-switch, fake photos, misrepresented condition, harassment, scraping.",
    ],
    route: "/termscondition",
    suggestions: ["How do I report a prohibited listing?", "What are the penalties?", "What CAN I sell?"],
  }),

  makeEntry({
    id: "platform_liability",
    title: "Platform Liability, Disputes & Legal Responsibility",
    keywords: [
      "liability", "platform liability", "liability cap", "1000 cap",
      "who is responsible", "unicount responsible", "dispute resolution",
      "what if deal goes wrong", "platform responsibility", "intermediary",
      "section 79", "it act 2000", "governing law", "jurisdiction", "legal notice",
      "legal email", "legal@campusmart.in", "dpdp act", "india law", "court jurisdiction",
      "no escrow", "no refund from platform", "platform not liable",
    ],
    answer:
      "UniDeals acts as a technology intermediary under Section 79 of the Information Technology Act, 2000 — it facilitates connections but is NOT a party to any transaction. Platform liability is capped at ₹1,000 under Indian law. UniDeals does not hold funds, arrange escrow, process payments, manage delivery, or guarantee transaction outcomes. For financial disputes, students must resolve through appropriate legal channels. UniDeals cooperates with law enforcement for criminal activity reports. Legal notices: legal@campusmart.in. Governed by the laws of India; jurisdiction: Indian courts.",
    steps: [
      "UniDeals is a Section 79 IT Act intermediary — not a participant in transactions.",
      "Platform liability is capped at ₹1,000 under Indian law.",
      "UniDeals does not hold funds, manage escrow, or process payments.",
      "For financial disputes, students must seek resolution through appropriate legal channels.",
      "UniDeals cooperates with law enforcement in cases of reported fraud or crime.",
      "Legal notices and formal complaints: legal@campusmart.in.",
      "All platform activities are governed by the laws of the Republic of India.",
    ],
    route: "/termscondition",
    suggestions: ["What if I was scammed?", "How do I report fraud?", "What is the return policy?"],
  }),

  makeEntry({
    id: "moderation_penalties",
    title: "Moderation, Account Penalties & Appeals",
    keywords: [
      "moderation", "penalties", "account penalties", "account ban", "suspended",
      "warning", "first violation", "second violation", "third violation",
      "account suspension", "permanent ban", "appeal suspension", "appeal ban",
      "how many violations", "penalty ladder", "suspension duration",
      "7 day suspension", "30 day suspension", "lifetime ban",
      "listing removed", "listing moderated", "banned account new account",
      "refund after ban", "ban refund",
    ],
    answer:
      "UniDeals moderation team reviews flagged content within 2 hours. Penalty ladder: 1st violation = Warning issued + listing removed. 2nd violation = Temporary suspension (7-30 days depending on severity). 3rd violation OR any serious offense (fraud, prohibited items, harassment, criminal activity) = Permanent account ban. Permanently banned users cannot create new accounts. Appeals against suspension can be submitted to support@campusmart.in with supporting evidence. Banned accounts are NOT entitled to subscription refunds. False reports to manipulate the system are also penalized.",
    steps: [
      "1st violation: Warning + listing removed.",
      "2nd violation: Temporary suspension (7-30 days based on severity).",
      "3rd violation or serious offense: Permanent ban, no exceptions.",
      "Permanently banned users cannot recreate accounts with the same identity.",
      "To appeal a suspension: email support@campusmart.in with evidence.",
      "Banned accounts forfeit any remaining subscription benefits.",
      "Abusing the report system (false reports) is also a punishable offense.",
    ],
    route: "/termscondition",
    suggestions: ["How do I report a violation?", "How do I contact support?", "What items are prohibited?"],
  }),

  // ═══════════════════════════════════════════════════
  //  SELLING — DETAILED
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "sell_upload_steps",
    title: "How to Sell / Upload a Product — Step by Step",
    keywords: [
      "sell", "upload", "post product", "list product", "create listing",
      "add product", "how to sell", "kaise bechun", "product list kaise kare",
      "listing banao", "sell karna hai", "item kaise sell kare",
      "sell my item", "upload product", "post item", "list item",
    ],
    answer:
      "To sell on UniDeals: Go to Upload (/upload) → Fill title, category, condition, usage duration, and description (use AI Polish for auto-generation!) → Upload 1-3 real photos → Set original price and selling price (selling price CANNOT exceed original price) → Toggle 'Negotiable' if applicable → Add a public campus pickup address → Accept T&C → Preview → Publish. Your listing goes live immediately for all campus students!",
    steps: [
      "Go to Upload from the menu (or click the + / Sell button in the navbar).",
      "Enter a clear, accurate Product Title (e.g., 'Dell Laptop 8GB RAM — Used 1 Year').",
      "Select the correct Category.",
      "Choose Condition: Brand New / Like New / Gently Used / Well Used / For Parts or Not Working.",
      "Select Usage Duration (less than 1 month to more than 2 years).",
      "Write a description — or click AI Polish to auto-generate one with Gemini AI!",
      "Upload 1-3 REAL photos of the actual item (front, back, accessories/defects). No stock images.",
      "Enter Original Price and Selling Price. Selling price cannot exceed original price.",
      "Toggle 'Price Negotiable' if open to bargaining.",
      "Select or add a safe, public Campus Pickup Address.",
      "Accept Terms & Conditions and Privacy Policy.",
      "Click 'Preview' to review, then 'Publish Listing'.",
    ],
    route: "/upload",
    suggestions: ["Help me write a listing", "Estimate a fair price", "What photos should I upload?"],
  }),

  makeEntry({
    id: "edit_listing",
    title: "Edit or Update a Listing",
    keywords: [
      "edit listing", "update listing", "change listing", "modify listing",
      "edit product", "listing edit kaise kare", "price change", "description change",
      "update my product", "change price", "edit my post", "modify my ad",
      "listing mein change", "product update",
    ],
    answer:
      "To edit a listing, go to My Listings (/myorders or /productlisted). Find the product and click on it to open the edit view. You can update the title, description, price, condition, photos, and pickup address. Save changes — your listing updates immediately for all buyers.",
    steps: [
      "Go to My Orders or My Listings from your profile menu.",
      "Find the product you want to edit.",
      "Click on the product to open the edit view.",
      "Update any details: title, description, price, condition, photos, or pickup address.",
      "Click 'Save Changes' to publish the update.",
      "Your updated listing is immediately visible to buyers.",
    ],
    route: "/myorders",
    suggestions: ["How do I delete a listing?", "How do I boost my listing?", "How do I set a fair price?"],
  }),

  makeEntry({
    id: "delete_listing",
    title: "Delete a Listing or Mark as Sold",
    keywords: [
      "delete listing", "remove listing", "listing hatao", "listing delete kaise",
      "remove my product", "take down listing", "delete my post", "product hatana hai",
      "sold item remove", "listing remove", "delist", "unpublish",
      "mark as sold", "sold mark karo", "item bikk gaya", "how to mark sold",
    ],
    answer:
      "To remove a listing: Go to My Orders/My Listings → Find the product → Click Delete or Remove and confirm. If the item is sold, mark it as 'Sold' instead of deleting — this archives it while signaling to buyers it's no longer available. Deleted listings cannot be recovered. Keep listings updated to avoid misleading buyers.",
    steps: [
      "Go to My Orders or My Listings from your profile menu.",
      "Find the listing you want to remove.",
      "To mark as Sold: Click 'Mark as Sold'. Listing is archived, removed from active search.",
      "To permanently delete: Click the delete/remove button and confirm.",
      "Deleted listings cannot be recovered.",
      "If you still have the item available, you can re-list it as a new listing.",
    ],
    route: "/myorders",
    suggestions: ["How do I edit a listing?", "How do I sell something?", "How do I boost a listing?"],
  }),

  makeEntry({
    id: "listing_not_showing",
    title: "Why Is My Listing Not Showing or Visible?",
    keywords: [
      "listing not showing", "product not visible", "listing not appearing",
      "can't see my listing", "listing nahi dikh raha", "where is my listing",
      "my product disappeared", "listing hide", "not appearing in search",
      "listing pending", "moderation", "under review", "listing removed",
      "listing blocked", "why is listing hidden", "listing not live",
    ],
    answer:
      "If your listing isn't showing, reasons include: (1) Under moderation review, (2) Removed for violating platform rules (prohibited items, misleading info, stock photos), (3) Selling price exceeds original price, (4) You've hit your listing limit (Free: 10, Pro: 25, Pro+: Unlimited), (5) Temporary technical issue. Check My Orders to see your listing's current status.",
    steps: [
      "Go to My Orders/My Listings to check your listing's status.",
      "If 'Under Review': wait for moderation to approve (usually within 2 hours).",
      "If removed: check your registered email for the moderation reason.",
      "Ensure selling price is NOT higher than the original price.",
      "Verify you haven't exceeded your plan's listing limit (Free: 10, Pro: 25, Pro+: Unlimited).",
      "Ensure photos are real images of the actual item (no stock photos).",
      "If the issue persists, contact support@campusmart.in.",
    ],
    route: "/myorders",
    suggestions: ["What items are prohibited?", "How do I edit my listing?", "How do I contact support?"],
  }),

  makeEntry({
    id: "what_photos",
    title: "What Photos Should I Upload for My Listing?",
    keywords: [
      "what photos", "how many photos", "photo tips", "image tips",
      "kaunsi photo", "kitni photo", "photography tips", "listing photos",
      "product photos", "photo upload", "picture tips", "clear photos",
      "photo quality", "achhi photo kaise", "image size", "photo rules",
      "stock image", "real photo", "no stock images", "internet photo",
      "photo guidelines", "content rules photos",
    ],
    answer:
      "Upload 1-3 clear, real photos of your ACTUAL item — no stock images or internet screenshots. Good photos dramatically increase buyer interest. Take photos in natural daylight, show multiple angles (front, back, sides), and highlight any wear, damage, or accessories. For electronics, show the screen powered on. For books, show the cover, spine, and inside condition.",
    steps: [
      "Take photos in good natural daylight — avoid dark, blurry, or filtered images.",
      "Photo 1: Front/main view of the item.",
      "Photo 2: Back or alternate angle showing overall condition.",
      "Photo 3: Close-up of any wear, damage, defects, or included accessories.",
      "For electronics: show the screen powered ON to prove it works.",
      "For books: show the front cover, spine, and any highlighting/notes inside.",
      "Use ONLY real photos of your own item — stock images or internet photos are prohibited.",
      "Maximum 3 images per listing.",
    ],
    route: "/upload",
    suggestions: ["How do I sell something?", "How do I set a fair price?", "Help me write a listing"],
  }),

  makeEntry({
    id: "listing_price_rules",
    title: "Listing Price Rules — Selling Price Cannot Exceed Original Price",
    keywords: [
      "price rules", "selling price rules", "original price", "mrp", "original mrp",
      "price limit", "can i set higher price", "price above mrp", "listing price cap",
      "selling price maximum", "price cannot exceed", "higher than original",
      "why is price capped", "price rule policy", "price limit rule",
    ],
    answer:
      "The selling price on UniDeals CANNOT exceed the original MRP or purchase price of the item. This rule ensures fair dealing in the campus marketplace — UniDeals is for students to sell pre-owned items at fair or discounted prices, not for commercial reselling at a profit. If you try to set a price above the original, the listing will fail to publish. For items without a clear original price, use a reasonable market estimate.",
    steps: [
      "Selling price must be LESS THAN OR EQUAL TO the original purchase price/MRP.",
      "You cannot list an item at a higher price than what you originally paid for it.",
      "This prevents commercial reselling and profiteering on the student marketplace.",
      "If your item has added value (custom modification), note it in the description but price it fairly.",
      "For items without a clear original price, use a reasonable market estimate.",
      "Listings with price above original price will be rejected or removed by moderation.",
    ],
    route: "/upload",
    suggestions: ["How do I estimate a fair price?", "How do I sell something?", "What items are prohibited?"],
  }),

  makeEntry({
    id: "listing_duration",
    title: "How Long Does a Listing Stay Active?",
    keywords: [
      "how long listing", "listing duration", "listing expiry", "listing expire",
      "kitne din", "listing validity", "active period", "auto delete",
      "listing kab tak", "does listing expire", "permanent listing",
    ],
    answer:
      "Listings on UniDeals stay active indefinitely until you manually remove them, mark them as sold, or they're removed by moderation. There is NO automatic expiry. However, keep listings updated — mark items as sold or remove them when they're no longer available to avoid misleading buyers. Boosted listings have a timed visibility boost (3 or 7 days), but the listing itself stays active.",
    steps: [
      "Listings remain active indefinitely until manually removed.",
      "Mark items as 'Sold' when the deal is complete or item is no longer available.",
      "Boost visibility is time-limited (3 or 7 days), but the listing itself stays active.",
      "Keep listings updated with current availability and pricing.",
      "Listings may be removed by moderation if they violate platform rules.",
    ],
    route: "/myorders",
    suggestions: ["How do I delete a listing?", "How do I boost a listing?", "How do I edit a listing?"],
  }),

  makeEntry({
    id: "listing_limits",
    title: "How Many Items Can I List? — Listing Limits by Plan",
    keywords: [
      "how many listings", "listing limit", "max listings", "kitne product",
      "listing cap", "can i list more", "limit reached", "maximum products",
      "free listing limit", "pro listing limit", "pro plus unlimited",
      "listing quota", "exceeded limit", "cant create listing",
    ],
    answer:
      "Active listing limits by plan: Free = 10 active listings. Pro = 25 active listings. Pro+ = Unlimited listings. If you've reached your limit, either upgrade your plan or remove old/sold listings to make room. Listing limits are per active listing — sold or deleted listings don't count against your limit.",
    steps: [
      "Free plan: Up to 10 active listings.",
      "Pro plan (₹99 lifetime): Up to 25 active listings.",
      "Pro+ plan (₹199 lifetime): Unlimited active listings.",
      "To list more: remove sold or outdated listings, or upgrade your plan.",
      "Sold and deleted listings do not count against your active listing limit.",
      "Check your current plan in the Subscription section of your profile.",
    ],
    route: "/price",
    suggestions: ["How do I upgrade to Pro?", "How do I delete a listing?", "What does Pro+ include?"],
  }),

  // ═══════════════════════════════════════════════════
  //  BUYING — DETAILED
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "buy_steps",
    title: "How to Buy a Product — Step by Step",
    keywords: [
      "buy", "purchase", "how to buy", "contact seller", "message seller", "order",
      "kaise khareedun", "product khareedna hai", "buy kaise kare",
      "kaise order kare", "buyer process", "buying steps",
    ],
    answer:
      "To buy on UniDeals: Search/Browse → Click a product card → Review details → Chat with seller → Negotiate → Confirm meetup → Inspect in person → Pay ONLY after inspection. Payment via UPI or cash at the meetup location. Never pay advance online.",
    steps: [
      "Browse Home, Search, or a Category page.",
      "Open a product card to view photos, price, condition, seller details, and pickup area.",
      "Use 'Chat with Seller' / 'Message Seller' to ask questions and negotiate.",
      "Use AI: 'Ask AI for Fair Price & Inspection Tips' on the product page.",
      "Agree on a public campus meetup spot and time.",
      "Meet the seller in person at the agreed public location.",
      "Inspect the item thoroughly before making any payment.",
      "Pay ONLY after confirming the item is as described — UPI (GPay/PhonePe/Paytm) or cash.",
    ],
    route: "/search",
    suggestions: ["What should I inspect before buying?", "Is advance payment safe?", "Find electronics under 5000"],
  }),

  makeEntry({
    id: "negotiation_tips",
    title: "How to Negotiate Price",
    keywords: [
      "negotiate", "negotiation", "bargain", "price kam karo", "discount",
      "bargaining tips", "how to negotiate", "mol bhav", "rate kam karo",
      "price negotiable", "offer price", "counter offer", "haggle",
      "price discuss", "is price final", "can i negotiate", "bargain karna",
    ],
    answer:
      "Many UniDeals listings are marked 'Negotiable'. To negotiate: Open Chat with the seller, politely suggest a counter-offer based on research. A good rule of thumb: offer 10-20% below asking price for negotiable listings. Research similar items on UniDeals first to back your offer with data. Be respectful — remember you're dealing with a fellow student. Never lowball aggressively — it discourages sellers.",
    steps: [
      "Check if the listing is marked 'Negotiable' on the product page.",
      "Research similar items on UniDeals to understand fair pricing.",
      "Open in-app Chat with the seller.",
      "Politely suggest your offer with a reason (e.g., 'I found a similar one for ₹X').",
      "Be willing to meet in the middle — suggest a fair counter-offer.",
      "Agree on the final price before arranging a meetup.",
      "Never pay until you've inspected the item in person.",
    ],
    route: "/chat",
    suggestions: ["Estimate fair price for an item", "Safety tips for meetups", "How do I buy?"],
  }),

  makeEntry({
    id: "return_refund",
    title: "Return Policy and Refunds — No Returns on UniDeals",
    keywords: [
      "return", "refund", "return policy", "money back", "paisa wapas",
      "defective item", "broken item", "not as described", "exchange",
      "can i return", "refund milega", "replacement", "item kharab nikla",
      "cheated", "wrong item", "scammed", "item not as shown",
      "item condition wrong", "item doesnt work", "got scammed",
      "return policy campus", "no returns policy",
    ],
    answer:
      "UniDeals is a peer-to-peer marketplace — it does NOT process returns, refunds, or exchanges between students. This is exactly why we require you to INSPECT BEFORE PAYING. If the item doesn't match the listing, do NOT pay — walk away and report the seller. For serious fraud (scam, theft), contact campus security or local police FIRST, then email support@campusmart.in with evidence.",
    steps: [
      "UniDeals does NOT process returns, refunds, or exchanges — transactions are between students directly.",
      "ALWAYS inspect the item thoroughly before making payment — this is your only protection.",
      "Test electronics (power on, check ports, test battery) before paying.",
      "If item doesn't match listing: do NOT pay — walk away.",
      "Report the seller using the in-app flag/report button on their profile or listing.",
      "For serious fraud (theft, criminal scam): contact campus security or local police first.",
      "Email support@campusmart.in with full evidence for platform action (seller suspension).",
    ],
    route: "/contact",
    suggestions: ["What should I inspect before buying?", "How do I report a seller?", "Safety tips for meetups"],
  }),

  makeEntry({
    id: "payment_methods",
    title: "Payment Methods — UPI, Cash, and Safety Rules",
    keywords: [
      "payment method", "how to pay", "upi", "cash", "gpay", "phonepe",
      "paytm", "payment kaise kare", "online payment", "bank transfer",
      "card payment", "credit card", "debit card", "neft", "imps",
      "payment options", "kaise pay kare", "accepted payments",
      "advance payment", "token money", "advance payment safe",
      "pay before inspection", "pay online before meeting",
    ],
    answer:
      "UniDeals supports direct peer-to-peer payments. Preferred: UPI (GPay, PhonePe, Paytm) or Cash at the time of in-person exchange AFTER inspecting the item. UniDeals does NOT handle payments, escrow, or act as a payment intermediary. NEVER send advance payments before seeing the item. NEVER scan QR codes from sellers claiming to 'receive' money — this is a common reversal fraud. No card payments, no bank transfers, no crypto.",
    steps: [
      "Preferred: UPI payment (GPay, PhonePe, Paytm) AT THE MEETUP after inspection.",
      "Alternative: Cash payment at the meetup location after inspection.",
      "NEVER send advance payments or token amounts before inspecting the item.",
      "NEVER scan QR codes from sellers claiming you'll 'receive' money (reversal scam).",
      "Verify payment confirmation on YOUR OWN banking app.",
      "UniDeals does not handle money, escrow, or act as a payment intermediary.",
      "No card payments, no bank transfers, no crypto — only UPI/cash in-person.",
    ],
    route: "/",
    suggestions: ["Is advance payment safe?", "How do I avoid scams?", "What is the reverse QR scam?"],
  }),

  // ═══════════════════════════════════════════════════
  //  SAFETY & SCAMS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "report_safety_steps",
    title: "How to Report a Suspicious Listing or User",
    keywords: [
      "report", "scam", "fraud", "unsafe", "fake", "complaint", "support", "harassment",
      "how to report", "flag listing", "report user", "report listing", "report seller",
      "report buyer", "flag user", "flag product", "suspicious user", "suspicious listing",
      "report kaise kare", "flag kaise kare", "kisko report kare",
    ],
    answer:
      "To report a suspicious listing or user: Open the product page or user profile → Click the 'Report/Flag' icon (⚑) → Select the most accurate reason (Spam, Fake, Fraud, Prohibited Item, etc.) → Add a description and evidence → Submit. Moderation team reviews within 2 hours. For emergencies, contact campus security or local police FIRST.",
    steps: [
      "Open the suspicious product page or user profile.",
      "Click the 'Report' or 'Flag' icon (⚑).",
      "Select the reason: Spam, Fake/Misleading, Inappropriate Content, Fraud/Scam, Prohibited Item, Duplicate Listing, Wrong Category, Sold/Unavailable, or Other.",
      "Add a description with evidence (screenshots, product links, chat screenshots).",
      "Submit the report.",
      "Campus moderation team reviews flagged content within 2 hours.",
      "You'll receive a notification once action is taken.",
      "For urgent safety threats: contact campus security or local police FIRST, then report to UniDeals.",
    ],
    route: "/contact",
    suggestions: ["Is advance UPI payment safe?", "What are common scam signs?", "How do I stay safe?"],
  }),

  makeEntry({
    id: "payment_safety_advance",
    title: "Is Advance UPI Payment or Token Money Safe? — NEVER",
    keywords: [
      "advance payment", "advance payment safe", "token amount", "advance pay karna chahiye",
      "token money", "booking amount", "advance upi", "advance online payment",
      "pay before meeting", "pay in advance", "paying advance", "advance dena chahiye",
      "is token money safe", "advance kyu nahi dena chahiye", "advance payment risk",
    ],
    answer:
      "NEVER pay advance, token, or booking amounts online before meeting and physically inspecting the item. This is the single most important safety rule on UniDeals. Any seller asking for advance payment (online UPI/bank transfer before meetup) is a major red flag and likely a scam. Legitimate sellers will ALWAYS meet you in person first. Pay ONLY after inspecting the item at the meetup, using UPI or cash at the time of exchange.",
    steps: [
      "NEVER pay advance, token, or booking amount online before inspecting the item.",
      "Any seller requesting advance payment is likely a scammer — treat it as a major red flag.",
      "Legitimate sellers always meet buyers in person before receiving payment.",
      "Pay ONLY AT THE MEETUP, after inspecting the item and confirming it matches the listing.",
      "Use UPI (GPay/PhonePe/Paytm) or cash at the time of exchange.",
      "If a seller insists on advance payment: cancel the deal and report the seller immediately.",
    ],
    route: "/",
    suggestions: ["What are common scam signs?", "Where should I meet a seller?", "How do I report a scam?"],
  }),

  makeEntry({
    id: "reverse_qr_scam",
    title: "Reverse QR Code Scam — What It Is and How to Avoid It",
    keywords: [
      "reverse qr", "qr code scam", "qr scam", "scan qr code", "receive money qr",
      "qr fraud", "scanning qr", "suspicious qr", "payment link scam",
      "qr code for receiving money", "seller sent qr", "buyer sent qr",
      "money receive karne ke liye qr", "qr fraud campus",
    ],
    answer:
      "The reverse QR scam works like this: A scammer sends you a QR code and claims you'll 'receive' money by scanning it. In reality, scanning it SENDS money FROM your account. This is a common fraud on student marketplaces. NEVER scan a QR code sent by a buyer or seller claiming it will send money to you. To receive money, simply share your UPI ID — you don't need to scan anything. Always verify payments on your own banking app.",
    steps: [
      "How the scam works: Scammer sends a QR code claiming you'll 'receive' money by scanning it.",
      "Reality: Scanning the QR code SENDS money FROM your bank account.",
      "NEVER scan a QR code sent by a buyer or seller to 'receive' payment.",
      "To receive UPI payment: Share your UPI ID. You do NOT need to scan any QR code.",
      "Always verify payment confirmations ONLY on your own registered banking app.",
      "If someone sends you a suspicious QR code: refuse, end the deal, and report the user.",
      "Report scam attempts via the in-app flag button or support@campusmart.in.",
    ],
    route: "/",
    suggestions: ["Is advance UPI payment safe?", "How do I report a scam?", "Where should I meet a seller?"],
  }),

  makeEntry({
    id: "pickup_tips",
    title: "Campus Pickup Safety — Best Meetup Practices",
    keywords: [
      "pickup", "meetup", "campus meetup", "kahan mile", "meeting point",
      "pickup location", "best place to meet", "safe meeting", "pickup tips",
      "campus location", "where to meet", "meetup location", "kaha pe milna hai",
      "hostel meetup", "late night meetup", "off campus meetup",
      "private room meetup", "safe spot", "meet on campus",
      "amounts over 5000", "bring friend", "inform someone",
    ],
    answer:
      "For safe campus pickups: Meet in public, well-lit campus areas DURING DAYLIGHT. Best spots: Main Library Gate, Central Canteen, Student Activity Center, Hostel Security Gate, Main Admin Block. Bring a friend for deals over ₹5,000. Tell someone your meetup details. Inspect the item before paying. NEVER meet in private rooms, off-campus, or late at night. Trust your instincts — if something feels wrong, walk away.",
    steps: [
      "Choose a public, well-lit campus spot (Library Gate, Canteen, Student Center, Security Gate).",
      "Meet during daylight hours — avoid late night meetups.",
      "Bring a friend for high-value deals (over ₹5,000).",
      "Tell a friend or family member your meetup details (who, where, when).",
      "Agree on the exact time and location via in-app chat before meeting.",
      "Inspect the item thoroughly at the meetup BEFORE making payment.",
      "Walk away if anything feels suspicious — trust your instincts.",
      "NEVER meet in private hostel rooms, off-campus, or isolated locations.",
    ],
    route: "/",
    suggestions: ["How do I pay safely?", "What should I inspect?", "How do I report a problem?"],
  }),

  // ═══════════════════════════════════════════════════
  //  DEALS & CONVERSATIONS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "deal_workflow_steps",
    title: "Deal Lifecycle — How the Deal Status System Works",
    keywords: [
      "deal", "deal status", "deal flow", "offer", "offer accepted", "deal confirmed",
      "pickup scheduled", "payment confirmed", "completed deal", "cancelled deal",
      "negotiating", "deal stages", "deal lifecycle", "deal workflow",
      "deal process", "how deals work", "deal system", "my deals",
    ],
    answer:
      "UniDeals deals follow a structured lifecycle: Negotiating → Offer Accepted → Deal Confirmed → Pickup Scheduled → Payment Confirmed → Completed (or Cancelled at any stage). After a deal is Completed, both buyer and seller can leave a review for each other.",
    steps: [
      "NEGOTIATING: Buyer and seller discussing price, condition, and meetup via in-app chat.",
      "OFFER ACCEPTED: Seller has accepted the buyer's offered price.",
      "DEAL CONFIRMED: Both parties confirmed the deal — preparing for pickup.",
      "PICKUP SCHEDULED: Specific date, time, and public campus location agreed upon.",
      "PAYMENT CONFIRMED: Payment made at in-person meetup after inspection.",
      "COMPLETED: Exchange done — both can leave a review now.",
      "CANCELLED: Either party cancelled. Can be restarted by messaging the seller again.",
      "Buyer no-show: Seller can cancel and relist. Seller no-show: Buyer can report the seller.",
    ],
    route: "/chat",
    suggestions: ["How do I leave a review?", "What if the seller doesn't show up?", "How do I report a problem?"],
  }),

  makeEntry({
    id: "chat_steps",
    title: "In-App Chat — How Messaging Works",
    keywords: [
      "chat", "messages", "message", "conversation", "seller chat", "buyer chat",
      "how to chat", "open chat", "chat with seller", "message seller",
      "chat feature", "in app chat", "messaging feature", "chat nahi khul raha",
    ],
    answer:
      "In-app chat lets you ask product questions, negotiate price, confirm pickup details, and maintain a safe record of the buyer-seller conversation. Open chat from any product detail page by clicking 'Chat with Seller'. Keep all deal communications in-app for your own safety record.",
    steps: [
      "Open a product detail page.",
      "Click 'Message Seller' or 'Chat with Seller'.",
      "Ask about condition, availability, final price, and pickup time.",
      "Negotiate politely if the listing is marked 'Negotiable'.",
      "Confirm pickup location and time in the chat before meeting.",
      "Avoid sharing unnecessary private personal information.",
      "Keep all important deal details in chat for your safety record.",
    ],
    route: "/chat",
    suggestions: ["How do I buy safely?", "What should I ask a seller?", "Help me negotiate"],
  }),

  // ═══════════════════════════════════════════════════
  //  SUBSCRIPTIONS & BOOSTS — DETAILED
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "pricing_subscription_steps",
    title: "Subscription Plans — Free, Pro, and Pro+ Comparison",
    keywords: [
      "pricing", "price page", "subscription", "plan", "upgrade", "pro", "pro plus", "membership",
      "subscription comparison", "plan comparison", "what does pro include", "what does pro plus include",
      "free vs pro", "pro vs pro plus", "which plan", "konsa plan", "plan benefits",
      "lifetime plan", "founder plan", "one time payment",
    ],
    answer:
      "Three plans: Free (₹0): 10 listings, 25 wishlist, standard search, no monthly boosts (can buy add-ons). Pro (₹99 lifetime): 25 listings, 100 wishlist, 2 monthly 3-day boosts, high search priority, premium chat, priority support. Pro+ (₹199 lifetime): Unlimited listings, unlimited wishlist, 5 monthly 7-day boosts, HIGHEST search priority, highest priority chat, 24/7 dedicated support, full early feature access. All plans: buy and sell, unlimited chats, no commission. Add-on boosts available for all plans.",
    steps: [
      "Open the Pricing page (/price) to compare all plans.",
      "Open Subscription from your profile to see your current plan.",
      "Free: 10 listings, 25 wishlist, standard search, community support.",
      "Pro (₹99 lifetime): 25 listings, 100 wishlist, 2 boosts/month (3-day), high priority, priority support.",
      "Pro+ (₹199 lifetime): Unlimited listings, unlimited wishlist, 5 boosts/month (7-day), highest priority, 24/7 support.",
      "All plans: unlimited buying, chatting, and zero commission.",
      "Boost add-ons: ₹29 (3-day) or ₹49 (7-day) available to ALL plans.",
    ],
    route: "/price",
    suggestions: ["How does boosting work?", "Which plan is best for sellers?", "How do I upgrade?"],
  }),

  makeEntry({
    id: "boosting_steps",
    title: "How to Boost a Listing — Full Guide",
    keywords: [
      "boost", "boosting", "visibility", "promote", "sell faster", "boost listing",
      "how to boost", "boost kaise kare", "listing boost", "boost my product",
      "boost feature", "boost button", "use boost credits", "monthly boost",
    ],
    answer:
      "Boosting pushes your listing to the top of campus search with a 'Boosted' badge for ~3x more views. Use monthly plan credits (Pro: 2×3-day, Pro+: 5×7-day) or buy add-ons (₹29/3-day or ₹49/7-day, available to ALL users). Only active listings can be boosted. Cannot stack boosts on the same listing. Credits reset on 1st of each month, unused credits don't carry over.",
    steps: [
      "Go to My Listings (/myorders or /productlisted).",
      "Find the active listed product you want to boost.",
      "Click 'Boost Listing' on the product card.",
      "Choose: Use monthly plan boost credits (if available) OR purchase an add-on.",
      "Add-on options: 3-Day Boost (₹29) or 7-Day Boost (₹49).",
      "Confirm the boost — your listing immediately appears at the top with a 'Boosted' badge.",
      "Expect approximately 3x more views during the boost period.",
      "After boost expires, listing returns to standard visibility.",
    ],
    route: "/myorders",
    suggestions: ["Which plan should I get?", "How do I sell faster?", "Pro vs Pro+ comparison"],
  }),

  makeEntry({
    id: "boost_rules",
    title: "Boost Rules — Credits, Stacking, Rollover, Limits",
    keywords: [
      "boost rules", "boost limits", "boost stacking", "stack boosts", "can i stack",
      "boost rollover", "credit rollover", "unused credits", "credits carry over",
      "boost reset", "when do credits reset", "boost monthly reset",
      "max active boosts", "how many active boosts", "boost one listing twice",
      "boost expired", "boost refund", "listing sold during boost",
    ],
    answer:
      "Boost rules: (1) Cannot stack multiple boosts on the SAME listing simultaneously. (2) Monthly credits reset on the 1st of each month — unused credits do NOT carry over. (3) Free users: 0 monthly credits, but can buy add-ons anytime. Pro: max 1 active boost at a time. Pro+: up to 3 active boosts simultaneously. (4) If a listing is removed during boost, remaining boost time is forfeit and non-refundable. (5) Add-on boosts can be purchased by any user regardless of plan.",
    steps: [
      "Cannot stack multiple boosts on the same listing at the same time.",
      "Monthly credits reset on the 1st of each month.",
      "Unused monthly credits do NOT carry over to the next month.",
      "Free plan: 0 monthly credits — can still buy add-on boosts (₹29/₹49).",
      "Pro plan: max 1 active boost at a time across listings.",
      "Pro+ plan: up to 3 active boosts simultaneously across different listings.",
      "If a boosted listing is removed: remaining boost time is forfeit and non-refundable.",
      "Add-on boosts are separate from monthly credits and can be purchased by any plan.",
    ],
    route: "/price",
    suggestions: ["How do I boost a listing?", "Which plan gives more boosts?", "Can I buy extra boosts?"],
  }),

  makeEntry({
    id: "founder_offer",
    title: "Founder Offer — Is Lifetime Access Really Lifetime?",
    keywords: [
      "founder offer", "lifetime access", "lifetime plan", "really lifetime",
      "one time payment", "founder pricing", "early bird", "launch offer",
      "kya sach mein lifetime", "founder plan", "permanent access",
      "founder offer valid", "after founder offer", "regular pricing",
    ],
    answer:
      "Yes, the Founder Offer is genuinely a one-time payment for PERMANENT lifetime access. Early members who join during the launch period get Pro (₹99) or Pro+ (₹199) with full features forever — no monthly fees, no annual renewals, no hidden charges. After the founder phase ends, new users will be offered semester-based plans (₹149/semester or ₹249/semester). Existing founders ALWAYS keep their lifetime access regardless of plan price changes.",
    steps: [
      "Founder pricing is a one-time payment — no recurring fees, ever.",
      "Pro Founder: ₹99 for lifetime access to all Pro features.",
      "Pro+ Founder: ₹199 for lifetime access to all Pro+ features.",
      "This pricing is only available during the launch/founder phase.",
      "After founder phase ends, new users pay ₹149/semester (Plus) or ₹249/semester (Premium).",
      "Existing founders KEEP their lifetime benefits regardless of pricing changes for new users.",
      "Navigate to Subscription or Pricing page to upgrade now.",
    ],
    route: "/price",
    suggestions: ["How do I upgrade?", "Pro vs Pro+ comparison", "What does Pro+ include?"],
  }),

  // ═══════════════════════════════════════════════════
  //  PROFILE & SETTINGS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "profile_settings_steps",
    title: "Profile and Settings — Edit Name, Photo, Address",
    keywords: [
      "profile", "settings", "edit profile", "avatar", "photo", "name", "account",
      "profile photo", "profile picture", "how to edit profile", "settings page",
      "profile kaise edit kare", "naam kaise change kare", "photo kaise change kare",
    ],
    answer:
      "Profile and Settings (/settings or /profile) let you manage your account: update display name, mobile number, gender, upload a new profile photo, manage campus pickup addresses, and access security settings (password change for email accounts). Click 'Save Changes' after any update.",
    steps: [
      "Go to Profile or Settings from your profile menu (avatar in top-right).",
      "Update your Display Name, Mobile Number (optional), or Gender.",
      "To change your profile photo: click the avatar image and upload a new one (max 2MB, JPG/PNG).",
      "Navigate to 'Addresses' to add, edit, delete, or set a default Campus Pickup Address.",
      "For address: use a recognizable public campus location (Library Gate, Canteen, Hostel Gate).",
      "Security tab: change your password (for email-based accounts only; Google users manage via Google).",
      "Click 'Save Changes' after any update.",
    ],
    route: "/settings",
    suggestions: ["How do I add an address?", "How do I change my profile photo?", "How do I delete my data?"],
  }),

  makeEntry({
    id: "address_steps",
    title: "Address Management — Add, Edit, Delete Campus Pickup Address",
    keywords: [
      "address", "pickup address", "default address", "location", "campus pickup",
      "add address", "edit address", "delete address", "manage address",
      "how to add address", "campus address change", "pickup location kaise add kare",
      "address management", "address settings", "hostel address", "block address",
    ],
    answer:
      "Addresses are used for pickup details in listings. Always use recognizable public campus spots. Go to Settings → Addresses to add, edit, delete, or set a default. You must have at least one saved address to publish listings.",
    steps: [
      "Go to Settings (/settings) from your profile menu.",
      "Navigate to the 'Addresses' or 'Pickup Locations' section.",
      "To add: Click 'Add Address', fill Area/Location, City, and Pincode.",
      "Use a recognizable public campus spot (Library Gate, CSE Block Entrance, Hostel A Security Gate).",
      "To set as default: Click the 'Set as Default' toggle next to the address.",
      "To edit: Click the pencil/edit icon → make changes → save.",
      "To delete: Click the trash/delete icon and confirm.",
      "You must have at least one saved address to create listings.",
    ],
    route: "/settings",
    suggestions: ["How do I sell something?", "What is a safe meetup place?", "How many photos to upload?"],
  }),

  // ═══════════════════════════════════════════════════
  //  PRIVACY & DATA
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "privacy_overview",
    title: "Privacy Policy — Data Collection, Rights, and DPDP Compliance",
    keywords: [
      "privacy", "data", "personal data", "cookies", "messages stored", "delete my data",
      "dpdp", "gdpr", "data protection act", "digital personal data protection",
      "data rights", "right to access", "right to deletion", "grievance officer",
      "privacy policy", "what data collected", "who can see my data", "data sharing",
      "third party data", "data retention", "30 days delete", "data purge",
      "privacy@campusmart.in", "grievance@campusmart.in",
    ],
    answer:
      "UniDeals complies with India's DPDP Act 2023 and IT Act 2000. Data collected: account info, verification data, listing data, chat history, transaction interactions, anonymized usage analytics. We do NOT sell or share your personal data with advertisers. Your rights: Access, correct, delete data; file a grievance. Deletion requests processed within 30 days. Privacy contact: privacy@campusmart.in. Grievances: grievance@campusmart.in.",
    steps: [
      "Data collected: account info, college email, listing data, chat history, usage analytics.",
      "Data use: student verification, marketplace operation, fraud prevention, feature improvement.",
      "NOT done: selling personal data, sharing with ad networks, automated profiling.",
      "Right to Access: request data copy via privacy@campusmart.in.",
      "Right to Deletion: request account deletion — processed within 30 days.",
      "Right to Correction: request fixes to inaccurate personal info.",
      "Grievance Officer: grievance@campusmart.in for formal complaints.",
      "Third-party services used: Google OAuth (sign-in), ImageKit (photo hosting), MongoDB Atlas (database).",
    ],
    route: "/privacy-policy",
    suggestions: ["How do I delete my account?", "Are chats stored?", "What data does UniDeals collect?"],
  }),

  // ═══════════════════════════════════════════════════
  //  REVIEWS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "reviews_ratings",
    title: "Reviews and Ratings — Policy, Submission, and Disputes",
    keywords: [
      "review", "reviews", "rating", "ratings", "leave review", "give review",
      "how to review", "review policy", "fake review", "incentivized review",
      "review dispute", "bad review", "unfair review", "remove review",
      "appeal review", "can i edit review", "review after deal",
      "review for seller", "review for buyer", "review guidelines",
    ],
    answer:
      "Reviews can only be submitted after a deal is marked 'Completed'. Both buyer and seller can review each other (one review per completed deal per direction). Reviews cannot be edited after submission. Fake, incentivized, or paid reviews are strictly prohibited and will be removed. If you receive a false or abusive review, report it to support@campusmart.in with evidence. Coercing someone to change their review is grounds for account suspension.",
    steps: [
      "Reviews are only available after a deal is marked 'Completed'.",
      "Both buyer and seller can leave one review per completed deal.",
      "Reviews must be honest, fair, and based on actual transaction experience.",
      "Reviews cannot be edited after submission — review carefully before posting.",
      "Fake, paid, or incentivized reviews are prohibited and will be removed.",
      "If you receive a false or malicious review: report to support@campusmart.in with evidence.",
      "Threatening someone to change their review = account suspension.",
    ],
    route: "/",
    suggestions: ["How does the deal system work?", "How do I report a seller?", "Platform safety rules"],
  }),

  // ═══════════════════════════════════════════════════
  //  DELIVERY & PICKUP
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "no_delivery",
    title: "Does UniDeals Offer Delivery or Shipping?",
    keywords: [
      "delivery", "shipping", "courier", "deliver", "ship", "kya deliver hota hai",
      "home delivery", "deliver karega", "shipping available", "can you ship",
      "door delivery", "parcel", "send to my address", "mail",
      "delivery charges", "shipping cost", "ghar pe aayega",
    ],
    answer:
      "No, UniDeals does NOT offer delivery, shipping, or courier services. It's a campus pickup-only marketplace. Buyers and sellers meet in person at a safe public campus location to exchange the item and payment. This is by design — it ensures you can inspect before paying and keeps transactions safe within your campus community.",
    steps: [
      "UniDeals is a campus pickup-only marketplace — no delivery or shipping.",
      "Sellers specify a campus pickup location when creating a listing.",
      "Buyers and sellers agree on a meetup spot via in-app chat.",
      "Always choose public, well-lit campus locations (Library Gate, Main Canteen, Student Center).",
      "Inspect the item in person before paying.",
      "Never agree to off-campus or private location meetups.",
    ],
    route: "/",
    suggestions: ["Where should I meet?", "How do I set a pickup address?", "Safety tips for meetups"],
  }),

  // ═══════════════════════════════════════════════════
  //  AI ASSISTANT
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "what_can_ai_do",
    title: "What Can the UniDeals AI Assistant Do?",
    keywords: [
      "what can you do", "ai features", "chatbot features", "kya kar sakta hai",
      "assistant features", "help me", "tum kya karte ho", "your capabilities",
      "what are your features", "ai assistant", "bot kya karega", "chatbot help",
      "how can you help", "what do you do", "tell me your features",
      "commands", "options", "available commands", "menu", "ai capabilities",
    ],
    answer:
      "I'm UniDeals AI — your campus marketplace assistant! Here's what I can help with: 🔍 Find products (keyword, category, budget). 💰 Estimate fair prices. 📝 Write listing drafts. ⚖️ Compare two products. 🎒 Build budget bundles. ✅ Generate inspection checklists. 🛡️ Safety tips for meetups and payments. 📖 Platform navigation (sell, buy, boost, upgrade, report). 📜 Policy & procedure guidance (terms, privacy, returns, subscription rules). 📷 Image search (upload photo → AI finds matching listings). 🎤 Voice notes (speak → AI transcribes and searches). 🗣️ English and Hinglish both supported!",
    steps: [
      "🔍 Product Search: 'Find cycles under 3000', 'Show electronics', 'Trending items'",
      "💰 Price Estimation: 'How much is a used laptop worth?', 'Fair price for my calculator'",
      "📝 Listing Draft: 'Help me write a listing for my books', 'Draft a post for my cycle'",
      "⚖️ Product Comparison: 'Compare these two phones'",
      "🎒 Budget Bundle: 'Room setup under 5000', 'Electronics under 3000'",
      "✅ Inspection Checklist: 'What to check before buying a laptop?'",
      "🛡️ Safety Tips: 'Is advance UPI payment safe?', 'Where should I meet?'",
      "📖 Platform Guide: 'How to sell?', 'How to boost?', 'How to upgrade?'",
      "📜 Policy Questions: 'What items are banned?', 'What is the return policy?'",
      "📷 Image: Upload a photo → AI searches for matching campus listings",
    ],
    route: "/chat",
    suggestions: ["Find a cycle under 3000", "Help me sell my books", "Safety tips for meetups"],
  }),

  makeEntry({
    id: "ai_limitations",
    title: "What the AI Assistant Cannot Do",
    keywords: [
      "ai limitation", "can't do", "limitation", "kya nahi kar sakta",
      "not possible", "ai can't", "chatbot limit", "what can't you do",
      "bot limitation", "does the ai", "can the ai",
      "homework help", "exam help", "medical advice", "financial advice", "legal advice",
    ],
    answer:
      "I'm focused exclusively on UniDeals — the campus marketplace. I CANNOT: process payments or refunds, contact sellers on your behalf, guarantee product quality or seller honesty, provide medical/legal/financial advice, help with homework or exams, or answer questions unrelated to UniDeals. For platform issues, reach out to support@campusmart.in. For payment disputes, contact campus security or local authorities.",
    steps: [
      "❌ Cannot process, handle, or guarantee payments or refunds.",
      "❌ Cannot contact sellers or make deals on your behalf.",
      "❌ Cannot guarantee product quality or seller reliability.",
      "❌ Cannot provide medical, legal, or financial advice.",
      "❌ Cannot help with homework, exams, or non-marketplace academic questions.",
      "❌ Cannot answer questions unrelated to the UniDeals marketplace.",
      "✅ For disputes or scams: report via the app or contact support@campusmart.in.",
      "✅ For policy questions I can't fully answer: contact support@campusmart.in.",
    ],
    route: "/contact",
    suggestions: ["What can the AI do?", "How do I report a scam?", "How do I contact support?"],
  }),

  // ═══════════════════════════════════════════════════
  //  SEARCH & BROWSE
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "search_browse_steps",
    title: "Search, Browse & Discover Products",
    keywords: [
      "search", "browse", "category", "categories", "filter", "find product", "home page",
      "product search", "how to search", "search kaise kare", "category browse",
      "filter by price", "filter by condition", "advanced search", "keyword search",
    ],
    answer:
      "Search and category pages help buyers find active campus listings. Use the search bar on any page, browse by category (Electronics, Study Material, Hostel Essentials, Vehicles, etc.), or ask the AI assistant. Apply price range and condition filters to narrow results. If you can't find something, try a simpler keyword or ask the AI for recommendations.",
    steps: [
      "Start from the Home page, Search page, or a Category page.",
      "Type the product name or keyword in the Search bar.",
      "Use category pages for focused browsing (Electronics, Vehicles, Study Material, etc.).",
      "Apply filters: price range, condition, sort order.",
      "Open a product card to check full details before messaging the seller.",
      "If you can't find a match, try a simpler keyword or ask the AI assistant.",
      "Ask AI: 'Find cycle under 3000', 'Show hostel essentials under 1000'.",
    ],
    route: "/search",
    suggestions: ["Find a cycle under 3000", "Show electronics", "How do I contact a seller?"],
  }),

  // ═══════════════════════════════════════════════════
  //  WISHLIST
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "wishlist_steps",
    title: "Wishlist — Save, View, and Manage Saved Products",
    keywords: [
      "wishlist", "save product", "heart", "saved items", "favorite", "favourite",
      "wishlist kaise use kare", "save item", "saved products", "wishlist limit",
      "wishlist full", "wishlist capacity", "how to wishlist",
    ],
    answer:
      "Wishlist lets you save products you're interested in and come back to them later. Wishlist limits: Free = 25 items, Pro = 100 items, Pro+ = Unlimited. Save any product by clicking the Heart (❤️) icon. View all saved items at /wishlist. Contact a seller directly from your wishlist page.",
    steps: [
      "Open any product card or product detail page.",
      "Click the Heart (❤️) / Wishlist icon.",
      "Item is instantly saved to your personal Wishlist.",
      "Go to Wishlist (/wishlist) from your profile/sidebar to view all saved items.",
      "Click the heart again on a saved item to remove it from wishlist.",
      "Chat with sellers directly from the Wishlist page.",
      "Wishlist limits: Free (25 items), Pro (100 items), Pro+ (Unlimited).",
    ],
    route: "/wishlist",
    suggestions: ["How do I buy a saved item?", "How do I remove wishlist items?", "Upgrade to Pro for more wishlist"],
  }),

  // ═══════════════════════════════════════════════════
  //  NOTIFICATIONS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "notifications_steps",
    title: "Notifications — How to View Platform Alerts",
    keywords: [
      "notification", "notifications", "alerts", "updates", "message alert", "price alert",
      "notification settings", "how to view notifications", "notification bell",
    ],
    answer:
      "Notifications keep you updated about marketplace activity: new messages, deal status changes, product actions, price alerts, and account-related updates. Access notifications from the bell icon in the navbar or from the menu. Check regularly when actively buying or selling.",
    steps: [
      "Open Notifications from the bell icon in the navbar or profile menu.",
      "Review the latest alerts and marketplace updates.",
      "Open the linked action if a notification points to a chat, product, or account activity.",
      "Check notifications regularly when you are buying or selling actively.",
    ],
    route: "/notification",
    suggestions: ["How do I open chat?", "How do I manage listings?", "How do I contact support?"],
  }),

  // ═══════════════════════════════════════════════════
  //  SUPPORT
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "contact_support_steps",
    title: "Contact Support — How to File a Complaint or Get Help",
    keywords: [
      "contact", "support", "help center", "ticket", "problem", "issue", "bug",
      "how to contact support", "support ticket", "file complaint", "complaint kaise kare",
      "support email", "support@campusmart.in", "response time", "sla",
      "how long support reply", "urgent help", "emergency support",
    ],
    answer:
      "Contact UniDeals support via /contact (Support Ticket form) or directly at support@campusmart.in. Response SLAs: Free users — 24-48 hours. Pro users — 12-24 hours. Pro+ users — same-day dedicated support. Include product links, user IDs, screenshots, and incident date in your report. For legal matters: legal@campusmart.in. For privacy/data: privacy@campusmart.in. For emergencies: contact campus security or local police FIRST.",
    steps: [
      "Go to Contact (/contact) from the menu or profile area.",
      "Fill the Support Ticket form: name, email, issue category, and detailed description.",
      "Attach screenshots, product links, chat screenshots as evidence.",
      "Submit the ticket — you'll receive a confirmation email with a ticket ID.",
      "Response time: Free (24-48h), Pro (12-24h), Pro+ (same day dedicated).",
      "Alternatively, email support@campusmart.in directly for urgent issues.",
      "Legal notices: legal@campusmart.in. Privacy requests: privacy@campusmart.in.",
      "For emergencies or physical threats: contact campus security or local police FIRST.",
    ],
    route: "/contact",
    suggestions: ["How do I report a scam?", "What details should I include?", "How do I stay safe?"],
  }),

  // ═══════════════════════════════════════════════════
  //  PRODUCT DETAILS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "product_details_steps",
    title: "Product Details Page — What to Look For",
    keywords: [
      "product page", "product details", "details page", "view product", "seller details", "product card",
      "what is on product page", "product info", "product listing page",
      "what to check on product page", "product page details",
    ],
    answer:
      "The product details page shows all buying information: real photos, title, description, condition (Brand New/Like New/Gently Used/Well Used/For Parts), usage duration, original price, selling price, negotiability, seller info, and campus pickup area. Use Wishlist (❤️) to save it, Chat to contact the seller, and the AI price estimator to verify if the price is fair.",
    steps: [
      "Open any product card from Home, Search, Category, or Wishlist.",
      "Review all photos carefully — check all angles and any disclosed damage.",
      "Read description, condition, and usage duration.",
      "Compare selling price against original price — is the discount fair?",
      "Check seller info and campus pickup location.",
      "Use AI: 'Ask AI for Fair Price & Inspection Tips' on the product page.",
      "Save with ❤️ Wishlist or click 'Chat with Seller' to start negotiating.",
    ],
    route: "/product/:id",
    suggestions: ["What should I ask a seller?", "How do I wishlist a product?", "How do I buy safely?"],
  }),

  // ═══════════════════════════════════════════════════
  //  MANAGE LISTINGS
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "manage_listings_steps",
    title: "My Listings — Manage, Boost, Delete, and Mark Sold",
    keywords: [
      "my orders", "listed products", "my listings", "manage product", "relist",
      "my products", "seller dashboard", "listing management", "manage my listings",
      "where to find my listings", "view my listings", "my active listings",
    ],
    answer:
      "Your listed products are managed from My Orders or My Listings in your profile. From here you can: view active/sold/unlisted items, edit listing details, boost eligible active listings, mark items as sold, or permanently delete listings.",
    steps: [
      "Go to My Orders or My Listings (/myorders or /productlisted) from your profile menu.",
      "Find the product you want to manage.",
      "Options for active listings: Edit details, Boost (if eligible), Mark as Sold, Delete.",
      "Boost only active listed products that are eligible under your plan.",
      "Mark items as 'Sold' when deals are complete — this cleans up your active listing count.",
      "Keep unavailable or outdated listings updated so buyers are not misled.",
    ],
    route: "/myorders",
    suggestions: ["How does boosting work?", "How do I sell something?", "Why can't I boost?"],
  }),

  // ═══════════════════════════════════════════════════
  //  ACCOUNT AUTHENTICATION
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "account_auth_steps",
    title: "Account, Login, and Signup — Full Guide",
    keywords: [
      "signup", "sign up", "login", "log in", "verify email", "forgot password",
      "reset password", "account", "create account", "register", "new account",
      "kaise sign up kare", "kaise login kare", "account kaise banaye",
    ],
    answer:
      "Sign up at /signup with your student email. Verify your email to unlock all features. Log in at /login using email/password or Google OAuth. Use 'Forgot Password' to reset via email. Without verification, you can only browse public listings — all other features require a verified account.",
    steps: [
      "Go to Signup (/signup) to create a new account.",
      "Use your valid student/university email (@college.edu, @domain.ac.in).",
      "Verify your email — check inbox and spam for the verification email.",
      "Click the verification link → your account is now fully active.",
      "Use Login (/login) for returning users.",
      "Or click 'Sign in with Google' for quick Google OAuth login.",
      "Use 'Forgot Password' on the login page if you can't access your account.",
    ],
    route: "/signup",
    suggestions: ["Why do I need verification?", "How do I reset password?", "How do I sell after signup?"],
  }),

  // ═══════════════════════════════════════════════════
  //  GREETINGS & COMMON CONVERSATION
  // ═══════════════════════════════════════════════════

  makeEntry({
    id: "greeting_hello",
    title: "Greeting — Hello/Hi",
    keywords: [
      "hello", "hi", "hey", "namaste", "hlo", "hii", "hiii",
      "good morning", "good afternoon", "good evening", "sup",
      "kya haal", "kaise ho", "how are you", "wassup", "yo",
      "hi there", "hey there", "greetings", "namaskar",
    ],
    answer:
      "Hey there! 👋 I'm UniDeals AI — your campus marketplace assistant. I can help you find products, estimate fair prices, write listings, navigate the platform, understand policies, and get safety tips. What would you like to do today?",
    steps: [],
    route: null,
    suggestions: ["Find products", "Help me sell something", "How does UniDeals work?", "Safety tips"],
  }),

  makeEntry({
    id: "thank_you",
    title: "Thank You Response",
    keywords: [
      "thank you", "thanks", "dhanyavad", "shukriya", "thanku", "thnx",
      "thank u", "ty", "thx", "thanks a lot", "bohot shukriya", "bahut dhanyavad",
    ],
    answer:
      "You're welcome! 😊 Happy to help. If you have more questions about buying, selling, pricing, platform policies, or anything UniDeals, just ask anytime!",
    steps: [],
    route: null,
    suggestions: ["Find trending items", "How do I sell?", "Safety tips for meetups"],
  }),

  makeEntry({
    id: "goodbye",
    title: "Goodbye Response",
    keywords: [
      "bye", "goodbye", "see you", "alvida", "byebye", "bye bye",
      "good night", "cya", "later", "tata", "chalo bye", "ok bye",
    ],
    answer:
      "Goodbye! 👋 Happy dealing on UniDeals. Come back anytime you need help with buying, selling, pricing, policies, or staying safe on campus. Have a great day!",
    steps: [],
    route: null,
    suggestions: ["Find products", "How does UniDeals work?", "Safety tips"],
  }),
];

// ═══════════════════════════════════════════════════
//  FULL KNOWLEDGE TEXT FOR SYSTEM PROMPT
// ═══════════════════════════════════════════════════

export const getFullKnowledgeText = () =>
  ASSISTANT_KNOWLEDGE_BASE.map((entry) => {
    const steps = entry.steps.length
      ? `Steps:\n${entry.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`
      : "";
    return `${entry.title}\nAnswer: ${entry.answer}\n${steps}\nRoute: ${entry.route || "N/A"}`;
  }).join("\n\n");

// ═══════════════════════════════════════════════════
//  KNOWLEDGE BASE LOOKUP — MULTI-TIER SCORING
// ═══════════════════════════════════════════════════

export const findKnowledgeBaseAnswer = (message = "") => {
  const query = normalize(message);
  if (!query) return null;

  const queryTerms = new Set(splitTerms(query));

  // Build bigrams from query for phrase matching
  const queryWords = query.split(" ").filter(Boolean);
  const queryBigrams = new Set();
  for (let i = 0; i < queryWords.length - 1; i++) {
    queryBigrams.add(`${queryWords[i]} ${queryWords[i + 1]}`);
  }

  const scored = ASSISTANT_KNOWLEDGE_BASE.map((entry) => {
    let score = 0;

    for (const keyword of entry.keywords) {
      // Exact phrase match: highest score
      if (query.includes(keyword)) {
        score += keyword.includes(" ") ? 8 : 4;
      }
      // Bigram match: high score
      if (keyword.includes(" ") && queryBigrams.has(keyword)) {
        score += 5;
      }
      // Term overlap: low score
      for (const term of splitTerms(keyword)) {
        if (queryTerms.has(term) && term.length > 2) score += 1;
      }
    }

    return { entry, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  const best = scored[0].entry;
  const wantsAllTerms =
    /\b(all|everything|full|complete|entire)\b/i.test(message) &&
    /\b(terms|conditions|rules|legal)\b/i.test(message);

  if (wantsAllTerms) {
    const terms = ASSISTANT_KNOWLEDGE_BASE.find((entry) => entry.id === "terms_overview");
    return {
      ...terms,
      answer: `${terms.answer} Key sections covered: eligibility, platform role (Section 79 intermediary), prohibited items, payment safety, listing rules, deal workflow, liability (₹1,000 cap), moderation penalties, intellectual property, and governing law (India).`,
      confidence: "high",
    };
  }

  // Confidence: high (>=8), medium (>=4), low (<4)
  const topScore = scored[0].score;
  return { ...best, confidence: topScore >= 8 ? "high" : topScore >= 4 ? "medium" : "low" };
};

// ═══════════════════════════════════════════════════
//  FORMAT KNOWLEDGE REPLY
// ═══════════════════════════════════════════════════

export const formatKnowledgeReply = (entry) => {
  if (!entry) return null;

  const stepText = entry.steps?.length
    ? `\n\n${entry.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`
    : "";
  const routeText = entry.route ? `\n\n📍 Open: ${entry.route}` : "";

  return `${entry.answer}${stepText}${routeText}`;
};

// ═══════════════════════════════════════════════════
//  GRACEFUL UNKNOWN FALLBACK
// ═══════════════════════════════════════════════════

export const UNKNOWN_KB_FALLBACK = {
  id: "unknown_question",
  title: "Question Not in Knowledge Base Yet",
  reply:
    "That's a great question! 🤔 I don't have the exact answer to this specific query in my knowledge base just yet — but don't worry, our team is continuously expanding my knowledge and I'll soon be able to answer it fully!\n\nIn the meantime, here's what you can do:\n📧 Email us at **support@campusmart.in** — our team replies within 24-48 hours.\n🎫 Submit a support ticket at **/contact** for direct team assistance.\n📚 Browse our Terms & Conditions at **/termscondition** for official platform policies.\n\nThanks for your patience — we're always improving! 🙌",
  route: "/contact",
  suggestions: [
    "What are the platform rules?",
    "How do I sell something?",
    "Is advance UPI payment safe?",
    "Contact support",
  ],
  source: "UniDeals knowledge base",
  confidence: "none",
};
