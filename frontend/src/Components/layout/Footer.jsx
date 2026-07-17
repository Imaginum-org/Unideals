import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import footerBg from "/footer_bg.webp";
import "../common/ShareButton.css";
import ShareButton from "../common/ShareButton.jsx";

const FOOTER_LINKS = [
  {
    title: "Marketplace",
    links: [
      { label: "Sell Now", href: "/upload" },
      { label: "Chats", href: "/chat" },
      { label: "My Orders", href: "/myorders" },
      { label: "Settings", href: "/settings" },
      { label: "My Listings", href: "/productlisted" },
    ],
  },

  {
    title: "Company",
    links: [
      { label: "Imaginum", href: "https://imaginumorg.vercel.app/" },
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
      { label: "Report a Bug", href: "/contact" },
      { label: "Suggest a Feature", href: "/contact" },
      { label: "FAQ", href: "/contact" },
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
    <div className="bg-white p-3 md:p-6 dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-[1600px]">
        <footer
          style={{
            backgroundImage: `url(${footerBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          className="w-full overflow-hidden rounded-[30px] px-5 pt-5 font-figtree"
        >
          <div
            className="rounded-[30px] bg-white dark:bg-[#131313] dark:text-white px-6
py-8
sm:px-8
md:px-12
lg:px-16 text-[#5d6068] shadow-2xl"
          >
            <div
              className="grid grid-cols-1
sm:grid-cols-2
lg:grid-cols-[1.5fr_1fr_1fr_1fr]
gap-8"
            >
              <div>
                <Link
                  to="/"
                  className="mb-6 flex flex-col items-start text-xl font-semibold text-black dark:text-white"
                >
                  <div className="flex items-center justify-center">
                    <img
                      src="/logo.svg"
                      alt="image"
                      className="h-12 w-12 object-cover"
                    />
                    <div className="flex flex-col leading-6">
                      <h1>Unideals</h1>
                      <h5 className="text-xs font-medium text-slate-600">
                        By Imaginum
                      </h5>
                    </div>
                  </div>
                </Link>

                <p className="mb-8 max-w-[230px] leading-6 text-base text-[#2D3339] dark:text-slate-500">
                  Your campus connection for buying, selling, and trading.
                </p>

                <h3 className="mb-4 font-semibold text-base text-[#2D3339]">
                  STAY IN THE LOOP
                </h3>
                <form className="mb-6 flex max-w-[330px] gap-3">
                  <input
                    type="email"
                    placeholder="Drop you mail"
                    className="min-w-0 flex-1 rounded-xl outline-none text-black select-none bg-[#F3F4F8] px-5 py-3 border border-[#E8EAF0] placeholder:text-[#7A8697]"
                  />
                  <button
                    type="submit"
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-[#3838EC] text-xl text-white"
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
      h-11
      w-11
      place-items-center
      rounded-lg
      bg-[#F3F4F8]
      text-lg
      text-[#4A5565]
      transition-all
      duration-300
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
                  <h3 className="mb-6 font-bold uppercase text-[#313131]">
                    {title}
                  </h3>

                  <ul className="space-y-3">
                    {links.map(({ label, href }) => (
                      <li key={label}>
                        <Link
                          to={href}
                          className="
                          text-[#2D3339]
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
                          className="font-medium text-[#3838EC]"
                        >
                          unideals@gmail.com
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-16 flex flex-col gap-8 border-t border-[#e7e8e9] pt-6 text-sm text-[#9CA3AF] md:flex-row md:items-center md:justify-between">
              <p>© {new Date().getFullYear()} Unideals All rights reserved.</p>

              <div className="flex items-center gap-7 text-[#9CA3AF]">
                <Link to="/termscondition">Terms and Privacy</Link>
                <ShareButton />
              </div>
            </div>
          </div>

          <motion.h2
            initial={{ y: 70, opacity: 0.85 }}
            whileInView={{ y: 50, opacity: 0.9 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ amount: 0.45 }}
            className="pointer-events-none mt-[-1.2vh] select-none text-center text-[clamp(4rem,15vw,15rem)] font-bold leading-none text-white"
          >
            unideals
          </motion.h2>
        </footer>
      </div>
    </div>
  );
};

export default Footer;
