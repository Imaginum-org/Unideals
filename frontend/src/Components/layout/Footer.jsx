import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiShare2 } from "react-icons/fi";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import footerBg from "/footer_bg.png";
import "../common/ShareButton.css";
import ShareButton from "../common/ShareButton.jsx";

const FOOTER_LINKS = [
  {
    title: "Marketplace",
    links: [
      { label: "Sell Now", href: "/sell" },
      { label: "Chats", href: "/chats" },
      { label: "My Orders", href: "/orders" },
      { label: "Settings", href: "/settings" },
      { label: "My Listings", href: "/my-listings" },
    ],
  },

  {
    title: "Company",
    links: [
      { label: "Imaginum", href: "/imaginum" },
      { label: "LinkedIn", href: "/linkedin" },
      { label: "Careers", href: "/careers" },
      { label: "Blogs", href: "/blogs" },
      { label: "New Releases", href: "/releases" },
    ],
  },

  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Report a Bug", href: "/report-bug" },
      { label: "Suggest a Feature", href: "/feature-request" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

const SOCIAL_LINKS = [
  {
    icon: FaXTwitter,
    href: "https://x.com",
    label: "X",
  },
  {
    icon: FaInstagram,
    href: "https://instagram.com",
    label: "Instagram",
  },
  {
    icon: FaLinkedinIn,
    href: "https://linkedin.com",
    label: "LinkedIn",
  },
];

const Footer = () => {
  return (
    <div className="bg-white p-3 md:p-5 dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-[1600px]">
        <footer
          style={{
            backgroundImage: `url(${footerBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          className="w-full overflow-hidden rounded-3xl px-5 pt-5 font-figtree"
        >
          <div
            className="rounded-3xl bg-white dark:bg-[#131313] dark:text-white px-6
py-8
sm:px-8
md:px-12
lg:px-16 text-[#5d6068] shadow-2xl"
          >
            <div
              className="grid grid-cols-1
sm:grid-cols-2
lg:grid-cols-[1.5fr_1fr_1fr_1fr]
gap-12"
            >
              <div>
                <Link
                  to="/"
                  className="mb-7 flex items-center gap-3 text-2xl font-bold text-black"
                >
                  <img
                    src="/logo.svg"
                    alt="image"
                    className="h-6 w-6 object-contain"
                  />
                  Unideals
                </Link>

                <p className="mb-7 max-w-[230px] leading-7">
                  Your campus connection for buying, selling, and trading.
                </p>

                <h3 className="mb-4 font-bold text-[#4c4f58]">
                  STAY IN THE LOOP
                </h3>
                <form className="mb-6 flex max-w-[330px] gap-2">
                  <input
                    type="email"
                    placeholder="Drop you mail"
                    className="min-w-0 flex-1 rounded-xl bg-[#f1f2f6] px-5 py-3 outline-none placeholder:text-[#b8bcc6]"
                  />
                  <button
                    type="submit"
                    className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-xl text-white"
                  >
                    <FiArrowRight />
                  </button>
                </form>

                <div className="flex gap-3">
                  {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="
      grid
      h-10
      w-10
      place-items-center
      rounded-xl
      bg-[#f4f5f8]
      text-lg
      text-[#6f737c]
      transition-all
      duration-300
      hover:-translate-y-1
      hover:bg-indigo-600
      hover:text-white
    "
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>

              {FOOTER_LINKS.map(({ title, links }) => (
                <div key={title}>
                  <h3 className="mb-6 font-bold text-[#4c4f58]">{title}</h3>

                  <ul className="space-y-4">
                    {links.map(({ label, href }) => (
                      <li key={label}>
                        <Link
                          to={href}
                          className="
              transition-colors
              duration-200
              hover:text-indigo-600
            "
                        >
                          {label}
                        </Link>
                      </li>
                    ))}

                    {title === "Support" && (
                      <li>
                        <a
                          href="mailto:unideals@gmail.com"
                          className="font-medium text-indigo-500"
                        >
                          unideals@gmail.com
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-20 flex flex-col gap-5 border-t border-gray-100 pt-8 text-sm text-[#b6bbc4] md:flex-row md:items-center md:justify-between">
              <p>© {new Date().getFullYear()} Imaginum All rights reserved.</p>

              <div className="flex items-center gap-7">
                <Link to="/termscondition">Terms and Privacy</Link>
                <ShareButton />
              </div>
            </div>
          </div>

          <motion.h2
            initial={{ y: 28, opacity: 0.85 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            viewport={{ amount: 0.45 }}
            className="pointer-events-none select-none text-center text-[clamp(4rem,15vw,15rem)] font-bold leading-none text-white/55"
          >
            unideals
          </motion.h2>
        </footer>
      </div>
    </div>
  );
};

export default Footer;
