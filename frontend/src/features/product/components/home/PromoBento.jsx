import { useId } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  Headphones,
  Heart,
  Lightbulb,
  MapPin,
  Rocket,
  Search,
  Sun,
  Tag,
  Zap,
} from "lucide-react";
import CategoryIcon from "../CategoryIcon.jsx";
import { LOGO_PATHS, LOGO_VIEWBOX } from "../../../../components/ui/BrandLoader.jsx";
import "./PromoBento.css";

// Feature bento under the "Sell Faster on Unideals" banner. Geometry follows
// the design mock 1:1 in design units (see PromoBento.css).

// Real Unideals mark (same artwork as public/logo.svg and BrandLoader).
const BrandMark = ({ className }) => (
  <svg viewBox={LOGO_VIEWBOX} className={className} aria-hidden="true">
    {LOGO_PATHS.map((item, index) => (
      <path key={index} d={item.d} transform={item.transform} fill={item.fill} />
    ))}
  </svg>
);

const StatusIcons = () => (
  <svg viewBox="0 0 34 10" aria-hidden="true">
    <g fill="#111827">
      <rect x="0" y="6" width="1.8" height="3" rx="0.5" />
      <rect x="2.6" y="4.5" width="1.8" height="4.5" rx="0.5" />
      <rect x="5.2" y="3" width="1.8" height="6" rx="0.5" />
      <rect x="7.8" y="1.5" width="1.8" height="7.5" rx="0.5" />
      <path d="M15.5 3.2a6 6 0 0 1 7.4 0l-.9 1a4.6 4.6 0 0 0-5.6 0zM16.9 4.9a3.6 3.6 0 0 1 4.6 0l-.9 1a2.2 2.2 0 0 0-2.8 0zM19.2 8.4l-1.2-1.3a1.6 1.6 0 0 1 2.4 0z" />
      <rect x="25" y="2" width="7.4" height="6" rx="1.6" fill="none" stroke="#111827" strokeWidth="0.9" />
      <rect x="26.2" y="3.2" width="5" height="3.6" rx="0.8" />
      <rect x="32.8" y="4" width="0.9" height="2" rx="0.4" />
    </g>
  </svg>
);

/* ── 3D-styled scalloped badge (vector, no raster) ── */
const scallopPath = (cx, cy, r, amp, lobes, steps = 240) => {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    // Round bumps with pinched valleys (like a seal/rosette), not a sine.
    const rr = r - amp + 2 * amp * Math.pow(Math.abs(Math.cos((lobes * t) / 2)), 0.85);
    const x = cx + rr * Math.cos(t);
    const y = cy + rr * Math.sin(t);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
};
const BADGE_OUTER = scallopPath(100, 100, 82, 4.6, 14);
const BADGE_RIM = scallopPath(100, 100, 76.5, 4.3, 14);
const BADGE_INNER = scallopPath(100, 100, 60, 3.6, 14);

const BADGE_PALETTES = {
  gold: {
    side: ["#FF6A1A", "#D7350A", "#A82404"],
    face: ["#FFD21F", "#FFAE12", "#FF870A"],
    ring: "#EE6200",
    inner: ["#FFD843", "#FFB21A", "#FF940C"],
  },
  green: {
    side: ["#2BAA4E", "#127A36", "#0A4F24"],
    face: ["#8EE563", "#34B94D", "#118238"],
    ring: "#0A6B2C",
    inner: ["#62D257", "#24A646", "#0E7332"],
  },
};

const Badge = ({ tone, className }) => {
  const id = useId().replace(/:/g, "");
  const p = BADGE_PALETTES[tone];
  const layers = Array.from({ length: 40 }, (_, i) => 40 - i);
  return (
    <svg viewBox="-20 -10 240 230" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0.2" x2="1" y2="0.8">
          <stop offset="0" stopColor={p.side[0]} />
          <stop offset="0.55" stopColor={p.side[1]} />
          <stop offset="1" stopColor={p.side[2]} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={p.face[0]} />
          <stop offset="0.5" stopColor={p.face[1]} />
          <stop offset="1" stopColor={p.face[2]} />
        </linearGradient>
        <linearGradient id={`${id}i`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.inner[0]} />
          <stop offset="0.55" stopColor={p.inner[1]} />
          <stop offset="1" stopColor={p.inner[2]} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0.32" cy="0.25" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Extrusion (left/back side) */}
      {layers.map((k) => (
        <path
          key={k}
          d={BADGE_OUTER}
          fill={`url(#${id}s)`}
          transform={`translate(${-k * 0.8} ${k * 0.18})`}
        />
      ))}
      {/* Lit edge of the extrusion */}
      <path d={BADGE_OUTER} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.4" transform="translate(-30 6.8)" />
      {/* Face + bevelled rim */}
      <path d={BADGE_OUTER} fill={`url(#${id}f)`} />
      <path d={BADGE_RIM} fill="none" stroke={p.ring} strokeOpacity="0.85" strokeWidth="3.6" />
      <path d={BADGE_RIM} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" transform="translate(-1.6 -1.6)" />
      <path d={BADGE_OUTER} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" transform="translate(100 100) scale(0.975) translate(-99 -99)" />
      {/* Raised inner medallion: drop side, face, highlight */}
      <path d={BADGE_INNER} fill={p.ring} transform="translate(-7 3)" />
      <path d={BADGE_INNER} fill={p.ring} opacity="0.7" transform="translate(-3.5 1.5)" />
      <path d={BADGE_INNER} fill={`url(#${id}i)`} />
      <path d={BADGE_INNER} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.8" transform="translate(-0.9 -0.9)" />
      <path d={BADGE_OUTER} fill={`url(#${id}g)`} />
    </svg>
  );
};

/* ── 3D-styled glass shield with check (vector, no raster) ── */
const SHIELD =
  "M100 12C122 26 150 32 172 34V98C172 152 142 188 100 212C58 188 28 152 28 98V34C50 32 78 26 100 12Z";

const Shield = ({ className }) => {
  const id = useId().replace(/:/g, "");
  const layers = Array.from({ length: 30 }, (_, i) => 30 - i);
  return (
    <svg viewBox="-12 0 212 222" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6577FF" />
          <stop offset="0.5" stopColor="#3D4FF2" />
          <stop offset="1" stopColor="#2537D9" />
        </linearGradient>
        <linearGradient id={`${id}face`} x1="0" y1="0.1" x2="1" y2="0.4">
          <stop offset="0" stopColor="#4C66FF" />
          <stop offset="0.42" stopColor="#4A95FF" />
          <stop offset="0.76" stopColor="#4FCBF2" />
          <stop offset="1" stopColor="#6DEDB8" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C6FF" />
          <stop offset="0.5" stopColor="#9DEBFF" />
          <stop offset="1" stopColor="#8AF5C8" />
        </linearGradient>
        <linearGradient id={`${id}inner`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FA2FF" />
          <stop offset="0.5" stopColor="#3D6CFF" />
          <stop offset="1" stopColor="#3FA8F0" />
        </linearGradient>
        <linearGradient id={`${id}check`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2F8FF" />
          <stop offset="1" stopColor="#9EC3FF" />
        </linearGradient>
        <radialGradient id={`${id}gloss`} cx="0.3" cy="0.18" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* Soft cyan glow */}
      <path d={SHIELD} fill="#58D8FF" opacity="0.35" filter={`url(#${id}blur)`} />
      {/* Extrusion */}
      {layers.map((k) => (
        <path key={k} d={SHIELD} fill={`url(#${id}side)`} transform={`translate(${-k * 0.9} ${k * 0.16})`} />
      ))}
      {/* Specular glare along the extruded edge */}
      <path d="M3 44V100C3 150 30 186 72 210" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M-4 52V104C-4 146 16 176 46 198" fill="none" stroke="#C9D3FF" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
      {/* Face + rim */}
      <path d={SHIELD} fill={`url(#${id}face)`} />
      <path d={SHIELD} fill="none" stroke={`url(#${id}rim)`} strokeWidth="4" opacity="0.95" />
      {/* Inner glass panel */}
      <path d={SHIELD} transform="translate(20 22) scale(0.8)" fill={`url(#${id}inner)`} opacity="0.95" />
      <path d={SHIELD} transform="translate(20 22) scale(0.8)" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.8" />
      {/* Check mark (extruded) */}
      <path d="M70 114L92 136L134 90" fill="none" stroke="#2A4FE0" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" transform="translate(-6 5.5)" />
      <path d="M70 114L92 136L134 90" fill="none" stroke="#3E6CF2" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" transform="translate(-3 2.8)" />
      <path d="M70 114L92 136L134 90" fill="none" stroke={`url(#${id}check)`} strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 114L92 136L134 90" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1.6 -4.2)" />
      <path d={SHIELD} fill={`url(#${id}gloss)`} />
    </svg>
  );
};

const PHONE_CATEGORIES = [
  ["electronics", "Electronics"],
  ["study_material", "Study Material"],
  ["hostel_essentials", "Hostel Basics"],
  ["clothing", "Clothing"],
  ["lab_equipment", "Lab Equipment"],
];

const STEPS = [
  { n: 1, text: "Enter basic details", y: 68.7 },
  { n: 2, text: "Upload photo", y: 109 },
  { n: 3, text: <>Set price and pickup<br />details</>, y: 150.7 },
];

// Only what Pro / Pro+ actually add over Free — mirrors the comparison table
// on the pricing page (features/product/pages/PricingModel.jsx), same icons.
// Shared-by-all rows (buy & sell, unlimited chats) are intentionally omitted.
const PRO_FEATURES = [
  [Rocket, "Monthly Boosts"],
  [Tag, "More Listings"],
  [Search, "Search Priority"],
  [Zap, "Chat Priority"],
  [Heart, "Bigger Wishlist"],
  [Headphones, "Priority Support"],
];

export default function PromoBento() {
  return (
    <section className="pb-section" aria-label="Why Unideals">
      <div className="pb-rows">
        <div className="pb-row pb-row--top">
          {/* ── App launching soon ── */}
          <article className="pb-card pb-a pb-grain">
            <div className="pb-inner">
              <h2 className="pb-title">App Launching soon</h2>
              <p className="pb-sub">
                A smoother way to buy and sell is on the way.
                <br />
                Get updates about our upcoming mobile app.
              </p>

              <div className="pb-phone" aria-hidden="true">
                <div className="pb-screen">
                  <div className="pb-island" />
                  <div className="pb-status">
                    <span>9:41</span>
                    <StatusIcons />
                  </div>
                  <div className="pb-apphead">
                    <div className="pb-apphead-brand">
                      <BrandMark />
                      Unideals
                    </div>
                    <div className="pb-apphead-actions">
                      <span className="pb-iconbtn">
                        <Search />
                      </span>
                      <span className="pb-iconbtn pb-iconbtn--plain">
                        <Bell />
                        <i className="pb-dot" />
                      </span>
                      <img className="pb-avatar" src="/userdp.webp" alt="" loading="lazy" />
                    </div>
                  </div>

                  <div className="pb-hero">
                    <img className="pb-hero-bag" src="/bag_banner.webp" alt="" loading="lazy" />
                    <p className="pb-hero-title">
                      Unlock Deals, Share
                      <br />
                      Essentials, Simplify
                      <br />
                      Campus Living!
                    </p>
                    <p className="pb-hero-copy">
                      Your trusted platform to simplify
                      <br />
                      student life. Buy, sell, and
                      <br />
                      connect easily!
                    </p>
                    <span className="pb-hero-btn">
                      Sell Now <ArrowRight />
                    </span>
                    <div className="pb-hero-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className="pb-cats-head">
                    <b>Shop by Category</b>
                    <span>
                      View all <ArrowRight />
                    </span>
                  </div>
                  <div className="pb-cats">
                    {PHONE_CATEGORIES.map(([value, label]) => (
                      <div key={value} className="pb-cat">
                        <CategoryIcon value={value} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ── Selling journey ── */}
          <article className="pb-card pb-b pb-blue pb-grain">
            <div className="pb-inner">
              <h2 className="pb-title">Your selling journey starts here</h2>
              <p className="pb-sub">List what you don&apos;t use anymore and score the best deal for it</p>
              <Link to="/upload" className="pb-cta">
                Sell Now <ArrowRight />
              </Link>

              <div className="pb-steps">
                <h3 className="pb-steps-title">A simple 3-step process</h3>
                <p className="pb-steps-sub">List in 2 mins</p>
                {STEPS.map((step) => (
                  <div
                    key={step.n}
                    className="pb-step"
                    style={{ top: `calc(${step.y} * var(--u))` }}
                  >
                    <span className="pb-step-num">{step.n}</span>
                    <span className="pb-step-text">{step.text}</span>
                  </div>
                ))}
              </div>

              <div className="pb-shot" aria-hidden="true">
                <div className="pb-shot-head">
                  <BrandMark className="pb-shot-logo" />
                  <span className="pb-shot-brand">Unideals</span>
                  <span className="pb-shot-campus">
                    <MapPin />
                    VIT Vellore
                    <ChevronDown />
                  </span>
                  <span className="pb-shot-search">
                    Search for Product
                    <Search />
                  </span>
                  <span className="pb-shot-divider" />
                  <Sun className="pb-shot-ico pb-shot-sun" />
                  <Bell className="pb-shot-ico pb-shot-bell" />
                  <span className="pb-shot-belldot" />
                  <span className="pb-shot-cut" />
                </div>

                <span className="pb-shot-back">
                  <ArrowLeft /> Back
                </span>
                <p className="pb-shot-h">Sell Your Product</p>
                <p className="pb-shot-p">Provide the basic details to help buyers find your product</p>
                <div className="pb-shot-bars">
                  <i />
                  <i />
                  <i />
                  <b className="is-active">BASIC INFO</b>
                  <b>IMAGES</b>
                  <b>PRICING</b>
                </div>
                <div className="pb-shot-form">
                  <span className="pb-shot-label">Product Title</span>
                  <span className="pb-shot-input">e.g., Computer Science Final Year Project</span>
                </div>
                <div className="pb-shot-tip">
                  <div className="pb-shot-tip-tag">
                    <Lightbulb /> PRO TIP
                  </div>
                  <div className="pb-shot-tip-h">
                    Product
                    <br />
                    descriptions
                  </div>
                  <div className="pb-shot-tip-pct">40% more</div>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="pb-row pb-row--bottom">
          {/* ── Pro & Pro+ ── */}
          <article className="pb-card pb-c pb-blue pb-grain">
            <div className="pb-inner">
              <h2 className="pb-title">Unlock the Full Potential of Unideals with Pro &amp; Pro+</h2>
              <p className="pb-sub">
                Get free monthly boosts, keep more listings live, rank higher in search and chats, save
                more to your wishlist, and get priority support plus early access to new features.
              </p>
              <Link to="/price" className="pb-cta">
                Explore plans <ArrowRight />
              </Link>

              <ul className="pb-chips">
                {PRO_FEATURES.map(([Icon, label]) => (
                  <li key={label} className="pb-chip">
                    <Icon />
                    {label}
                  </li>
                ))}
              </ul>

              <div className="pb-badges" aria-hidden="true">
                <Badge tone="gold" className="pb-badge pb-badge--gold" />
                <Badge tone="green" className="pb-badge pb-badge--green" />
              </div>
            </div>
          </article>

          {/* ── Trusted community ── */}
          <article className="pb-card pb-d pb-grain">
            <div className="pb-inner">
              <h2 className="pb-title">Trusted Campus Community</h2>
              <p className="pb-sub">
                Verified students only, and every listing gets a spam check. Zero sus sellers in your feed.
              </p>
              <Shield className="pb-shield" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
