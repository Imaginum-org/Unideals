import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarDays, Check, MapPin, Pencil, Plus } from "lucide-react";
import MobileAccountMenu from "../components/MobileAccountMenu.jsx";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import AchievementTracker from "../components/overview/AchievementTracker.jsx";
import { StarRow } from "../components/RateSellerDialog.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useWishlist } from "../../../context/WishlistContext";
import { getUserProducts } from "../../product/api/productApi.js";
import { fetchMyBadges } from "../api/badgeApi.js";
import { fetchMyInsights, fetchMyRatings } from "../api/reviewApi.js";
import { productPath } from "../../../utils/productPath.js";
import { useChatUnread } from "../../../services/chatUnread.js";
import { AccountLayout, CARD, FLUSH_ON_PHONE, btnPrimary, btnSecondary } from "../components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

const PLAN_LABEL = { pro: "Pro", pro_plus: "Pro+" };
const inr = (n) => (n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`);
const coverOf = (item) => (typeof item?.images?.[0] === "string" ? item.images[0] : item?.images?.[0]?.url) || "/logo.svg";
const STATUS = {
  listed: ["Active", "bg-emerald-500/90 text-white"],
  active: ["Active", "bg-emerald-500/90 text-white"],
  draft: ["Draft", "bg-amber-500/90 text-white"],
  unlisted: ["Unlisted", "bg-slate-700/85 text-white"],
  sold: ["Sold", "bg-slate-900/85 text-white"],
};

function SectionHead({ title, meta, to, linkLabel = "View all" }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
        {title}
        {meta != null && <span className="ml-2 text-[13px] font-normal text-slate-400 dark:text-zinc-500">{meta}</span>}
      </h2>
      {to && (
        <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// Small earnings summary: total, this month, and a six-month spark of bars.
function EarningsCard({ insights, loading }) {
  const e = insights?.earnings;
  const months = e?.months || [];
  const max = Math.max(1, ...months.map((m) => m.total));
  return (
    <section className={cn(CARD, "px-5 py-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Earnings</p>
        <p className="text-[11.5px] text-slate-400 dark:text-zinc-500">Last 6 months</p>
      </div>
      <div className="mt-1 flex items-end justify-between gap-4">
        <div>
          <p className="text-[20px] font-semibold leading-tight tabular-nums text-slate-900 dark:text-white">{loading ? "—" : inr(e?.total || 0)}</p>
          <p className="text-[12px] text-slate-500 dark:text-zinc-400">
            {e?.thisMonth ? `${inr(e.thisMonth)} this month` : e?.count ? `${e.count} sale${e.count === 1 ? "" : "s"}` : "No sales yet"}
          </p>
        </div>
        <div className="flex h-9 items-end gap-1" aria-hidden="true">
          {months.map((m, i) => (
            <span
              key={m.month}
              className="w-2.5 rounded-sm"
              style={{
                height: `${m.total ? Math.max(15, Math.round((m.total / max) * 100)) : 8}%`,
                background: m.total
                  ? i === months.length - 1
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--accent) 45%, transparent)"
                  : "color-mix(in srgb, var(--accent) 12%, transparent)",
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-slate-400 dark:text-zinc-500">Paid to you at pickup. No commission.</p>
    </section>
  );
}

function ProfileOverview() {
  const { userDetails, fetchUserProfile, isLoggedIn } = useUser();
  const { wishlist } = useWishlist();
  const chatUnread = useChatUnread(isLoggedIn);
  const [userProducts, setUserProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [gamification, setGamification] = useState(null);
  const [gLoading, setGLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [numbersLoading, setNumbersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile();
    getUserProducts()
      .then((res) => !cancelled && res.data.success && setUserProducts(res.data.data || []))
      .catch(() => {})
      .finally(() => !cancelled && setProductsLoading(false));
    fetchMyBadges()
      .then((res) => !cancelled && res.data.success && setGamification(res.data.data))
      .catch(() => {})
      .finally(() => !cancelled && setGLoading(false));
    Promise.allSettled([fetchMyInsights(), fetchMyRatings()]).then(([i, r]) => {
      if (cancelled) return;
      if (i.status === "fulfilled") setInsights(i.value.data?.data || null);
      if (r.status === "fulfilled") setRatings(r.value.data?.data || null);
      setNumbersLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listing = useMemo(() => {
    const st = (p) => (p.status || "").toLowerCase();
    return {
      active: userProducts.filter((p) => ["listed", "active"].includes(st(p))).length,
      drafts: userProducts.filter((p) => st(p) === "draft").length,
      views: userProducts.reduce((t, p) => t + Number(p.views_count || 0), 0),
      saved: (wishlist || []).filter((w) => w && typeof w === "object").length,
    };
  }, [userProducts, wishlist]);

  const memberSince = userDetails?.createdAt
    ? new Date(userDetails.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "";
  const campusName =
    (userDetails?.campus_id && typeof userDetails.campus_id === "object" ? userDetails.campus_id.name : null) ||
    userDetails?.college ||
    userDetails?.campus ||
    null;
  const plan = PLAN_LABEL[userDetails?.subscription];
  const savedItems = useMemo(() => (wishlist ?? []).filter((w) => w && typeof w === "object").slice(0, 4), [wishlist]);
  const recent = userProducts.slice(0, 6);

  // Getting started: only real, checkable steps; hidden once all are done.
  const hasAvatar = Boolean(userDetails?.avatar?.url) && !/avatar-default/.test(userDetails?.avatar?.url || "");
  const checklist = [
    { done: Boolean(userDetails?.is_email_verified), label: "Verify your email", to: "/settings" },
    { done: Boolean(campusName), label: "Set your campus", to: "/settings" },
    { done: hasAvatar, label: "Add a profile photo", to: "/settings" },
    { done: userProducts.length > 0, label: "List your first item", to: "/upload" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const showChecklist = !productsLoading && userDetails && doneCount < checklist.length;

  // Things waiting on you, most urgent first. Hidden when empty.
  const yourTurn = insights?.deals?.yourTurn || 0;
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const todo = [
    yourTurn > 0 && {
      key: "deals",
      tone: "bg-amber-500",
      title: `${count(yourTurn, "deal needs", "deals need")} your next step`,
      hint: "Set a pickup or confirm payment",
      to: "/myorders",
      cta: "Open orders",
    },
    chatUnread > 0 && {
      key: "chats",
      tone: "bg-[var(--accent)]",
      title: `${count(chatUnread > 99 ? "99+" : chatUnread, "unread chat", "unread chats")}`,
      hint: "Buyers reply faster when you do",
      to: "/chat",
      cta: "Reply",
    },
    listing.drafts > 0 && {
      key: "drafts",
      tone: "bg-slate-400",
      title: `${count(listing.drafts, "draft", "drafts")} not live yet`,
      hint: "Finish listing to start getting views",
      to: "/productlisted",
      cta: "Finish",
    },
  ].filter(Boolean);

  const ratingCount = ratings?.count || 0;
  const statCells = [
    {
      label: "Active listings",
      value: productsLoading ? "—" : listing.active,
      sub: listing.drafts ? `${listing.drafts} draft${listing.drafts === 1 ? "" : "s"} waiting` : "Live on your campus",
      to: "/productlisted",
    },
    {
      label: "Items sold",
      value: numbersLoading ? "—" : insights?.earnings?.count || 0,
      sub: insights?.deals?.selling ? `${insights.deals.selling} more in progress` : "Completed deals",
      to: "/myorders",
    },
    {
      label: "Listing views",
      value: productsLoading ? "—" : listing.views.toLocaleString("en-IN"),
      sub: "Unique views, all listings",
      to: "/productlisted",
    },
    {
      label: "Saved items",
      value: listing.saved,
      sub: "In your wishlist",
      to: "/wishlist",
    },
  ];

  return (
    <AccountLayout seoTitle="Profile | Unideals" width="xl" bare root>
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* ── Profile header ── */}
        <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden max-sm:-mt-4")}>
          <div className="brand-surface h-28 overflow-hidden sm:h-36" aria-hidden="true">
            <p className="pointer-events-none absolute -bottom-[0.18em] right-3 select-none bg-gradient-to-b from-white/35 to-white/5 bg-clip-text text-[clamp(3.6rem,12vw,7.5rem)] font-extrabold leading-none tracking-[-0.04em] text-transparent sm:right-6">
              unideals
            </p>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-5">
            <div className="flex min-w-0 items-end gap-4">
              <div className="-mt-10 shrink-0 rounded-2xl bg-white p-1 shadow-md sm:-mt-12 dark:bg-[#1A1D20]">
                <AvatarComponent
                  name={userDetails?.name || "User"}
                  imageUrl={userDetails?.avatar?.url}
                  plan={userDetails?.subscription}
                  role={userDetails?.role}
                  isOwn
                  size="xlarge"
                  showBadge
                  shape="square"
                  className="rounded-2xl"
                />
              </div>
              <div className="min-w-0 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[20px] font-semibold tracking-tight text-slate-900 sm:text-[24px] dark:text-white">{userDetails?.name || "User"}</h1>
                  {userDetails?.is_email_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                  {plan && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11.5px] font-bold text-white dark:bg-white dark:text-slate-900">{plan}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {campusName || (
                      <Link to="/settings" className="font-semibold text-[var(--accent-text)] hover:underline">
                        Set your campus
                      </Link>
                    )}
                  </span>
                  {memberSince && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Member since {memberSince}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/settings" className={cn(btnSecondary, "flex-1 sm:flex-none")}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit profile
              </Link>
              <Link to="/upload" className={cn(btnPrimary, "flex-1 sm:flex-none")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                List an item
              </Link>
            </div>
          </div>

          {/* Buyer rating */}
          <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 sm:px-6 dark:border-neutral-800">
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[26px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
                {numbersLoading ? "—" : ratingCount ? Number(ratings.avg).toFixed(1) : "–"}
              </span>
              <div>
                <StarRow value={ratingCount ? ratings.avg : 0} size="h-4 w-4" />
                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-zinc-400">
                  {ratingCount ? `Buyer rating · ${ratingCount} review${ratingCount === 1 ? "" : "s"}` : "Buyer rating"}
                </p>
              </div>
            </div>
            {ratingCount && ratings?.recent?.[0]?.comment ? (
              <figure className="min-w-0 flex-1 border-slate-200 sm:border-l sm:pl-6 dark:border-neutral-700">
                <blockquote className="truncate text-[13px] text-slate-700 dark:text-zinc-200">“{ratings.recent[0].comment}”</blockquote>
                <figcaption className="truncate text-[11.5px] text-slate-400 dark:text-zinc-500">
                  {ratings.recent[0].buyer?.name || "A buyer"}
                  {ratings.recent[0].product_title ? ` · ${ratings.recent[0].product_title}` : ""}
                </figcaption>
              </figure>
            ) : (
              <p className="min-w-0 flex-1 text-[12.5px] text-slate-500 sm:border-l sm:border-slate-200 sm:pl-6 dark:text-zinc-400 dark:sm:border-neutral-700">
                {ratingCount ? "Keep deals smooth to keep your rating high." : "Buyers rate you after a completed deal. Good ratings help you sell faster."}
              </p>
            )}
          </div>
        </section>

        {/* ── Needs your attention: one small card per pending action ── */}
        {todo.length > 0 && (
          <section aria-label="Needs your attention" className={cn("grid gap-3", todo.length === 1 ? "" : todo.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            {todo.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className={cn(CARD, "group flex items-center gap-3 px-4 py-3.5 transition-all hover:-translate-y-px hover:border-[var(--accent-ring)] hover:shadow-[0_6px_18px_-10px_rgba(15,23,42,0.25)]")}
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", t.tone)} />
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", t.tone)} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{t.title}</span>
                  <span className="block truncate text-[12px] text-slate-500 dark:text-zinc-400">{t.hint}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)]">
                  {t.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* ── Getting started ── */}
        {showChecklist && (
          <section className={cn(CARD, FLUSH_ON_PHONE, "px-4 py-4 sm:px-6")}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Finish setting up</h2>
              <span className="text-[12.5px] tabular-nums text-slate-500 dark:text-zinc-400">
                {doneCount} of {checklist.length}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
              {checklist.map((c) => (
                <span key={c.label} className={cn("h-1 rounded-full", c.done ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-white/10")} />
              ))}
            </div>
            <ol className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-4">
              {checklist.map((c, i) => (
                <li key={c.label}>
                  {c.done ? (
                    <span className="flex items-center gap-2 py-1 text-[13px] text-slate-400 dark:text-zinc-500">
                      <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                      <span className="line-through">{c.label}</span>
                    </span>
                  ) : (
                    <Link to={c.to} className="flex items-center gap-2 py-1 text-[13px] font-semibold text-slate-800 hover:text-[var(--accent-text)] dark:text-zinc-100">
                      <span className="w-3.5 text-center text-[12px] tabular-nums text-slate-400">{i + 1}</span>
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Key numbers ── */}
        <section className={cn(CARD, FLUSH_ON_PHONE, "grid grid-cols-2 overflow-hidden lg:grid-cols-4")}>
          {statCells.map((s, i) => (
            <Link
              key={s.label}
              to={s.to}
              className={cn(
                "group relative px-4 py-4 transition-colors hover:bg-neutral-50/70 sm:px-5 dark:hover:bg-white/[0.02]",
                i % 2 === 1 && "border-l border-neutral-100 dark:border-neutral-800",
                i >= 2 && "border-t border-neutral-100 lg:border-l lg:border-t-0 dark:border-neutral-800",
              )}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-[var(--accent)] transition-transform group-hover:scale-x-100" aria-hidden="true" />
              <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">{s.label}</p>
              <p className="mt-1 truncate text-[24px] font-semibold leading-none tracking-tight tabular-nums text-slate-900 sm:text-[26px] dark:text-white">{s.value}</p>
              <p className="mt-1.5 truncate text-[12px] text-slate-400 dark:text-zinc-500">{s.sub}</p>
            </Link>
          ))}
        </section>

        {/* Phones: every account destination + log out (sidebar is md+ only) */}
        <div className="md:hidden">
          <MobileAccountMenu />
        </div>

        {/* ── Achievements ── */}
        <AchievementTracker data={gamification} loading={gLoading} />

        {/* ── Listings + saved ── */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <SectionHead title="Recent listings" meta={userProducts.length || null} to="/productlisted" />
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="browse-shimmer aspect-[4/5] rounded-2xl bg-neutral-100 dark:bg-white/5" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className={cn(CARD, "flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
                <div>
                  <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Nothing listed yet</p>
                  <p className="text-[13px] text-slate-500 dark:text-zinc-400">Books, gadgets, cycles: list in two minutes and earn the Freshers&apos; Drop badge.</p>
                </div>
                <Link to="/upload" className={btnPrimary}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> List an item
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recent.map((item) => {
                  const st = (item.status || "listed").toLowerCase();
                  const [label, cls] = STATUS[st] || STATUS.listed;
                  return (
                    <li key={item._id}>
                      <Link to={st === "draft" ? `/upload/${item._id}` : productPath(item)} className={cn(CARD, "group block overflow-hidden transition-shadow hover:shadow-md")}>
                        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-white/5">
                          <img src={coverOf(item)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          <span className={cn("absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold backdrop-blur", cls)}>{label}</span>
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{item.title || "Untitled listing"}</p>
                          <p className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-slate-500 dark:text-zinc-400">
                            <span className="font-semibold text-slate-900 dark:text-white">{inr(item.selling_price)}</span>
                            <span className="tabular-nums">{Number(item.views_count || 0).toLocaleString("en-IN")} views</span>
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-4 self-start sm:gap-5">
          <EarningsCard insights={insights} loading={numbersLoading} />
          <section className={cn(CARD, "px-5 py-4")}>
            <SectionHead title="Saved" meta={listing.saved || null} to="/wishlist" />
            {savedItems.length === 0 ? (
              <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                Nothing saved yet.{" "}
                <Link to="/explore" className="font-semibold text-[var(--accent-text)] hover:underline">
                  Explore listings
                </Link>
              </p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {savedItems.map((item) => (
                  <li key={item._id}>
                    <Link to={productPath(item)} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]">
                      <img src={coverOf(item)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100 object-cover dark:bg-white/5" />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800 group-hover:text-[var(--accent-text)] dark:text-zinc-100">{item.title || "Untitled"}</p>
                      <p className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">{inr(item.selling_price)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

export default ProfileOverview;
