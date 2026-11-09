import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  Heart,
  MapPin,
  MessageSquareText,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
} from "lucide-react";
import MobileAccountMenu from "../components/MobileAccountMenu.jsx";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useWishlist } from "../../../context/WishlistContext";
import { getUserProducts } from "../../product/api/productApi.js";
import BadgeMiniStrip from "../components/BadgeMiniStrip.jsx";
import { fetchMyBadges } from "../api/badgeApi.js";
import { productPath } from "../../../utils/productPath.js";
import { useChatUnread } from "../../../services/chatUnread.js";
import {
  AccountLayout,
  CARD,
  FLUSH_ON_PHONE,
  Panel,
  StatTile,
  btnPrimary,
  btnSecondary,
} from "../components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

const PLAN_LABEL = { pro: "Pro", pro_plus: "Pro+" };
const inr = (n) => (n == null || n === "" ? "" : `₹${Number(n).toLocaleString("en-IN")}`);
const coverOf = (item) => (typeof item?.images?.[0] === "string" ? item.images[0] : item?.images?.[0]?.url) || "/logo.svg";
const STATUS = {
  listed: ["Active", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"],
  active: ["Active", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"],
  draft: ["Draft", "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"],
  unlisted: ["Unlisted", "bg-neutral-100 text-slate-600 dark:bg-white/5 dark:text-zinc-300"],
  sold: ["Sold", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"],
};

function ProfileOverview() {
  const { userDetails, fetchUserProfile, isLoggedIn } = useUser();
  const { wishlist } = useWishlist();
  const chatUnread = useChatUnread(isLoggedIn);
  const [userProducts, setUserProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [gamification, setGamification] = useState(null);
  const [gamificationLoading, setGamificationLoading] = useState(true);

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
      .finally(() => !cancelled && setGamificationLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const st = (p) => (p.status || "").toLowerCase();
    return {
      active: userProducts.filter((p) => ["listed", "active"].includes(st(p))).length,
      sold: userProducts.filter((p) => ["sold", "delivered", "completed"].includes(st(p))).length,
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
  const savedItems = useMemo(() => (wishlist ?? []).filter((w) => w && typeof w === "object").slice(0, 3), [wishlist]);
  const recent = userProducts.slice(0, 3);

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

  return (
    <AccountLayout seoTitle="Profile | Unideals" width="xl" bare root>
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* Hero */}
        <section className={cn(CARD, FLUSH_ON_PHONE, "max-sm:-mt-4 overflow-hidden")}>
          <div className="h-20 bg-gradient-to-r from-[var(--accent-soft-strong)] via-[var(--accent-soft)] to-transparent sm:h-24" aria-hidden="true" />
          <div className="-mt-10 flex flex-col gap-4 px-4 pb-5 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex items-end gap-4">
              <div className="rounded-2xl bg-white p-1 shadow-sm dark:bg-[#1A1D20]">
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
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[20px] font-semibold tracking-tight text-slate-900 sm:text-[24px] dark:text-white">
                    {userDetails?.name || "User"}
                  </h1>
                  {userDetails?.is_email_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Verified
                    </span>
                  )}
                  {plan && (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--accent-text)]">{plan}</span>
                  )}
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
        </section>

        {/* Getting started */}
        {showChecklist && (
          <Panel
            title="Finish setting up"
            description={`${doneCount}/${checklist.length} done`}
            actions={
              <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-neutral-100 sm:block dark:bg-white/5" aria-hidden="true">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
              </div>
            }
            padded={false}
          >
            <ul className="grid divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-y-0 dark:divide-neutral-800">
              {checklist.map((c) => (
                <li key={c.label}>
                  <Link
                    to={c.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 sm:px-5 dark:hover:bg-white/[0.02]",
                      c.done && "pointer-events-none",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                        c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 dark:border-neutral-600",
                      )}
                    >
                      {c.done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <span className={cn("flex-1 text-[13.5px]", c.done ? "text-slate-400 line-through dark:text-zinc-500" : "font-medium text-slate-800 dark:text-zinc-100")}>
                      {c.label}
                    </span>
                    {!c.done && <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Stats: real counts only */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Package} label="Active listings" value={stats.active} />
          <StatTile icon={ShoppingBag} label="Items sold" value={stats.sold} tone="emerald" />
          <StatTile icon={Eye} label="Listing views" value={stats.views.toLocaleString("en-IN")} tone="slate" />
          <StatTile icon={Heart} label="Saved items" value={stats.saved} tone="pink" />
        </div>

        {/* Phones: every account destination + log out (sidebar is md+ only) */}
        <div className="md:hidden">
          <MobileAccountMenu />
        </div>

        <BadgeMiniStrip gamification={gamification} loading={gamificationLoading} />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel
            title="Recent listings"
            actions={
              <Link to="/productlisted" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
            padded={false}
          >
            {productsLoading ? (
              <div className="space-y-3 p-4 sm:p-5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="browse-shimmer h-14 rounded-xl bg-neutral-100 dark:bg-white/5" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[14px] font-medium text-slate-700 dark:text-zinc-200">No listings yet</p>

                <Link to="/upload" className={cn(btnPrimary, "mt-4")}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  List an item
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recent.map((item) => {
                  const st = (item.status || "listed").toLowerCase();
                  const [label, cls] = STATUS[st] || STATUS.listed;
                  return (
                    <li key={item._id}>
                      <Link
                        to={st === "draft" ? `/upload/${item._id}` : productPath(item)}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 sm:px-5 dark:hover:bg-white/[0.02]"
                      >
                        <img src={coverOf(item)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg bg-neutral-100 object-cover dark:bg-white/5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-slate-900 dark:text-white">{item.title || "Untitled listing"}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-500 dark:text-zinc-400">
                            <span className={cn("rounded px-1.5 py-px text-[11px] font-semibold", cls)}>{label}</span>
                            {Number(item.views_count || 0).toLocaleString("en-IN")} views
                          </p>
                        </div>
                        <p className="shrink-0 text-[14px] font-semibold tabular-nums text-slate-900 dark:text-white">{inr(item.selling_price)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <div className="flex flex-col gap-4 sm:gap-5">
            <Link
              to="/chat"
              className={cn(CARD, FLUSH_ON_PHONE, "flex items-center gap-3 p-4 transition-colors hover:border-[var(--accent-ring)] sm:p-5")}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                <MessageSquareText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Messages</p>
                <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">
                  {chatUnread > 0 ? `${chatUnread} unread conversation${chatUnread === 1 ? "" : "s"}` : "You're all caught up"}
                </p>
              </div>
              {chatUnread > 0 && (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[12px] font-bold text-white">{chatUnread > 99 ? "99+" : chatUnread}</span>
              )}
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </Link>

            <Panel
              title="Saved items"
              actions={
                <Link to="/wishlist" className="text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
                  View all
                </Link>
              }
              padded={false}
            >
              {savedItems.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-slate-500 dark:text-zinc-400">
                  Nothing saved yet.{" "}
                  <Link to="/explore" className="font-semibold text-[var(--accent-text)] hover:underline">
                    Explore listings
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {savedItems.map((item) => (
                    <li key={item._id}>
                      <Link
                        to={productPath(item)}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 sm:px-5 dark:hover:bg-white/[0.02]"
                      >
                        <img src={coverOf(item)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100 object-cover dark:bg-white/5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-slate-900 group-hover:text-[var(--accent-text)] dark:text-white">
                            {item.title || "Untitled"}
                          </p>
                          <p className="text-[12.5px] font-semibold text-slate-600 dark:text-zinc-300">{inr(item.selling_price)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

export default ProfileOverview;
