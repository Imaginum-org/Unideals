import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn.js";

/*
 * Verified tick for students who verified a college email.
 *
 * Verified: solid emerald eight-lobed badge with a white check, visible to
 * everyone (emerald so it never blends with the indigo/pink accent).
 * Unverified (owner only, `showUnverified`): the same shape greyed out,
 * linking to Settings → Verification.
 * Hover, keyboard focus or a tap shows what the tick means. The tooltip is
 * portalled and clamped to the viewport, so it works inside cards with
 * overflow hidden and on 320px phones.
 */

// Eight-lobed badge: 8 inner "pinch" points joined by round lobes that are a
// bit more than half a circle (large-arc), one lobe centred at the top.
const ROSETTE = (() => {
  const c = 12;
  const R = 8.4;
  const r = 3.3;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = ((i * 45 - 90 + 22.5) * Math.PI) / 180;
    return [c + R * Math.cos(a), c + R * Math.sin(a)].map((v) => v.toFixed(3));
  });
  return `M${pts[0].join(" ")}${pts
    .slice(1)
    .concat([pts[0]])
    .map(([x, y]) => `A${r} ${r} 0 1 1 ${x} ${y}`)
    .join("")}Z`;
})();

const SIZES = { xs: "h-3.5 w-3.5", sm: "h-4 w-4", md: "h-[18px] w-[18px]", lg: "h-5 w-5", xl: "h-6 w-6" };

export function TickIcon({ verified = true, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d={ROSETTE}
        className={verified ? "fill-emerald-600 dark:fill-emerald-500" : "fill-slate-300 dark:fill-zinc-600"}
      />
      <path
        d="M7.1 12.2l3.3 3.3 6.4-6.9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

const GAP = 8;
const EDGE = 12;

export default function VerifiedTick({
  verified,
  showUnverified = false,
  size = "sm",
  to = "/settings?tab=verification",
  title,
  description,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const tipId = useId();
  const touchRef = useRef(false);

  const place = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    const t = tipRef.current?.getBoundingClientRect();
    if (!a || !t) return;
    const vw = window.innerWidth;
    const below = a.top - t.height - GAP < EDGE;
    const left = Math.min(Math.max(a.left + a.width / 2 - t.width / 2, EDGE), vw - EDGE - t.width);
    const top = below ? a.bottom + GAP : a.top - t.height - GAP;
    const arrow = Math.min(Math.max(a.left + a.width / 2 - left, 14), t.width - 14);
    setPos({ left, top, below, arrow });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onKey = (e) => e.key === "Escape" && close();
    const onDown = (e) => {
      if (!anchorRef.current?.contains(e.target) && !tipRef.current?.contains(e.target)) close();
    };
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!verified && !showUnverified) return null;

  const heading = title || (verified ? "Verified student" : "Not verified yet");
  const body =
    description ||
    (verified
      ? "This person confirmed a college email address with Unideals, so you know they're a real student."
      : "Verify your college email to get the verified tick. Buyers trust verified sellers more, so your items sell faster.");

  const triggerProps = {
    ref: anchorRef,
    "aria-describedby": open ? tipId : undefined,
    onPointerEnter: (e) => e.pointerType === "mouse" && setOpen(true),
    onPointerLeave: (e) => e.pointerType === "mouse" && setOpen(false),
    onPointerDown: (e) => {
      touchRef.current = e.pointerType !== "mouse";
    },
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    className: cn(
      "relative inline-flex shrink-0 items-center justify-center rounded-full align-middle outline-none",
      "focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#1A1D20]",
      // Bigger tap target than the glyph, without shifting layout.
      "before:absolute before:-inset-2 before:content-['']",
      !verified && "transition-opacity hover:opacity-80",
      className,
    ),
  };

  const icon = <TickIcon verified={verified} className={SIZES[size] || SIZES.sm} />;
  const label = verified ? "Verified student" : "Not verified. Verify your college email";

  // Unverified: a tap on a phone first explains, a second tap opens Settings.
  const trigger = verified ? (
    <button
      type="button"
      aria-label={label}
      onClick={() => touchRef.current && setOpen((v) => !v)}
      {...triggerProps}
    >
      {icon}
    </button>
  ) : (
    <Link
      to={to}
      aria-label={label}
      onClick={(e) => {
        if (touchRef.current && !open) {
          e.preventDefault();
          setOpen(true);
        }
      }}
      {...triggerProps}
    >
      {icon}
    </Link>
  );

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            className={cn(
              "pointer-events-none fixed z-[1000] w-max max-w-[min(264px,calc(100vw-24px))] rounded-xl px-3 py-2.5 text-left shadow-[0_10px_30px_-8px_rgba(15,23,42,0.35)]",
              "bg-slate-900 text-white ring-1 ring-white/10 dark:bg-zinc-800",
              pos ? "animate-[tickTip_140ms_ease-out]" : "opacity-0",
            )}
          >
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <TickIcon verified={verified} className="h-3.5 w-3.5" />
              {heading}
            </span>
            <span className="mt-1 block text-[12px] leading-snug text-white/75">{body}</span>
            {!verified && (
              <span className="mt-1.5 block text-[12px] font-semibold text-emerald-300">
                {touchRef.current ? "Tap the tick again to verify" : "Click the tick to verify"}
              </span>
            )}
            {pos && (
              <span
                aria-hidden="true"
                style={{ left: pos.arrow }}
                className={cn(
                  "absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 dark:bg-zinc-800",
                  pos.below ? "-top-1" : "-bottom-1",
                )}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
