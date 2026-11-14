import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  Headphones,
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  Lightbulb,
  MapPin,
  MessagesSquare,
  Moon,
  Plus,
  Rocket,
  Search,
  Shirt,
  Sparkle,
  Sparkles,
  Sun,
  Tag,
  UserRound,
  Zap,
} from "lucide-react";
import CategoryIcon from "../CategoryIcon.jsx";
import { LOGO_PATHS, LOGO_VIEWBOX } from "../../../../components/ui/BrandLoader.jsx";
import { Badge, Shield } from "./Art3D.jsx";
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

// Real app home content (Unideals_App: constants/product.ts categories,
// HomeHeader tabs, Spotlight tiles, tab bar). Prices/counts are illustrative.
const APP_TABS = [
  [LayoutGrid, "All"],
  [Laptop, "Electronics"],
  [BookOpen, "Study Material"],
  [BedDouble, "Hostel Essentials"],
  [Shirt, "Clothing"],
];
const APP_TILES = [
  ["electronics", "Electronics", 450, 18],
  ["study_material", "Study Material", 40, 32],
  ["hostel_essentials", "Hostel Essentials", 99, 21],
  ["clothing", "Clothing", 149, 12],
  ["accessories", "Accessories", 120, 9],
  ["lab_equipment", "Lab Equipment", 80, 7],
];
const APP_DEALS = [
  ["electronics", "Casio fx-991EX", "650"],
  ["vehicles", "Hero Sprint cycle", "2,400"],
];
const APP_NAV = [
  [Home, "Home", true],
  [Compass, "Explore"],
  [null, "Sell"],
  [MessagesSquare, "Chats"],
  [UserRound, "Profile"],
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
              <h2 className="pb-title">App coming very soon</h2>
              <p className="pb-sub">
                Buy, sell and chat between lectures.
                <br />
                Your campus marketplace, now in your pocket.
              </p>

              {/* Mirrors the real app home (Unideals_App: app/(tabs)/index.tsx,
                  HomeHeader, Spotlight, tab bar) in app px via --a. */}
              <div className="pb-phone" aria-hidden="true">
                <div className="pb-screen pb-screen--app">
                  <div className="pa-head">
                    <div className="pa-row">
                      <span className="pa-logo">
                        <BrandMark />
                      </span>
                      <span className="pa-campus">
                        <span className="pa-campus-line">
                          <MapPin strokeWidth={2.5} />
                          VIT Vellore
                          <ChevronDown strokeWidth={2.5} />
                        </span>
                        <span className="pa-campus-sub">Vellore, Tamil Nadu</span>
                      </span>
                      <span className="pa-icons">
                        <span className="pa-ib">
                          <Moon />
                        </span>
                        <span className="pa-ib">
                          <Bell />
                          <i className="pa-badge">2</i>
                        </span>
                      </span>
                    </div>
                    <div className="pa-search-wrap">
                      <div className="pa-search">
                        <Search className="pa-search-ico" strokeWidth={2.2} />
                        <span className="pa-search-text">
                          Search for <b>“textbooks”</b>
                        </span>
                        <i className="pa-search-div" />
                        <Sparkles className="pa-search-ai" />
                      </div>
                    </div>
                    <div className="pa-tabs">
                      {APP_TABS.map(([Icon, label], i) => (
                        <span key={label} className={`pa-tab${i === 0 ? " is-active" : ""}`}>
                          <Icon strokeWidth={i === 0 ? 2.3 : 1.8} />
                          <span>{label}</span>
                          <i />
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pa-spot">
                    <div className="pa-ribbon-row">
                      <Sparkle className="pa-sparkle" />
                      <span className="pa-ribbon">CAMPUS STEALS</span>
                      <Sparkle className="pa-sparkle" />
                    </div>
                    <p className="pa-spot-sub">Fresh finds from students on VIT Vellore</p>
                    <div className="pa-grid">
                      {APP_TILES.map(([value, label, from, live]) => (
                        <div key={value} className="pa-tile">
                          <b>{label}</b>
                          <span className="pa-from">from ₹{from}</span>
                          <i className="pa-blob" />
                          <CategoryIcon value={value} className="pa-art" />
                          <span className="pa-count">{live} live</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pa-deals">
                    <div className="pa-deals-head">
                      <div>
                        <div className="pa-deals-title">
                          Limited time deals
                          <span className="pa-live">
                            <i />6 live
                          </span>
                        </div>
                        <p className="pa-deals-sub">Boosted listings, ending soon</p>
                      </div>
                      <span className="pa-viewall">
                        View all <ArrowRight />
                      </span>
                    </div>
                    <div className="pa-cards">
                      {APP_DEALS.map(([value, title, price]) => (
                        <div key={title} className="pa-card">
                          <div className="pa-card-img">
                            <CategoryIcon value={value} />
                          </div>
                          <span className="pa-card-title">{title}</span>
                          <span className="pa-card-price">₹{price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pa-tabbar">
                    {APP_NAV.map(([Icon, label, active]) =>
                      Icon ? (
                        <span key={label} className={`pa-slot${active ? " is-active" : ""}`}>
                          <span className="pa-slot-pill">
                            <Icon strokeWidth={active ? 2.3 : 1.9} />
                          </span>
                          <span className="pa-slot-label">{label}</span>
                        </span>
                      ) : (
                        <span key={label} className="pa-slot pa-slot--sell">
                          <span className="pa-sell">
                            <Plus strokeWidth={2.6} />
                          </span>
                        </span>
                      ),
                    )}
                  </div>

                  <div className="pb-island" />
                  <div className="pb-status">
                    <span>9:41</span>
                    <StatusIcons />
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
