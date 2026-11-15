import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight, FiMail } from "react-icons/fi";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { LuBadgeCheck, LuMapPin, LuShieldCheck } from "react-icons/lu";
import "../common/ShareButton.css";
import ShareButton from "../common/ShareButton.jsx";

/*
 * Site footer: one card, three bands.
 * 1. CTA band on the brand surface (matches the home hero).
 * 2. White (dark: charcoal) middle: brand, link columns, trust chips and the
 *    legal bar, so the page ends with contrast instead of a wall of colour.
 * 3. Brand-surface band with the giant cropped wordmark.
 * Same radius, shadow and max width as the home hero banner.
 */

const SUPPORT_EMAIL = "unideals.support@gmail.com";

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
  { icon: FaXTwitter, href: "https://x.com/unidealsdotin", label: "Unideals on X" },
  { icon: FaInstagram, href: "https://www.instagram.com/unidealsdotin/", label: "Unideals on Instagram" },
  { icon: FaYoutube, href: "https://www.youtube.com/@unidealsdotin", label: "Unideals on YouTube" },
];

const TRUST = [
  { icon: LuShieldCheck, text: "Secure payments", logo: true },
  { icon: LuMapPin, text: "Campus-only marketplace" },
  { icon: LuBadgeCheck, text: "Verified student accounts" },
];

// Shared focus ring for everything on the light middle band.
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#17191c]";

const linkCls = `rounded-sm text-[14px] text-slate-600 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white ${FOCUS}`;

function FooterLink({ label, to, href }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${linkCls} group inline-flex items-center gap-1`}>
        {label}
        <FiArrowUpRight
          className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-80"
          aria-hidden="true"
        />
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
      <footer className="brand-surface mx-auto w-full max-w-[var(--page-max)] overflow-hidden rounded-xl font-figtree shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] md:rounded-2xl">
        {/* ── 1. CTA band ── */}
        <div className="brand-surface relative overflow-hidden px-5 py-8 text-white sm:px-8 sm:py-10 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_45%,rgba(255,255,255,0.05)_100%)]" />
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
            <svg className="absolute -bottom-44 -left-28 h-[360px] w-[360px] opacity-[0.12]" viewBox="0 0 360 360">
              {[70, 115, 160].map((r) => (
                <circle key={r} cx="180" cy="180" r={r} fill="none" stroke="#fff" strokeWidth="1" />
              ))}
            </svg>
          </div>

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">Got something lying around?</h2>
              <p className="mt-1.5 max-w-md text-[14px] text-white/75 sm:text-[15px]">
                List it in two minutes and sell to students on your campus. No fees, no shipping.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 min-[400px]:flex-row">
              <Link
                to="/upload"
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14.5px] font-semibold text-[var(--accent)] shadow-[0_8px_20px_-8px_rgba(15,23,42,0.45),inset_0_-1px_0_rgba(15,23,42,0.06)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_12px_26px_-10px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)] active:translate-y-0"
              >
                Sell now
                <FiArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-[14.5px] font-semibold text-white backdrop-blur transition-colors duration-200 hover:border-white/50 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)]"
              >
                Explore deals
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. Middle: white panel inset in the brand frame ── */}
        <div className="px-2.5 sm:px-3 lg:px-4">
        <div className="rounded-xl bg-white px-5 pb-6 pt-9 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,10,80,0.45)] sm:px-8 sm:pt-11 md:rounded-2xl lg:px-12 dark:bg-[#17191c]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link to="/" className={`inline-flex items-center gap-2.5 rounded-xl ${FOCUS}`} aria-label="Unideals home">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-white/10">
                  <img src="/logo.svg" alt="" className="h-8 w-8 object-contain" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[18px] font-bold text-slate-900 dark:text-white">Unideals</span>
                  <span className="block text-[12px] font-medium text-slate-500 dark:text-zinc-500">by Imaginum</span>
                </span>
              </Link>
              <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400">
                The campus marketplace for students. Buy, sell and trade with people you can meet.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className={`group mt-5 inline-flex max-w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[var(--accent-soft-strong)] hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:text-white ${FOCUS}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <FiMail className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="truncate">{SUPPORT_EMAIL}</span>
              </a>

              <div className="mt-4 flex gap-2">
                {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className={`grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-[15px] text-slate-600 transition-[transform,color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-soft-strong)] hover:text-[var(--accent)] hover:shadow-[0_6px_14px_-8px_var(--accent-ring)] dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:text-white ${FOCUS}`}
                  >
                    <Icon aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {COLUMNS.map(({ title, links }) => (
              <nav key={title} aria-label={title}>
                <h3 className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">{title}</h3>
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

          {/* Trust chips */}
          <ul className="mt-10 flex flex-wrap items-center gap-2" aria-label="Why Unideals">
            {TRUST.map(({ icon: Icon, text, logo }) => (
              <li
                key={text}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1.5 pl-2 pr-3 text-[12.5px] font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                  <Icon className="h-3 w-3" aria-hidden="true" />
                </span>
                {text}
                {logo && (
                  <img
                    src="/razorpay.svg"
                    alt="Razorpay"
                    loading="lazy"
                    className="ml-0.5 h-4 w-auto border-l border-slate-200 pl-2 dark:rounded dark:border-l-0 dark:bg-white dark:px-1.5 dark:py-0.5"
                  />
                )}
              </li>
            ))}
          </ul>

          {/* Legal bar */}
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/80 pt-5 text-[12.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-zinc-500">
            <p>
              © {year} Unideals. All rights reserved. <span className="hidden sm:inline">Made for students in India.</span>
            </p>
            <div className="flex items-center gap-5">
              <Link to="/termscondition?tab=terms" className={`rounded-sm transition-colors hover:text-slate-900 dark:hover:text-white ${FOCUS}`}>
                Terms
              </Link>
              <Link to="/privacy-policy" className={`rounded-sm transition-colors hover:text-slate-900 dark:hover:text-white ${FOCUS}`}>
                Privacy
              </Link>
              <ShareButton className="footer-share-btn" />
            </div>
          </div>
        </div>
        </div>

        {/* ── 3. Giant wordmark, cropped by the card edge ── */}
        <div className="brand-surface relative h-[clamp(4.2rem,15vw,13.5rem)] overflow-hidden" aria-hidden="true">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <motion.p
            initial={reduceMotion ? false : { y: "35%", opacity: 0.6 }}
            whileInView={{ y: "18%", opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none select-none bg-gradient-to-b from-white via-white/80 to-white/10 bg-clip-text pt-[0.06em] text-center text-[clamp(5rem,19vw,17.5rem)] font-extrabold leading-[0.8] tracking-[-0.04em] text-transparent"
          >
            unideals
          </motion.p>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
