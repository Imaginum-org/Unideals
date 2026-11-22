import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock3, Heart, Package, Rocket, Sparkles, X } from "lucide-react";
import { useUser } from "../../context/useUserContext.jsx";
import { subscribePlanLimit } from "../../services/planLimit.js";
import { PLAN_CAPS, PLAN_NAMES, PLAN_ORDER, capLabel, nextBoostReset, nextTier, normalizeTier } from "../../utils/planLimits.js";
import { cn } from "../../utils/cn.js";

/*
 * One dialog for every plan limit (listings, wishlist, boosts), opened by
 * services/planLimit.js whenever the API answers with a limit code.
 * Explains what was hit, shows usage against the cap, compares the three
 * plans on that one thing, and offers the useful next step: upgrade, free
 * up room, or buy a one-time boost. Bottom sheet on phones, card from sm.
 */

const fmtDay = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function contentFor(code, tier) {
  const caps = PLAN_CAPS[tier];
  const plan = PLAN_NAMES[tier];
  const up = nextTier(tier);

  switch (code) {
    case "LISTING_LIMIT":
      return {
        icon: Package,
        title: "You've reached your listing limit",
        body: `${plan} keeps up to ${caps.listings} listings live at once. Mark sold items as sold, unlist what you don't need, or upgrade for more room.`,
        meter: { used: caps.listings, total: caps.listings, unit: "live listings" },
        compare: { label: "Live listings", key: "listings" },
        upgrade: up,
        secondary: { label: "Manage listings", to: "/productlisted" },
      };
    case "WISHLIST_LIMIT":
      return {
        icon: Heart,
        title: "Your wishlist is full",
        body: `${plan} saves up to ${caps.wishlist} items. Remove ones you no longer need, or upgrade to save more.`,
        meter: { used: caps.wishlist, total: caps.wishlist, unit: "saved items" },
        compare: { label: "Wishlist saves", key: "wishlist" },
        upgrade: up,
        secondary: { label: "Review wishlist", to: "/wishlist" },
      };
    case "BOOST_MONTHLY_LIMIT":
      return caps.monthlyBoosts === 0
        ? {
            icon: Rocket,
            title: "Boosts aren't included in Free",
            body: `Pro includes ${PLAN_CAPS.pro.monthlyBoosts} free boosts every month. Or boost just this listing once, from ₹29.`,
            compare: { label: "Free boosts a month", key: "monthlyBoosts" },
            upgrade: up,
            secondary: { label: "Buy a one-time boost", to: "/productlisted" },
          }
        : {
            icon: Rocket,
            title: "You've used this month's boosts",
            body: `${plan} includes ${caps.monthlyBoosts} boosts a month. They reset on ${fmtDay(nextBoostReset())}. Need one now? Buy a one-time boost from ₹29.`,
            meter: { used: caps.monthlyBoosts, total: caps.monthlyBoosts, unit: "boosts this month" },
            compare: { label: "Free boosts a month", key: "monthlyBoosts" },
            upgrade: up,
            secondary: { label: "Buy a one-time boost", to: "/productlisted" },
          };
    default: {
      // BOOST_ACTIVE_LIMIT / BOOST_LIMIT: too many boosts running at once.
      const more = up && PLAN_CAPS[up].liveBoosts > caps.liveBoosts ? up : null;
      return {
        icon: Clock3,
        title: caps.liveBoosts === 1 ? "A boost is already running" : `${caps.liveBoosts} boosts are already running`,
        body: `${plan} runs ${caps.liveBoosts === 1 ? "one boost" : `${caps.liveBoosts} boosts`} at a time. Start the next one when a boost ends.`,
        compare: { label: "Boosts at once", key: "liveBoosts" },
        upgrade: more,
        secondary: null,
      };
    }
  }
}

export default function PlanLimitDialog() {
  const navigate = useNavigate();
  const { userDetails } = useUser();
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(false);
  const actionsRef = useRef(null);

  useEffect(
    () =>
      subscribePlanLimit((d) => {
        setDetail(d);
        setOpen(true);
      }),
    [],
  );

  if (!detail) return null;

  // Staff accounts run on Pro+ (see backend ensureAdminPlans).
  const tier = normalizeTier(userDetails?.role === "admin" ? "pro_plus" : userDetails?.subscription);
  const c = contentFor(detail.code, tier);
  const Icon = c.icon;

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm data-[state=open]:animate-[fadeIn_150ms_ease-out]" />
        <Dialog.Content
          // Focus the main action (last button), not the close icon.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const btns = actionsRef.current?.querySelectorAll("button");
            btns?.[btns.length - 1]?.focus({ preventScroll: true });
          }}
          className={cn(
            "fixed z-[1000] w-full border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-[#1A1D20]",
            "inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] font-semibold leading-snug text-slate-900 dark:text-white">{c.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
                {c.body}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </Dialog.Close>
          </div>

          {c.meter && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="font-medium text-slate-700 dark:text-zinc-200">
                  {c.meter.used} of {c.meter.total} {c.meter.unit}
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Limit reached</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10" aria-hidden="true">
                <div className="h-full w-full rounded-full bg-amber-500" />
              </div>
            </div>
          )}

          {/* Same row for all three plans: where you are, what's next. */}
          <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <p className="border-b border-neutral-100 px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-400 dark:border-neutral-800 dark:text-zinc-500">
              {c.compare.label}
            </p>
            <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
              {PLAN_ORDER.map((t) => {
                const current = t === tier;
                const recommended = t === c.upgrade;
                return (
                  <div key={t} className={cn("px-2 py-2.5 text-center", recommended && "bg-[var(--accent-soft)]")}>
                    <p className={cn("text-[12px] font-medium", recommended ? "text-[var(--accent-text)]" : "text-slate-500 dark:text-zinc-400")}>
                      {PLAN_NAMES[t]}
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                      {capLabel(PLAN_CAPS[t][c.compare.key])}
                    </p>
                    <p className="mt-0.5 h-4 text-[10.5px] font-semibold uppercase tracking-wide">
                      {current ? (
                        <span className="text-slate-400 dark:text-zinc-500">Your plan</span>
                      ) : recommended ? (
                        <span className="text-[var(--accent-text)]">Recommended</span>
                      ) : null}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={actionsRef} className={cn("mt-5 grid gap-2.5", c.upgrade && c.secondary ? "grid-cols-1 min-[400px]:grid-cols-2" : "grid-cols-1")}>
            {c.secondary && (
              <button
                type="button"
                onClick={() => go(c.secondary.to)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5"
              >
                {c.secondary.label}
              </button>
            )}
            {c.upgrade ? (
              <button
                type="button"
                onClick={() => go("/price")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft-strong)]"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Upgrade to {PLAN_NAMES[c.upgrade]}
              </button>
            ) : (
              !c.secondary && (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-[14px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Got it
                  </button>
                </Dialog.Close>
              )
            )}
          </div>
          {c.upgrade && (
            <p className="mt-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
              Compare everything on the{" "}
              <button type="button" onClick={() => go("/price")} className="font-semibold text-[var(--accent-text)] hover:underline">
                Plans page
              </button>
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
