import { useState } from "react";
import { FiShield, FiFileText, FiChevronRight } from "react-icons/fi";

// --- DATA ARRAYS ---

const privacySections = [
  {
    title: "1. WHO WE ARE",
    body: [
      {
        type: "p",
        text: "Unideals is a peer-to-peer student marketplace allowing verified university students to buy and sell goods within their campus community. We are committed to protecting the privacy of every user.",
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
            text: "Name, university email, profile photo, campus name, optional mobile number.",
          },
          {
            label: "Verification data:",
            text: "Student ID details to confirm enrollment. Not shared with third parties.",
          },
          {
            label: "Listing data:",
            text: "Product titles, descriptions, photos, pricing, and transaction records.",
          },
          {
            label: "Usage data:",
            text: "Pages viewed, searches, clicks, session duration, device/browser info (via cookies).",
          },
          {
            label: "Messages:",
            text: "In-app chat stored to support conversation continuity and safety investigations.",
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
          "Create and manage your account and verify student status",
          "Facilitate listings, transactions, and in-app messaging",
          "Send transactional notifications (order updates, price alerts, messages)",
          "Detect and prevent fraud, spam, and unsafe behaviour",
          "Improve platform features through anonymised analytics",
          "Comply with applicable Indian law and regulation",
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
          "Transacting with another user (only your first name and campus are shared)",
          "Working with service providers bound by data-processing agreements",
          "Required by court order or Indian regulatory authority",
          "Unideals undergoes acquisition or merger (under equivalent protections)",
        ],
      },
    ],
  },
  {
    title: "5. DATA RETENTION",
    body: [
      {
        type: "p",
        text: "We keep your data while your account is active. Deletion requests are fulfilled within 30 days, except where Indian law requires longer retention (typically up to 3 years for financial records).",
      },
    ],
  },
  {
    title: "6. COOKIES",
    body: [
      {
        type: "p",
        text: "We use essential session cookies and optional analytics cookies (anonymised). You may disable non-essential cookies in your browser, though some features may be affected.",
      },
    ],
  },
  {
    title: "7. SECURITY",
    body: [
      {
        type: "p",
        text: "We use HTTPS encryption, access controls, and regular security reviews. No internet transmission is 100% secure — please use a strong password and report any suspected breach immediately.",
      },
    ],
  },
  {
    title: "8. YOUR RIGHTS",
    body: [
      {
        type: "list-chevron",
        items: [
          "Access: request a copy of data we hold about you",
          "Correction: update inaccurate or incomplete information",
          "Deletion: permanently remove your account and data",
          "Portability: receive your data in a structured, machine-readable format",
          "Objection: opt out of direct marketing",
        ],
      },
      {
        type: "p",
        html: "Exercise any right by emailing <strong>privacy@campusmart.in</strong>.",
      },
    ],
  },
  {
    title: "9. CHILDREN",
    body: [
      {
        type: "p",
        text: "Unideals is for students aged 18 and above. If we discover a user is under 18, their account and data will be removed immediately.",
      },
    ],
  },
  {
    title: "10. CHANGES",
    body: [
      {
        type: "p",
        text: "Material changes will be notified at least 7 days before taking effect via in-app notification or email. Continued use constitutes acceptance.",
      },
    ],
  },
  {
    title: "11. CONTACT",
    body: [
      {
        type: "p",
        html: "Data Protection queries: <strong>privacy@campusmart.in</strong><br/>Unideals, Bangalore, India",
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
        text: "By using Unideals you agree to these Terms. They form a legally binding agreement. If you disagree, stop using the platform immediately.",
      },
    ],
  },
  {
    title: "2. ELIGIBILITY",
    body: [
      {
        type: "list-chevron",
        items: [
          "Minimum age of 18",
          "Currently enrolled at a recognised Indian university or college",
          "Completed campus email verification to list or buy",
          "One account per person — duplicates are grounds for permanent suspension",
        ],
      },
    ],
  },
  {
    title: "3. OUR ROLE",
    body: [
      {
        type: "p",
        html: "Unideals is a technology marketplace. <strong>We are not a party to any transaction.</strong> We do not hold funds, take title to goods, or guarantee quality, safety, or legality of any listing. Transactions are entirely between buyers and sellers.",
      },
    ],
  },
  {
    title: "4. WHAT YOU MUST DO",
    body: [
      {
        type: "list-chevron",
        items: [
          "Provide accurate, honest information in your profile and listings",
          "Respond to buyer or seller messages within a reasonable time",
          "Meet transaction partners only in safe, public campus locations",
          "Honour agreed prices and terms once confirmed",
          "Report suspicious listings or users via the flag button",
          "Keep your login credentials confidential",
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
          "Listing illegal goods, counterfeit products, weapons, drugs, alcohol, or prescription medication",
          "Misrepresenting condition, authenticity, or ownership of any item",
          "Price gouging, bait-and-switch, or any form of fraud",
          "Harassing, threatening, or discriminating against any user",
          "Sharing personal home addresses before establishing trust in-app",
          "Circumventing in-app messaging to conduct transactions off-platform",
          "Creating fake reviews or trust signals",
          "Scraping, hacking, or reverse-engineering the platform",
          "Using Unideals for commercial reselling without written permission",
          "Impersonating any student, staff member, or Unideals representative",
        ],
      },
    ],
  },
  {
    title: "6. LISTINGS",
    body: [
      {
        type: "p",
        text: "By posting a listing you confirm you own the item (or have authority to sell it), the description and photos are accurate, and the item is lawful. Unideals may remove any listing at any time without prior notice.",
      },
    ],
  },
  {
    title: "7. INTELLECTUAL PROPERTY",
    body: [
      {
        type: "p",
        text: "All platform content, trademarks, and software belong to Unideals or its licensors. By uploading content you grant us a non-exclusive, royalty-free licence to use it for operating and improving the platform.",
      },
    ],
  },
  {
    title: "8. LIMITATION OF LIABILITY",
    body: [
      {
        type: "list-chevron",
        items: [
          "Unideals is not liable for loss or damage arising from user transactions",
          "We do not guarantee uninterrupted or error-free access",
          "Total liability for any claim is capped at ₹1,000 (one thousand rupees)",
          "We are not liable for indirect, consequential, or punitive damages",
        ],
      },
    ],
  },
  {
    title: "9. DISPUTES",
    body: [
      {
        type: "p",
        text: "User-to-user disputes are not mediated by Unideals unless we choose to at our sole discretion. Disputes with Unideals proceed first through good-faith negotiation, then courts of competent jurisdiction in Vellore, Tamil Nadu.",
      },
    ],
  },
  {
    title: "10. TERMINATION",
    body: [
      {
        type: "p",
        text: "We may suspend or terminate accounts at any time for any violation, fraudulent activity, or user-safety concern. Your access ends immediately on termination.",
      },
    ],
  },
  {
    title: "11. GOVERNING LAW",
    body: [
      {
        type: "p",
        text: "Governed by Indian law, including the Information Technology Act 2000 and Consumer Protection Act 2019. Jurisdiction: Vellore, Tamil Nadu.",
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
              ? "bg-white font-medium text-gray-900 shadow-sm dark:bg-[#25282c] dark:text-white"
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
              ? "bg-white font-medium text-gray-900 shadow-sm dark:bg-[#25282c] dark:text-white"
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
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0px_4px_20px_-10px_rgba(0,0,0,0.05)] dark:border-gray-800 dark:bg-[#1c1c1c] lg:p-10">
        {/* Info Banner */}
        <div className="mb-8 flex items-center rounded-r-xl border-l-[3px] border-[#364EF2] bg-[#F8F9FA] px-5 py-3.5 dark:bg-[#252525]">
          <p className="text-[13px] text-gray-600 dark:text-gray-300 lg:text-sm">
            <span className="font-bold text-gray-900 dark:text-white">
              Last updated:
            </span>{" "}
            26 May 2026
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
