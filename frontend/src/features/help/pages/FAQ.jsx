import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Crown,
  Flower2,
  Handshake,
  LifeBuoy,
  MessageSquareText,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trophy,
  User,
  X,
} from "lucide-react";
import { useUser } from "../../../context/useUserContext.jsx";
import { AccountLayout, CARD, FLUSH_ON_PHONE, PageHeader } from "../../user/components/account/AccountKit.jsx";
import Seo from "../../../components/Seo.jsx";
import { FAQ_CATEGORIES, FAQ_COUNT } from "../faqData.js";
import { cn } from "../../../utils/cn.js";

const ICONS = {
  rocket: Rocket,
  bag: ShoppingBag,
  tag: Tag,
  handshake: Handshake,
  chat: MessageSquareText,
  shield: ShieldCheck,
  crown: Crown,
  trophy: Trophy,
  flower: Flower2,
  user: User,
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const Highlight = ({ text, query }) => {
  if (!query) return text;
  return String(text)
    .split(new RegExp(`(${escapeRe(query)})`, "ig"))
    .map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40">
          {part}
        </mark>
      ) : (
        part
      ),
    );
};

function FaqItem({ item, query, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = query ? true : open;
  return (
    <div className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        className="group flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="text-[14px] font-medium text-slate-900 group-hover:text-[var(--accent-text)] dark:text-white">
          <Highlight text={item.q} query={query} />
        </span>
        <ChevronDown
          className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180 text-[var(--accent-text)]")}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-slate-600 sm:px-5 dark:text-zinc-300">
              <Highlight text={item.a} query={query} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [draft, setDraft] = useState(query);

  const setQuery = (value) => {
    setDraft(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const results = useMemo(() => {
    if (!query) return FAQ_CATEGORIES;
    const q = query.toLowerCase();
    return FAQ_CATEGORIES.map((c) => ({
      ...c,
      questions: c.questions.filter((x) => x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q)),
    })).filter((c) => c.questions.length > 0);
  }, [query]);
  const matchCount = results.reduce((n, c) => n + c.questions.length, 0);

  const jumpTo = (id) => document.getElementById(`faq-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={draft}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${FAQ_COUNT} answers…`}
          aria-label="Search frequently asked questions"
          className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-10 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-white"
        />
        {draft && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      {!query && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {FAQ_CATEGORIES.map((c) => {
            const Icon = ICONS[c.icon] || LifeBuoy;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => jumpTo(c.id)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {c.title}
              </button>
            );
          })}
        </div>
      )}

      {query && (
        <p className="text-[13px] text-slate-500 dark:text-zinc-400" aria-live="polite">
          {matchCount ? `${matchCount} answer${matchCount === 1 ? "" : "s"} for “${query}”` : `No answers for “${query}”`}
        </p>
      )}

      {/* Sections */}
      {results.map((c) => {
        const Icon = ICONS[c.icon] || LifeBuoy;
        return (
          <section key={c.id} id={`faq-${c.id}`} className={cn(CARD, FLUSH_ON_PHONE, "scroll-mt-20 overflow-hidden")}>
            <h2 className="flex items-center gap-2.5 border-b border-neutral-100 px-4 py-3.5 text-[15px] font-semibold text-slate-900 sm:px-5 dark:border-neutral-800 dark:text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {c.title}
              <span className="ml-auto text-[12px] font-normal text-slate-400">{c.questions.length}</span>
            </h2>
            {c.questions.map((item) => (
              <FaqItem key={item.q} item={item} query={query} defaultOpen={false} />
            ))}
          </section>
        );
      })}

      {/* Still stuck */}
      <div className={cn(CARD, FLUSH_ON_PHONE, "flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Still need help?</p>
            <p className="text-[13px] text-slate-500 dark:text-zinc-400">Our team usually replies within 2 hours.</p>
          </div>
        </div>
        <Link
          to="/contact"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}

// Signed in: account shell. Signed out: public page (the account sidebar
// would bounce guests to /login).
export default function FAQ() {
  const { userDetails } = useUser();
  if (userDetails?._id) {
    return (
      <AccountLayout seoTitle="FAQ | Unideals" width="md" title="FAQ" description={`${FAQ_COUNT} answers to common questions`}>
        <FaqContent />
      </AccountLayout>
    );
  }
  return (
    <>
      <Seo title="FAQ | Unideals" description="Answers to common questions about buying and selling on Unideals." />
      <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] font-figtree dark:bg-[#131313]">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
          <PageHeader title="Frequently asked questions" description={`${FAQ_COUNT} answers about buying, selling and staying safe on Unideals.`} />
          <FaqContent />
        </div>
      </div>
    </>
  );
}
