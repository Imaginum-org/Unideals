import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight, FiMail } from "react-icons/fi";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { LuBadgeCheck, LuMapPin, LuShieldCheck } from "react-icons/lu";
import "../common/ShareButton.css";
import ShareButton from "../common/ShareButton.jsx";

/*
 * Site footer. Uses the same gradient art, radius, shadow and max width as
 * the home hero banner so the top and bottom of the page mirror each other.
 */

const SUPPORT_EMAIL = "unideals@gmail.com";

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { label: "Explore deals", to: "/explore" },
      { label: "Sell an item", to: "/upload" },
      { label: "Pricing", to: "/price" },
      { label: "Wishlist", to: "/wishlist" },
      { label: "Messages", to: "/chat" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Profile", to: "/profile" },
      { label: "My listings", to: "/productlisted" },
      { label: "Orders", to: "/myorders" },
      { label: "Achievements", to: "/achievements" },
      { label: "Settings", to: "/settings" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help & support", to: "/contact" },
      { label: "FAQ", to: "/faq" },
      { label: "Report a bug", to: "/contact" },
      { label: "Imaginum", href: "https://imaginumorg.vercel.app/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", to: "/termscondition?tab=terms" },
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Safety tips", to: "/faq" },
    ],
  },
];

const SOCIAL_LINKS = [
  { icon: FaXTwitter, href: "https://x.com", label: "Unideals on X" },
  { icon: FaInstagram, href: "https://instagram.com", label: "Unideals on Instagram" },
  { icon: FaLinkedinIn, href: "https://linkedin.com", label: "Unideals on LinkedIn" },
];

const TRUST = [
  { icon: LuShieldCheck, text: "Secure payments", logo: true },
  { icon: LuMapPin, text: "Campus-only marketplace" },
  { icon: LuBadgeCheck, text: "Verified student accounts" },
];

const linkCls = "text-[14px] text-white/70 transition-colors hover:text-white";

function FooterLink({ label, to, href }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${linkCls} inline-flex items-center gap-1`}>
        {label}
        <FiArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link to={to} className={linkCls}>
      {label}
    </Link>
  );
}

const Footer = () => {
  const reduceMotion = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <div className="w-full bg-[#F7F8FA] px-5 pb-4 pt-8 sm:px-[4.5vw] sm:pb-6 sm:pt-12 dark:bg-[#131313]">
      <footer
        className="brand-surface mx-auto w-full max-w-[1380px] overflow-hidden rounded-xl font-figtree text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] md:rounded-2xl"
      >

        <div className="relative px-5 pt-8 sm:px-8 sm:pt-10 lg:px-12">
          {/* CTA */}
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">Got something lying around?</h2>
              <p className="mt-1.5 max-w-md text-[14px] text-white/75 sm:text-[15px]">
                List it in two minutes and sell to students on your campus. No fees, no shipping.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/upload"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-[14px] font-bold text-[#2D3339] shadow-md transition-transform active:scale-95"
              >
                Sell now <FiArrowRight aria-hidden="true" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[14px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/15"
              >
                Explore deals
              </Link>
            </div>
          </div>

          <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Brand + link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Unideals home">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm">
                  <img src="/logo.svg" alt="" className="h-9 w-9 object-contain" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[18px] font-bold">Unideals</span>
                  <span className="block text-[12px] font-medium text-white/60">by Imaginum</span>
                </span>
              </Link>
              <p className="mt-4 max-w-[260px] text-[14px] leading-relaxed text-white/70">
                The campus marketplace for students. Buy, sell and trade with people you can meet.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-medium text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/15"
              >
                <FiMail className="h-4 w-4" aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
              <div className="mt-4 flex gap-2">
                {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-[15px] text-white/85 ring-1 ring-white/15 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-[var(--accent)]"
                  >
                    <Icon aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {COLUMNS.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h3 className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/50">{title}</h3>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l.label}>
                      <FooterLink {...l} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Trust strip */}
          <div className="mt-9 flex flex-wrap items-center gap-2">
            {TRUST.map(({ icon: Icon, text, logo }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white/85 ring-1 ring-white/15 backdrop-blur"
              >
                <Icon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                {text}
                {logo && <img src="/razorpay.svg" alt="Razorpay" loading="lazy" className="h-4 w-auto rounded bg-white px-1.5 py-0.5" />}
              </span>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-[12.5px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} Unideals. All rights reserved. <span className="hidden sm:inline">Made for students in India.</span>
            </p>
            <div className="flex items-center gap-5">
              <Link to="/termscondition?tab=terms" className="hover:text-white">
                Terms
              </Link>
              <Link to="/privacy-policy" className="hover:text-white">
                Privacy
              </Link>
              <ShareButton className="footer-share-btn" />
            </div>
          </div>
        </div>

        {/* Giant wordmark, cropped by the card edge */}
        <div className="relative h-[clamp(4.2rem,15vw,13.5rem)] overflow-hidden" aria-hidden="true">
          <motion.p
            initial={reduceMotion ? false : { y: "35%", opacity: 0.6 }}
            whileInView={{ y: "18%", opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none select-none bg-gradient-to-b from-white via-white/80 to-white/10 bg-clip-text text-center text-[clamp(5rem,19vw,17.5rem)] font-extrabold leading-[0.8] tracking-[-0.04em] text-transparent"
          >
            unideals
          </motion.p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;