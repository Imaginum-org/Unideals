import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Clock3, Rocket, Search, Sparkles, X, Zap } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { getUserProducts } from "../../product/api/productApi.js";
import { ikThumb } from "../../../utils/imageTransform.js";
import { createPaymentOrder, verifyPayment } from "../api/paymentApi.js";
import { useRazorpayCheckout } from "../hooks/useRazorpayCheckout.js";

/*
 * One-time boost add-ons on the pricing page.
 * Two plan cards → "Boost a listing" opens a picker of the user's own active
 * listings → Razorpay Checkout → server verify. Prices and durations mirror
 * backend/src/config/boostAddons.js; the real charge is always computed on
 * the server when the order is created.
 */

const ADDONS = [
  {
    id: "boost_3day",
    name: "3-day boost",
    price: 29,
    hours: 72,
    icon: Zap,
    tagline: "A quick push for the weekend rush.",
    footerTitle: "Perfect for quick sales",
    footerSubtitle: "Starts as soon as payment confirms",
  },
  {
    id: "boost_7day",
    name: "7-day boost",
    price: 49,
    hours: 168,
    icon: Rocket,
    tagline: "A full week in the spotlight on your campus.",
    featured: true,
    footerTitle: "More days, better price",
    footerSubtitle: "About ₹7 a day vs ₹9.7 on 3-day",
  },
];

// Only what boosts actually do (Boosted row on Home + the Deals page; see
// product.service.getBoostedProducts). Feed/search ranking is not boost-based.
const PERKS = (hours) => [
  "Featured in the Boosted row on the home page",
  "Shown on the Deals page while it's live",
  `Stays boosted for ${hours / 24} days (${hours} hours)`,
];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const imageOf = (p) => (typeof p?.images?.[0] === "string" ? p.images[0] : p?.images?.[0]?.url);
const isBoostLive = (p) => Boolean(p?.is_boosted && p?.boost_expires_at && new Date(p.boost_expires_at) > new Date());
const boostEnds = (p) =>
  new Date(p.boost_expires_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/* ── Listing picker dialog ─────────────────────────────────────────────── */

function BoostPicker({ addon, onClose }) {
  const navigate = useNavigate();
  const { userDetails } = useUser();
  const { openCheckout } = useRazorpayCheckout();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [query, setQuery] = useState("");
  const payingRef = useRef(false);
  const closeRef = useRef(null);

  // Escape to close, lock page scroll, focus the close button.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !payingRef.current && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    getUserProducts()
      .then((res) => {
        if (!active) return;
        const rows = (res.data?.data || []).filter((p) => p && !p.is_deleted && p.status === "listed");
        // Boostable first, then ones already boosted (shown disabled).
        rows.sort((a, b) => Number(isBoostLive(a)) - Number(isBoostLive(b)));
        setListings(rows);
        setSelected(rows.find((p) => !isBoostLive(p))?._id || null);
      })
      .catch(() => active && toast.error("Couldn't load your listings"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const visible = query.trim()
    ? listings.filter((p) => String(p.title || "").toLowerCase().includes(query.trim().toLowerCase()))
    : listings;

  const pay = async () => {
    if (!selected || payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    try {
      const orderRes = await createPaymentOrder({ plan: addon.id, productId: selected });
      const { orderId, amount, currency, keyId } = orderRes.data?.data || {};
      if (!orderId) throw new Error("Unable to initiate payment");
      const paymentRes = await openCheckout({
        orderId,
        amount,
        currency,
        keyId,
        planName: addon.name,
        description: `${addon.name} for one listing`,
        prefill: { name: userDetails?.name, email: userDetails?.email, contact: userDetails?.mobile },
      });
      const verifyRes = await verifyPayment({
        razorpay_order_id: paymentRes.razorpay_order_id,
        razorpay_payment_id: paymentRes.razorpay_payment_id,
        razorpay_signature: paymentRes.razorpay_signature,
      });
      if (verifyRes.data?.success === false) throw new Error(verifyRes.data?.message || "Payment could not be verified");
      toast.success(`Boost is live for ${addon.hours / 24} days 🚀`);
      onClose();
      navigate("/productlisted");
    } catch (error) {
      if (error?.message !== "Payment cancelled") {
        toast.error(error?.response?.data?.message || error?.message || "Boost purchase failed. Please try again.");
      }
    } finally {
      payingRef.current = false;
      setPaying(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={() => !payingRef.current && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl dark:bg-[#1A1D20]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200/80 px-5 pb-4 pt-5 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 id="boost-picker-title" className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">
              Choose a listing to boost
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">
              {addon.name} · {inr(addon.price)} one-time · {addon.hours} hours
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={paying}
            aria-label="Close"
            className="-mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-neutral-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <ul className="space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-[68px] animate-pulse rounded-xl bg-neutral-100 dark:bg-white/5" />
              ))}
            </ul>
          ) : listings.length === 0 ? (
            <div className="py-8 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <Rocket className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white">No active listings yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500 dark:text-zinc-400">
                Boosts apply to a live listing. List something first, then come back to boost it.
              </p>
              <Link
                to="/upload"
                onClick={onClose}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                List an item
              </Link>
            </div>
          ) : (
            <>
              {listings.length > 5 && (
                <label className="relative mb-3 block">
                  <span className="sr-only">Search your listings</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your listings"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-neutral-700 dark:bg-transparent dark:text-white"
                  />
                </label>
              )}
              <fieldset>
                <legend className="sr-only">Your active listings</legend>
                <ul className="space-y-2">
                  {visible.map((p) => {
                    const live = isBoostLive(p);
                    const checked = selected === p._id;
                    const img = imageOf(p);
                    return (
                      <li key={p._id}>
                        <label
                          className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                            live
                              ? "cursor-not-allowed border-neutral-200 opacity-60 dark:border-neutral-800"
                              : checked
                                ? "cursor-pointer border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]"
                                : "cursor-pointer border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="boost-listing"
                            value={p._id}
                            checked={checked}
                            disabled={live || paying}
                            onChange={() => setSelected(p._id)}
                            className="sr-only"
                          />
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                            {img && <img src={ikThumb(img, 120)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-white">{p.title || "Untitled listing"}</span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-slate-500 dark:text-zinc-400">
                              {live ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                                  Boosted until {boostEnds(p)}
                                </span>
                              ) : (
                                inr(p.selling_price)
                              )}
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                              checked ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-neutral-300 dark:border-neutral-600"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                  {visible.length === 0 && (
                    <li className="py-6 text-center text-[13px] text-slate-500 dark:text-zinc-400">No listings match “{query}”.</li>
                  )}
                </ul>
              </fieldset>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && listings.length > 0 && (
          <div className="border-t border-neutral-200/80 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={pay}
              disabled={!selected || paying}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[15px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#1A1D20]"
            >
              <ButtonLoader loading={paying} loadingText="Opening checkout">
                Pay {inr(addon.price)} and boost
              </ButtonLoader>
            </button>
            <p className="mt-2.5 text-center text-[12px] text-slate-500 dark:text-zinc-400">
              One-time payment via Razorpay. Your boost starts as soon as payment is confirmed.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── Section ───────────────────────────────────────────────────────────── */

export default function BoostAddons() {
  const navigate = useNavigate();
  const { isLoggedIn } = useUser();
  const [active, setActive] = useState(null);
  const razorpayMissing = !import.meta.env.VITE_RAZORPAY_KEY_ID;
  const close = useCallback(() => setActive(null), []);

  const start = (addon) => {
    if (!isLoggedIn) {
      toast.error("Log in to boost a listing");
      navigate("/login", { state: { from: { pathname: "/price" } } });
      return;
    }
    setActive(addon);
  };

  return (
    <section aria-labelledby="boost-addons-title" className="mx-auto mt-16 max-w-4xl">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12.5px] font-medium text-[var(--accent-text)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          One-time add-ons
        </p>
        <h2 id="boost-addons-title" className="mt-3 font-figtree text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px] dark:text-white">
          Just need one quick boost?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-500 dark:text-zinc-400">
          Put a single listing in front of more students. No subscription, works on every plan.
        </p>
      </div>

      {/* Same card language as the plan cards above (PricingModel.jsx). */}
      <div className="mx-auto mt-12 grid max-w-[700px] justify-items-center gap-6 sm:grid-cols-2 sm:items-stretch">
        {ADDONS.map((a) => (
          <article
            key={a.id}
            className={`relative flex h-full w-full max-w-[330px] flex-col overflow-hidden rounded-[25px] bg-[#F7F8FA] shadow-xl transition-all duration-300 ease-out dark:bg-[#1A1D20] ${
              a.featured ? "sm:h-[calc(100%+0.75rem)] sm:-translate-y-3" : "dark:shadow-none"
            }`}
          >
            {/* Top accent band; the featured card carries a label */}
            {a.featured ? (
              <div className="relative h-12 overflow-hidden rounded-t-[24px] bg-[#3300ff]">
                <div className="absolute left-0 top-0 z-10 flex h-7 w-full items-center justify-center">
                  <span className="text-xs font-semibold leading-none text-white font-figtree">Best value</span>
                </div>
                <div className="absolute bottom-[-1px] left-0 right-0 h-5 rounded-t-[24px] bg-[#F7F8FA] dark:bg-[#1A1D20]" />
              </div>
            ) : (
              <div className="relative h-6 overflow-hidden rounded-t-[24px] bg-[#3300ff]">
                <div className="absolute bottom-[-1px] left-0 right-0 h-4 rounded-t-[24px] bg-[#F7F8FA] dark:bg-[#1A1D20]" />
              </div>
            )}

            <div className={`flex flex-1 flex-col p-5 ${a.featured ? "sm:pt-2" : ""}`}>
              <h3 className="text-lg font-semibold text-[#3300ff] font-figtree">{a.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-[#848484] font-figtree">{a.tagline}</p>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <span className="text-3xl font-extrabold tracking-normal text-slate-950 dark:text-white font-figtree">{inr(a.price)}</span>
                <span className="pb-1 text-xs font-medium text-slate-500 dark:text-[#D7D7D7] font-figtree">one-time</span>
              </div>

              <button
                type="button"
                onClick={() => start(a)}
                disabled={razorpayMissing}
                title={razorpayMissing ? "Payments are not configured" : undefined}
                className="mt-5 h-10 w-full rounded-lg bg-[#3300ff] px-4 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3300ff]/40 focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-800 disabled:shadow-none font-figtree dark:focus-visible:ring-offset-[#1A1D20] dark:disabled:bg-white/15 dark:disabled:text-white"
              >
                Boost a listing
              </button>

              <ul className="mt-5 space-y-2.5">
                {PERKS(a.hours).map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-xs font-medium leading-5 text-slate-600 dark:text-[#D7D7D7] font-figtree">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white" fill="#3300ff" strokeWidth={2.5} aria-hidden="true" />
                    <span className="break-words">{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <div className="rounded-xl bg-[#3300ff]/5 px-4 py-3 text-center dark:bg-white/5">
                  <p className="text-sm font-semibold text-[#3300ff] font-figtree">{a.footerTitle}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400 font-figtree">{a.footerSubtitle}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-center text-[12.5px] text-slate-500 dark:text-zinc-400">
        Boosts end automatically after their duration. A listing leaves Boosted as soon as it’s sold or unlisted.
      </p>

      {active && <BoostPicker addon={active} onClose={close} />}
    </section>
  );
}
