const termsSections = [
  {
    title: "Fair Platform Use",
    items: [
      "Users must engage in honest and fair transactions. Fraudulent activity, misrepresentation, or misleading listings are strictly prohibited.",
      "Any misuse of the platform, such as spamming, harassing other users, or exploiting platform vulnerabilities, will result in account suspension.",
      "Unideals reserves the right to remove content or restrict accounts violating our terms.",
    ],
  },
  {
    title: "User Responsibility",
    items: [
      "Users must provide accurate and up-to-date information when registering and transacting on the platform.",
      "You are responsible for safeguarding your account credentials. Unideals will not be liable for unauthorized access due to user negligence.",
      "Any disputes arising from transactions must be resolved amicably between parties before seeking platform intervention.",
    ],
  },
  {
    title: "Seller Responsibility",
    items: [
      "Sellers must ensure that all product listings are accurate, truthful, and clearly described.",
      "Selling illegal, counterfeit, or prohibited items is strictly forbidden.",
      "Sellers must honor confirmed sales and deliver products in the agreed-upon condition and timeframe.",
      "Refund and return policies must be explicitly mentioned in the listing if applicable.",
    ],
  },
  {
    title: "Product Listing Guidelines",
    items: [
      "All listings must include clear images, detailed descriptions, and accurate pricing.",
      "Listings containing offensive, misleading, or inappropriate content will be removed.",
      "Prohibited items include illegal substances, stolen goods, hazardous materials, and items violating intellectual property rights.",
    ],
  },
  {
    title: "Buying Guidelines",
    items: [
      "Buyers should review product details, seller ratings, and reviews before making a purchase.",
      "All transactions should be conducted through the platform's approved channels to support safer communication and dispute resolution.",
      "Buyers must verify product conditions and legitimacy before completing transactions.",
    ],
  },
  {
    title: "Payment and Transactions",
    items: [
      "Transactions must be conducted using approved payment methods on the platform.",
      "Unideals is not liable for external transactions conducted outside the platform's payment system.",
      "Refunds and disputes must be handled per the seller's stated return policy.",
    ],
  },
  {
    title: "Privacy and Data Security",
    items: [
      "Users' personal data is protected according to our Privacy Policy. We do not sell user data.",
      "Users should report any suspicious activity or security breaches immediately.",
    ],
  },
  {
    title: "Prohibited Activities",
    items: [
      "Any fraudulent, deceptive, or illegal activity is strictly prohibited.",
      "Users must not engage in harassment, hate speech, or discrimination on the platform.",
      "Any attempt to manipulate ratings, reviews, or search results unfairly is not allowed.",
    ],
  },
  {
    title: "Content Ownership and Intellectual Property",
    items: [
      "Users retain ownership of the content they upload but grant Unideals a non-exclusive license to use, display, and distribute such content for platform-related purposes.",
      "Any unauthorized use of Unideals's branding, trademarks, or intellectual property is prohibited.",
    ],
  },
  {
    title: "Account Suspension and Termination",
    items: [
      "Unideals reserves the right to suspend or terminate accounts found violating these terms.",
      "Users may request account deletion at any time, subject to resolving any ongoing transactions or disputes.",
    ],
  },
  {
    title: "Liability and Disclaimers",
    items: [
      "Unideals acts as a marketplace and is not responsible for the quality, safety, or legitimacy of listed products.",
      "Users transact at their own risk, and Unideals holds no liability for disputes or losses arising from transactions.",
      "We reserve the right to modify these terms at any time, and continued use of the platform implies acceptance of updated terms.",
    ],
  },
];

const privacySections = [
  {
    title: "Information We Collect",
    items: [
      "We collect account details such as name, email address, campus information, profile photo, and authentication status.",
      "We collect marketplace activity such as listings, orders, chats, wishlist activity, support requests, and product interactions.",
      "We may collect technical information needed to keep the platform secure, including device, browser, and session information.",
    ],
  },
  {
    title: "How We Use Information",
    items: [
      "We use your information to create accounts, verify email addresses, show listings, process marketplace actions, and support buyer-seller communication.",
      "We use platform activity to improve safety, prevent misuse, investigate reports, and maintain service quality.",
      "We may send transactional emails such as verification, password reset, support, and important account notices.",
    ],
  },
  {
    title: "Sharing and Visibility",
    items: [
      "Public listing details may be visible to other users so they can evaluate and contact sellers.",
      "We do not sell personal information to third parties.",
      "We may disclose information if required by law, to protect users, or to investigate abuse of the platform.",
    ],
  },
  {
    title: "Security and Retention",
    items: [
      "We use reasonable safeguards to protect account and marketplace information.",
      "You are responsible for keeping your password and account access secure.",
      "We retain information as long as needed to operate Unideals, meet legal obligations, resolve disputes, and enforce policies.",
    ],
  },
  {
    title: "Your Choices",
    items: [
      "You can update profile information from your account settings where available.",
      "You may request account deletion, subject to unresolved orders, disputes, or safety reviews.",
      "For privacy questions, contact campus.mart@gmail.com.",
    ],
  },
];

function LegalHeader({ title, updated, intro, compact = false }) {
  return (
    <div className={compact ? "mb-4" : "mt-[4vh]"}>
      <div className="font-poppins text-[15px] font-semibold text-black dark:text-white xl:mb-[0.9vh] xl:text-xl xl:font-medium">
        {title}
      </div>
      <div className="mb-[2vh] font-poppins text-[12px] text-[#64707d] xl:mb-[1.3vh] xl:text-sm xl:font-light">
        Last updated {updated}
      </div>
      <div className="font-poppins text-[11px] font-light italic text-black dark:text-white xl:mb-[2vh] xl:text-[13px]">
        {intro}
      </div>
    </div>
  );
}

function LegalSection({ index, title, items, compact = false }) {
  return (
    <div className="mb-[1.6vh] font-poppins text-[12px] font-medium text-black dark:text-white xl:mb-[2.5vh] xl:text-[19px]">
      <span className="mr-[2.6vw] rounded-[3px] bg-[#e5e8ff] px-[1.6vw] py-0 dark:bg-[#131313] xl:mr-[0.7vw] xl:rounded-[8px] xl:px-[0.54vw] xl:py-[0.4vh]">
        {index}
      </span>
      {title}
      <div
        className={`ml-[7vw] text-justify font-poppins font-normal text-[#717171] dark:text-[#D7D7D7] xl:ml-[3.4vw] xl:mt-[1.5vh] ${
          compact ? "text-[11px] xl:text-[13px]" : "text-[9px] xl:text-[15px]"
        }`}
      >
        <ul className="list-disc">
          {items.map((item) => (
            <li className="my-[0.8vh]" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LegalDocument({ type = "terms", compact = false }) {
  const isPrivacy = type === "privacy";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <>
      <div className={compact ? "" : "relative"}>
        {!compact && !isPrivacy ? (
          <button className="absolute right-[5vw] top-[5.2vh] rounded-[5px] bg-[#e5e8ff] px-[4vw] py-[0.5vh] font-poppins text-[10px] font-medium text-black dark:bg-[#1A1D20] dark:text-white xl:right-[3.5vw] xl:top-[3vh] xl:px-[1.8vw] xl:py-[0.8vh] xl:text-sm">
            Must Read
          </button>
        ) : null}
        <LegalHeader
          title={isPrivacy ? "Privacy Policy" : "Terms and Condition"}
          updated={isPrivacy ? "May 9, 2026" : "May 9, 2026"}
          compact={compact}
          intro={
            isPrivacy
              ? "This Privacy Policy explains how Unideals collects, uses, protects, and manages your information."
              : "Welcome to Unideals! By using our platform, you agree to the following terms and conditions. Please read them carefully before proceeding."
          }
        />
      </div>

      <div className="mt-[2.5vh] h-0 w-full border border-[#bbc2c9]" />

      <div
        className={`mt-[2.2vh] rounded-[10px] bg-white shadow-[0px_4px_12px_0px_rgba(0,0,0,0.10)] dark:bg-zinc-900 xl:rounded-[20px] ${
          compact
            ? "px-4 py-4"
            : "mb-[2.6vh] pb-[0.4vh] pl-[3vw] pr-[4vw] pt-[2vh] lg:mx-0 lg:mb-[3.7vh] lg:mt-[2.5vh] lg:pl-[1.8vw] lg:pb-[1vh] lg:pt-[5.5vh] xl:pr-[3vw]"
        }`}
      >
        {sections.map((section, index) => (
          <LegalSection
            key={section.title}
            index={index + 1}
            compact={compact}
            {...section}
          />
        ))}

        <div className="h-0 w-full outline outline-1 outline-offset-[-0.50px] outline-neutral-300 dark:outline-zinc-300 md:mb-[4vh] md:mt-[3vh] lg:mb-[7vh] lg:mt-[4vh]" />

        <div className="mb-[2vh] justify-start">
          <span className="font-poppins text-[12px] font-medium text-black dark:text-zinc-100 md:text-xs md:font-normal lg:text-[15px] lg:font-medium">
            {isPrivacy
              ? "For privacy questions, account requests, or concerns, please contact our support team at"
              : "By using Unideals, you acknowledge and agree to these terms. If you have any questions or concerns, please contact our support team at"}
          </span>
          <span className="font-poppins text-[12px] font-medium text-indigo-500 md:text-xs md:font-normal lg:text-[15px]">
            {" "}
            campus.mart@gmail.com
          </span>
          <span className="font-poppins text-[12px] text-black dark:text-zinc-100 md:text-xs md:font-normal lg:text-[15px] lg:font-medium">
            .<br />
            <br />
            Thank you for being part of the Unideals community!
          </span>
        </div>
      </div>
    </>
  );
}

export default LegalDocument;
