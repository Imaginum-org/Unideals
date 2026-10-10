import { useState } from "react";
import { FiShield, FiFileText, FiChevronRight } from "react-icons/fi";

// --- DATA ARRAYS ---

const privacySections = [
  {
    title: "1. WHO WE ARE & SCOPE",
    body: [
      {
        type: "p",
        text: "Unideals is a peer-to-peer student marketplace where verified university students buy and sell within their campus community. This policy explains what personal data we collect, why, how it is shared and protected, and the rights you hold over it. It covers the Unideals app and website; it does not cover offline dealings between users or third-party sites you visit via links.",
      },
    ],
  },
  {
    title: "2. INFORMATION WE COLLECT",
    body: [
      {
        type: "list-bold",
        items: [
          {
            label: "Account data:",
            text: "Name, university email, profile photo, campus, and optional details you add such as mobile number and gender.",
          },
          {
            label: "Sign-in data:",
            text: "Password-protected credentials (passwords are stored only as irreversible hashes) or Google profile basics (name, email, avatar) when you use Google sign-in.",
          },
          {
            label: "Verification data:",
            text: "Email-verification tokens, verification timestamps, and account status. We do not collect government IDs.",
          },
          {
            label: "Listings & marketplace activity:",
            text: "Titles, descriptions, photos, prices, categories, pickup spots, drafts, wishlist saves, boosts, plans, badges, levels, and reports you file or receive.",
          },
          {
            label: "Messages:",
            text: "In-app chat content, stored so conversations continue across sessions and can be reviewed if a chat is reported for safety, fraud, or disputes.",
          },
          {
            label: "Payment metadata:",
            text: "Plan, amounts, and Razorpay order/payment references. We never see or store card numbers, UPI PINs, or bank credentials.",
          },
          {
            label: "Support messages:",
            text: "Anything you send via Contact, report, or suggestion forms, plus your email for replies.",
          },
          {
            label: "Technical data:",
            text: "Log data (pages viewed, searches, clicks, session activity), device and browser type, and essential cookies plus on-device preferences such as theme, drafts, and recent searches.",
          },
        ],
      },
    ],
  },
  {
    title: "3. HOW WE USE YOUR DATA",
    body: [
      {
        type: "list-chevron",
        items: [
          "Create and manage your account, verify student status, and keep you signed in securely",
          "Operate the marketplace: listings, search, campus scoping, wishlist, quotas, boosts, plans, and badges",
          "Keep the community safe: review reported content, detect fraud, spam, gaming, and abuse, and enforce moderation",
          "Provide support and send transactional messages (verification, password resets, order and report updates)",
          "Maintain and improve the platform through aggregated, anonymised analytics",
          "Comply with applicable Indian law, payment-record rules, and lawful requests",
        ],
      },
    ],
  },
  {
    title: "4. HOW WE SHARE YOUR DATA",
    body: [
      {
        type: "p",
        text: "We do not sell, rent, or trade your personal data. Limited sharing occurs only when:",
      },
      {
        type: "list-chevron",
        items: [
          "You transact or chat: the other user sees your display name, profile photo, campus, and your listing content including its pickup spot text",
          "Service providers process data on our behalf under contractual safeguards — hosting and database, image storage and delivery, Razorpay for payments, and Resend/EmailJS/Google for email and sign-in",
          "Safety requires it: reported chats, listings, or accounts reviewed by our moderation team",
          "Required by court order, law-enforcement request, or Indian regulatory authority, or in a merger/acquisition under equivalent protections",
        ],
      },
    ],
  },
  {
    title: "5. DATA RETENTION",
    body: [
      {
        type: "p",
        text: "We keep your data while your account is active. Deletion requests are fulfilled within 30 days. Limited records are kept longer where the law requires it (e.g. payment records) or where legitimate safety needs apply (e.g. minimal moderation history against fraud and ban evasion). Backups roll over on their normal cycle.",
      },
    ],
  },
  {
    title: "6. COOKIES & ON-DEVICE STORAGE",
    body: [
      {
        type: "list-chevron",
        items: [
          "Essential HttpOnly cookies keep you signed in and protect sessions — the app cannot function without them",
          "Your browser/device may hold preferences (theme), listing drafts, recent searches, and anti-spam timers, which you can clear anytime via browser settings or in-app controls",
          "We run no third-party advertising trackers; analytics, if any, are anonymised",
          "Disabling storage or cookies may break sign-in, drafts, and other core features",
        ],
      },
    ],
  },
  {
    title: "7. SECURITY",
    body: [
      {
        type: "list-chevron",
        items: [
          "HTTPS encryption in transit, hashed passwords, short-lived sessions with instant revocation, signed image uploads, and abuse rate-limiting",
          "Access to personal data is restricted to personnel and systems that need it for the purposes above",
          "No internet transmission is 100% secure — use a strong unique password, log out on shared devices, and report suspected breaches immediately",
          "If a breach affecting your data occurs, we will notify you and the authorities as required by law",
        ],
      },
    ],
  },
  {
    title: "8. YOUR RIGHTS",
    body: [
      {
        type: "list-chevron",
        items: [
          "Access: request a copy of the personal data we hold about you",
          "Correction: fix inaccurate or incomplete information (most profile fields are editable in Settings)",
          "Erasure: delete your account and associated data via Settings, subject to Section 5 retention",
          "Portability: receive your data in a structured, machine-readable format on request",
          "Grievance: raise any privacy concern and receive a response under the timelines in Section 13",
        ],
      },
      {
        type: "p",
        html: "Exercise any right from your account email via the in-app Contact page or <strong>hi@unideals.in</strong>.",
      },
    ],
  },
  {
    title: "9. ACCOUNT DELETION — WHAT HAPPENS",
    body: [
      {
        type: "list-chevron",
        items: [
          "Your profile, listings, wishlist, pickup spots, and unused boosts are removed or unlisted, and your sessions are revoked immediately",
          "Deletion needs password re-authentication (Google-only users set a password via Forgot Password first)",
          "Reported chats, filed reports, payment records, and moderation history may be retained in limited form for safety, fraud-prevention, and legal compliance",
          "If you return later you will need a fresh account and fresh email verification",
        ],
      },
    ],
  },
  {
    title: "10. CHILDREN",
    body: [
      {
        type: "p",
        text: "Unideals is for students aged 18 and above only. We do not knowingly collect data from minors; accounts found to belong to under-18 users are removed immediately along with their data.",
      },
    ],
  },
  {
    title: "11. THIRD-PARTY SERVICES & LINKS",
    body: [
      {
        type: "p",
        text: "Payments open Razorpay's secure checkout and sign-in may use Google — both operate under their own privacy policies for data they process directly. External links in listings or chats are not covered by this policy; interact with them at your own discretion.",
      },
    ],
  },
  {
    title: "12. CHANGES",
    body: [
      {
        type: "p",
        text: "Material changes will be notified at least 7 days before taking effect via in-app notice or email. Continued use after the effective date constitutes acceptance. The version timestamp at the top of this page always governs.",
      },
    ],
  },
  {
    title: "13. CONTACT & GRIEVANCE REDRESSAL",
    body: [
      {
        type: "list-chevron",
        items: [
          "Support and privacy queries: hi@unideals.in (write from your account email) or the in-app Contact page",
          "Grievances are acknowledged within 48 hours and resolved within 15 days",
          "Unideals, India",
        ],
      },
    ],
  },
];

const termsSections = [
  {
    title: "1. ACCEPTANCE",
    body: [
      {
        type: "p",
        text: "By creating an account, clicking Accept, or using Unideals in any way, you agree to these Terms and our Privacy Policy. Together they form a legally binding agreement between you and Unideals. If you do not agree, do not create an account and stop using the platform immediately.",
      },
    ],
  },
  {
    title: "2. ELIGIBILITY",
    body: [
      {
        type: "list-chevron",
        items: [
          "You must be at least 18 years old. Unideals is not for minors.",
          "You must be currently enrolled at a recognised Indian university or college.",
          "You must verify your email address before listing, buying, chatting, or boosting — verification links expire 24 hours after issue.",
          "One account per person. Duplicate, shared, transferred, or sold accounts are grounds for permanent suspension of all related accounts.",
          "You must provide accurate registration details and keep them up to date, including your campus.",
        ],
      },
    ],
  },
  {
    title: "3. OUR ROLE — A VENUE, NOT A PARTY",
    body: [
      {
        type: "p",
        html: "Unideals is a technology venue that connects student buyers and sellers. <strong>We are not a party to any transaction.</strong> We do not hold funds in escrow, take title to goods, inspect items, arrange shipping, or guarantee the quality, safety, authenticity, or legality of any listing. Every transaction is solely between the buyer and seller, including the price, payment method, and handover.",
      },
    ],
  },
  {
    title: "4. YOUR RESPONSIBILITIES",
    body: [
      {
        type: "list-chevron",
        items: [
          "Provide accurate, honest information in your profile, listings, and messages.",
          "Respond to buyer or seller messages within a reasonable time once you engage.",
          "Honour prices and terms once both sides have confirmed a deal.",
          "Inspect the item before paying, and never share OTPs, bank passwords, or advance payments with strangers.",
          "Meet only in safe, public campus locations — preferably your saved pickup spots — and consider daylight hours and high-value caution.",
          "Report suspicious listings, users, or messages promptly instead of engaging further.",
          "Keep your login credentials confidential and log out on shared devices.",
        ],
      },
    ],
  },
  {
    title: "5. PROHIBITED ACTIVITIES",
    body: [
      {
        type: "list-chevron",
        items: [
          "Listing illegal, stolen, counterfeit, or recalled goods; weapons; drugs; alcohol; tobacco; or prescription medication.",
          "Misrepresenting condition, authenticity, ownership, or MRP of any item, including fake discounts and bait-and-switch pricing.",
          "Fraud of any kind, including fake payments, payment screenshots, and chargeback abuse after receiving goods or benefits.",
          "Harassment, threats, hate speech, discrimination, or any sexual content or conduct — zero tolerance where minors could be involved.",
          "Scams and phishing, including fake links, impersonation of students, staff, or Unideals representatives, and soliciting credentials or money.",
          "Publishing your exact room number, home address, live location, or government ID details in listings, chats, or images.",
          "Fake reviews, rating manipulation, badge/XP gaming, shill accounts, and coordinated or retaliatory false reporting.",
          "Operating more than one account, or buying, selling, or sharing accounts.",
          "Scraping, bots, hacking, reverse-engineering, or interfering with rate limits and security controls.",
          "Commercial reselling, business storefronts, or advertising on Unideals without our written permission.",
        ],
      },
    ],
  },
  {
    title: "6. LISTINGS",
    body: [
      {
        type: "list-chevron",
        items: [
          "By posting you confirm you own the item or are authorised to sell it, and that the title, description, photos, price, category, and condition are accurate and lawful.",
          "Use a correct category and honest condition; miscategorised or misleading listings may be corrected or removed.",
          "Do not spam duplicate listings for the same item — edit or relist instead. Drafts are stored on your device and may expire.",
          "Mark items sold and unlist unavailable items promptly so buyers are not misled.",
          "Listing visibility is campus-scoped: your live listings appear on your current campus, and switching campus moves them with you.",
          "Unideals may edit, reject, unlist, or remove any listing at any time, with or without notice, for policy, safety, or legal reasons.",
        ],
      },
    ],
  },
  {
    title: "7. MEETUPS & HANDOVER",
    body: [
      {
        type: "list-chevron",
        items: [
          "Unideals provides pickup spots so you never need to share street addresses — use public campus spots, not private rooms or homes.",
          "Check the item and confirm it matches the listing before paying; test electronics on the spot where possible.",
          "Keep a record of the deal (chat confirmation, receipt or photo) until both sides are satisfied.",
          "Either side may walk away before money or goods change hands; after handover, disputes are between buyer and seller.",
          "If you feel unsafe at any point, leave immediately and report the user — no deal is worth a safety risk.",
        ],
      },
    ],
  },
  {
    title: "8. PAYMENTS, PLANS & BOOSTS",
    body: [
      {
        type: "list-chevron",
        items: [
          "Online plan and boost purchases are processed securely by Razorpay. We never see or store your card, UPI, or bank credentials.",
          "Founder plans (Pro ₹99, Pro+ ₹199) are one-time launch offers granting lifetime benefits to the purchasing account; future buyers move to semester billing. Benefits are tied to your account and cannot be transferred, shared, or sold.",
          "All digital purchases (plans and boost add-ons) are final once activated and are non-refundable, except where consumer law requires otherwise. Failed or duplicate charges are reviewed case-by-case through support.",
          "Chargebacks, disputes, or refunds initiated after receiving benefits will lead to revocation of the entitlement and review or suspension of the account.",
          "Monthly boost quotas reset each calendar month and do not roll over. A boost stays attached to its listing — deleting or moving the listing ends the remaining boost time without refund or credit.",
          "Plan limits (listings, wishlist, boosts, priority) are enforced live; attempting to bypass limits may trigger suspension.",
          "We may evolve plan features and prices with reasonable notice; Founder lifetime benefits already granted are honoured.",
        ],
      },
    ],
  },
  {
    title: "9. CHAT & CONDUCT",
    body: [
      {
        type: "list-chevron",
        items: [
          "Keep negotiations inside Unideals chat so there is a record if anything goes wrong — deals struck entirely off-platform carry no platform protection or support.",
          "Never share bank details, card numbers, Aadhaar, OTPs, or passwords in chat, and never open suspicious links or QR codes from strangers.",
          "Chats may be reviewed by our safety team when a conversation is reported, solely for safety, fraud, and dispute purposes.",
          "Use block and report tools instead of continuing hostile or suspicious conversations.",
        ],
      },
    ],
  },
  {
    title: "10. CONTENT & INTELLECTUAL PROPERTY",
    body: [
      {
        type: "list-chevron",
        items: [
          "All Unideals software, trademarks, branding, and platform content belong to Unideals or its licensors — do not copy, scrape, or reuse them.",
          "By uploading photos, descriptions, or profile content you confirm you own the rights and grant Unideals a non-exclusive, royalty-free licence to host, display, and distribute that content to operate and improve the platform.",
          "Do not upload anyone else's photos, personal data, or copyrighted material (e.g. watermarked stock images, textbook scans) without rights.",
        ],
      },
    ],
  },
  {
    title: "11. BADGES, LEVELS & LEADERBOARDS",
    body: [
      {
        type: "list-chevron",
        items: [
          "XP, levels, ranks, badges, and leaderboards are reputation signals for fun and trust only — they carry no monetary value and cannot be redeemed, transferred, or sold.",
          "Gaming, farming, or exploiting badge mechanics may lead to correction or reset of gamification standing and further moderation.",
          "We may tune formulas, badges, and leaderboards as the system evolves; standings are computed per campus unless stated otherwise.",
        ],
      },
    ],
  },
  {
    title: "12. REPORTS & MODERATION",
    body: [
      {
        type: "list-chevron",
        items: [
          "Report inappropriate products, users, or messages with specifics — every report is reviewed by our safety team, and you may be contacted by email for follow-up.",
          "Moderation outcomes range from warnings and listing removal to temporary suspension and permanent bans, depending on severity and history.",
          "Deliberately false, retaliatory, or brigaded reports are themselves violations and may lead to action against the reporter.",
          "If you believe moderation was a mistake, appeal through the Contact page or support email with your account email and details.",
        ],
      },
    ],
  },
  {
    title: "13. ACCOUNT SUSPENSION & DELETION",
    body: [
      {
        type: "list-chevron",
        items: [
          "We may suspend or terminate accounts at any time for violations, fraud, chargeback abuse, or user-safety concerns, with access ending immediately.",
          "You can delete your account from Settings after password re-authentication (Google-only users set a password via Forgot Password first). Deletion removes your profile and unlists your listings; boosts are forfeited.",
          "Some records (e.g. reported chats, payment records, moderation history) may be retained in limited form for safety, fraud-prevention, and legal compliance as described in the Privacy Policy.",
          "Unverified accounts and expired verification links may be cleaned up automatically; resend a fresh link from the login screens if needed.",
        ],
      },
    ],
  },
  {
    title: "14. LIMITATION OF LIABILITY",
    body: [
      {
        type: "list-chevron",
        items: [
          "The platform is provided as-is, without warranties of any kind; we do not guarantee uninterrupted, error-free, or secure access.",
          "Unideals is not liable for loss or damage arising from user transactions, meetups, listings, or user conduct.",
          "To the maximum extent permitted by law, our total liability for any claim is capped at ₹1,000 (one thousand rupees).",
          "We are not liable for indirect, incidental, consequential, or punitive damages, including lost profits or data.",
        ],
      },
    ],
  },
  {
    title: "15. INDEMNITY",
    body: [
      {
        type: "p",
        text: "You agree to indemnify and hold harmless Unideals, its team, and affiliates from any claims, losses, or expenses (including reasonable legal costs) arising from your listings, transactions, content, or violation of these Terms or applicable law.",
      },
    ],
  },
  {
    title: "16. DISPUTES",
    body: [
      {
        type: "p",
        text: "Buyer–seller disputes should first be raised directly and promptly, with chat records as evidence. You may ask our support team for good-offices help, which we may provide at our sole discretion and which does not make us a party. Disputes with Unideals proceed first through good-faith negotiation, failing which the courts of competent jurisdiction at Vellore, Tamil Nadu shall have exclusive jurisdiction.",
      },
    ],
  },
  {
    title: "17. CHANGES TO THESE TERMS",
    body: [
      {
        type: "p",
        text: "We may update these Terms as the platform evolves. Material changes are notified at least 7 days in advance via in-app notice or email, and continued use after the effective date constitutes acceptance. The version timestamp at the top of this page always governs.",
      },
    ],
  },
  {
    title: "18. GOVERNING LAW & GRIEVANCE REDRESSAL",
    body: [
      {
        type: "list-chevron",
        items: [
          "These Terms are governed by the laws of the Republic of India, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023, and the Consumer Protection Act, 2019, as applicable.",
          "For complaints, appeals, or grievances, write to hi@unideals.in from your account email, or use the Contact page in the app. We acknowledge grievances within 48 hours and resolve them within 15 days.",
          "Jurisdiction for any legal proceedings lies exclusively with the courts at Vellore, Tamil Nadu.",
        ],
      },
    ],
  },
];

// --- COMPONENTS ---

function LegalSection({ title, body }) {
  return (
    <div className="font-figtree">
      <h3 className="mb-4 border-b border-gray-100 pb-3 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:border-gray-800 dark:text-white lg:text-sm">
        {title}
      </h3>
      <div className="space-y-4 text-[13px] leading-relaxed text-gray-500 dark:text-gray-300 lg:text-[0.85rem]">
        {body.map((block, index) => {
          if (block.type === "p") {
            return block.html ? (
              <p key={index} dangerouslySetInnerHTML={{ __html: block.html }} />
            ) : (
              <p key={index}>{block.text}</p>
            );
          }

          if (block.type === "list-bold") {
            return (
              <div key={index} className="space-y-3 pt-0">
                {block.items.map((item, j) => (
                  <div
                    key={j}
                    className="flex flex-col gap-1 sm:flex-row sm:gap-2"
                  >
                    <span className="min-w-fit font-bold text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            );
          }

          if (block.type === "list-chevron") {
            return (
              <ul key={index} className="space-y-3 pt-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <FiChevronRight
                      className="mt-[3px] shrink-0 text-[#364EF2]"
                      size={16}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function LegalDocument({ initialType = "privacy" }) {
  const [activeTab, setActiveTab] = useState(initialType);
  const isPrivacy = activeTab === "privacy";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <div className="font-figtree w-full bg-[#F7F9FD] dark:bg-[#131313]">
      {/* Header Area */}


      {/* Tab Switcher */}
      <div className="mb-4 inline-flex items-center p-1 bg-gray-100 dark:bg-[#1A1D20] rounded-2xl border border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 ${
            isPrivacy
              ? "bg-[#F7F8FA] font-medium text-gray-900 shadow-sm dark:bg-[#25282c] dark:text-white"
              : "bg-transparent font-medium text-[#9AA4B2] hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FiShield
            size={18}
            strokeWidth={isPrivacy ? 2.5 : 2}
            className={
              isPrivacy ? "text-gray-900 dark:text-white" : "text-[#9AA4B2]"
            }
          />
          Privacy Policy
        </button>

        <button
          onClick={() => setActiveTab("terms")}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition-all duration-200 ${
            !isPrivacy
              ? "bg-[#F7F8FA] font-medium text-gray-900 shadow-sm dark:bg-[#25282c] dark:text-white"
              : "bg-transparent font-medium text-[#9AA4B2] hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FiFileText
            size={18}
            strokeWidth={!isPrivacy ? 2.5 : 2}
            className={
              !isPrivacy ? "text-gray-900 dark:text-white" : "text-[#9AA4B2]"
            }
          />
          Terms & Conditions
        </button>
      </div>

      {/* Main Content Card */}
      <div className="rounded-3xl border border-gray-100 bg-[#F7F8FA] p-6 shadow-[0px_4px_20px_-10px_rgba(0,0,0,0.05)] dark:border-gray-800 dark:bg-[#1c1c1c] lg:p-10">
        {/* Info Banner */}
        <div className="mb-8 flex items-center rounded-r-xl border-l-[3px] border-[#364EF2] bg-[#F7F8FA] px-5 py-3.5 dark:bg-[#252525]">
          <p className="text-[13px] text-gray-600 dark:text-gray-300 lg:text-sm">
            <span className="font-bold text-gray-900 dark:text-white">
              Last updated:
            </span>{" "}
            10 October 2026
            <span className="mx-3 font-bold text-gray-300 dark:text-gray-600">
              ·
            </span>
            {isPrivacy ? (
              <>
                <span className="font-bold text-gray-900 dark:text-white">
                  Effective:
                </span>{" "}
                24 May 2025
              </>
            ) : (
              <>
                <span className="font-bold text-gray-900 dark:text-white">
                  Governing law:
                </span>{" "}
                Republic of India
              </>
            )}
          </p>
        </div>

        {/* Sections Wrapper */}
        <div className="space-y-10 lg:space-y-10">
          {sections.map((section, index) => (
            <LegalSection
              key={index}
              title={section.title}
              body={section.body}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LegalDocument;
