import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Handshake, Plus, Tag, X } from "lucide-react";
import { FaPlus } from "react-icons/fa";
import { cn } from "../../../utils/cn.js";

/*
 * One place to post anything: the header's "Post" button (desktop) and the
 * tab bar's + (phones) open the same two choices, Sell or Rent.
 * Only used while Rent & Borrow is on; otherwise the old Sell link stays.
 */

const POST_OPTIONS = [
  { to: "/upload", label: "Sell", hint: "List an item for a one-time price", Icon: Tag },
  { to: "/rent/new", label: "Rent", hint: "Rent it out, lend it, or ask your block for something", Icon: Handshake },
];

function OptionRow({ to, label, hint, Icon, onPick, large }) {
  return (
    <Link
      to={to}
      onClick={onPick}
      role="menuitem"
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        large
          ? "border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-700 dark:bg-[#1A1D20]"
          : "px-3 py-2.5 hover:bg-[#4B45FF]/10 dark:hover:bg-[#4B45FF]/20",
      )}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]", large ? "h-11 w-11" : "h-9 w-9")}>
        <Icon className={large ? "h-5 w-5" : "h-[18px] w-[18px]"} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold text-slate-900 dark:text-white", large ? "text-[16px]" : "text-[14px]")}>{label}</span>
        <span className={cn("block text-slate-500 dark:text-zinc-400", large ? "text-[13px]" : "text-[12.5px]")}>{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" aria-hidden="true" />
    </Link>
  );
}

/** Desktop header: "Post +" with a Sell / Rent menu. */
export function PostMenuButton({ className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-lg bg-[#3838EC] px-3 py-2 text-sm font-medium text-[#FCFCFC] transition-all duration-200 hover:scale-[1.02] md:px-4 md:text-base lg:px-5",
          open && "scale-[1.02] bg-[#2f2fd9]",
          className,
        )}
      >
        <span>Post</span>
        <FaPlus className={cn("size-3 transition-transform duration-200", open && "rotate-45")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="What do you want to post?"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="dd-panel absolute right-0 top-full z-50 mt-2 w-[300px] p-1.5 font-figtree"
          >
            <p className="px-3 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Post</p>
            {POST_OPTIONS.map((o) => (
              <OptionRow key={o.to} {...o} onPick={() => setOpen(false)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Phones: the tab bar's + opens this sheet. */
export function PostChooserSheet({ open, onOpenChange }) {
  const navigate = useNavigate();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[1000] rounded-t-3xl bg-[#F7F8FA] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 font-figtree shadow-2xl focus:outline-none dark:bg-[#131313]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" />
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-[18px] font-semibold text-slate-900 dark:text-white">What do you want to post?</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-full text-slate-500 active:bg-neutral-200 dark:text-zinc-400 dark:active:bg-white/10" aria-label="Close">
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Sell an item or post on Rent & Borrow</Dialog.Description>
          <div className="space-y-2.5" role="menu">
            {POST_OPTIONS.map((o) => (
              <OptionRow
                key={o.to}
                {...o}
                large
                onPick={(e) => {
                  e.preventDefault();
                  onOpenChange(false);
                  navigate(o.to);
                }}
              />
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The tab bar's + when Rent & Borrow is on. */
export function PostTabButton({ className }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Post: sell or rent" aria-haspopup="dialog" className={className}>
        <Plus className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
      </button>
      <PostChooserSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
