import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Ban,
  Check,
  Clock,
  Cookie,
  CreditCard,
  Database,
  Eye,
  FileText,
  Flag,
  Flower2,
  Gavel,
  GraduationCap,
  Handshake,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Printer,
  RefreshCw,
  Scale,
  Settings,
  Share2,
  Shield,
  Store,
  Tag,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import { LEGAL_DOCS, LEGAL_EMAIL, LEGAL_UPDATED } from "../content/legalContent.js";
import { cn } from "../../../utils/cn.js";

const ICONS = {
  ban: Ban, check: Check, clock: Clock, cookie: Cookie, card: CreditCard, database: Database, eye: Eye,
  flag: Flag, flower: Flower2, gavel: Gavel, grad: GraduationCap, handshake: Handshake, image: ImageIcon,
  info: Info, lock: Lock, mail: Mail, chat: MessageCircle, phone: Phone, refresh: RefreshCw, scale: Scale,
  settings: Settings, share: Share2, shield: Shield, store: Store, tag: Tag, trash: Trash2, trophy: Trophy, user: User,
};

const TABS = [
  { id: "privacy", label: "Privacy Policy", icon: Shield },
  { id: "terms", label: "Terms of Use", icon: FileText },
];

// "**bold**" → <strong>
const rich = (s) =>
  String(s)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    );

const wordCount = (doc) =>
  doc.sections.reduce((n, s) => {
    const text = [s.short, ...s.body.flatMap((b) => b.p || b.note || (b.list || []).map((i) => (typeof i === "string" ? i : `${i.label} ${i.text}`)))].join(" ");
    return n + text.split(/\s+/).length;
  }, 0);

function Block({ block }) {
  if (block.p) return <p>{rich(block.p)}</p>;
  if (block.note) {
    const warn = block.tone === "warn";
    return (
      <p
        className={cn(
          "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px]",
          warn ? "bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100" : "bg-sky-50 text-sky-900 dark:bg-sky-950/20 dark:text-sky-100",
        )}
      >
        <Info className={cn("mt-0.5 h-4 w-4 shrink-0", warn ? "text-amber-500" : "text-sky-500")} aria-hidden="true" />
        <span>{rich(block.note)}</span>
      </p>
    );
  }
  if (block.list) {
    return (
      <ul className="space-y-2.5">
        {block.list.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
            {typeof item === "string" ? (
              <span>{rich(item)}</span>
            ) : (
              <span>
                <strong className="font-semibold text-slate-900 dark:text-white">{item.label}:</strong> {rich(item.text)}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function Section({ section, index, compact }) {
  return (
    <article
      id={`legal-${section.id}`}
      className={cn(
        "scroll-mt-24",
        compact
          ? "border-b border-neutral-200/70 pb-5 last:border-0 dark:border-neutral-800"
          : "rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6 dark:border-neutral-800 dark:bg-[#1A1D20]",
      )}
    >
      <header className="flex items-center gap-3">
        <span className="w-9 shrink-0 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-slate-300 dark:text-zinc-600" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <p className="sr-only">Section {index + 1}</p>
          <h2 className="text-[16px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[17px] dark:text-white">{section.title}</h2>
        </div>
      </header>

      <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-[var(--accent)]/15 bg-[var(--accent-soft)] px-3.5 py-2.5">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
        <p className="text-[13.5px] leading-snug text-slate-800 dark:text-zinc-100">
          <span className="font-semibold text-[var(--accent-text)]">In short: </span>
          {section.short}
        </p>
      </div>

      <div className="mt-3.5 space-y-3 text-[14px] leading-relaxed text-slate-600 dark:text-zinc-300">
        {section.body.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </article>
  );
}

/**
 * Terms & Privacy reader. Plain-language "In short" per section, a summary
 * strip and a sticky table of contents. `compact` is the sign-up modal.
 * `type` + `onTypeChange` make it controlled; `syncUrl` keeps ?tab= in sync.
 */
function LegalDocument({ type, initialType = "privacy", onTypeChange, compact = false, syncUrl = false }) {
  const [params, setParams] = useSearchParams();
  const urlTab = syncUrl ? params.get("tab") : null;
  const [internal, setInternal] = useState(LEGAL_DOCS[urlTab] ? urlTab : initialType);
  const active = LEGAL_DOCS[type] ? type : internal;
  const doc = LEGAL_DOCS[active] || LEGAL_DOCS.privacy;
  const [activeId, setActiveId] = useState(doc.sections[0].id);
  const minutes = useMemo(() => Math.max(1, Math.round(wordCount(doc) / 200)), [doc]);

  // Follow back/forward navigation of ?tab=.
  useEffect(() => {
    if (syncUrl && LEGAL_DOCS[urlTab] && urlTab !== internal) setInternal(urlTab);
  }, [syncUrl, urlTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTo = (t) => {
    if (t === active) return;
    setInternal(t);
    onTypeChange?.(t);
    if (syncUrl) {
      const next = new URLSearchParams(params);
      next.set("tab", t);
      setParams(next, { replace: true });
    }
    setActiveId(LEGAL_DOCS[t].sections[0].id);
    if (!compact) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll-spy for the contents list.
  useEffect(() => {
    if (compact || typeof IntersectionObserver === "undefined") return undefined;
    const els = doc.sections.map((s) => document.getElementById(`legal-${s.id}`)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveId(top.target.id.replace("legal-", ""));
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [doc, compact]);

  const jump = (id) => {
    setActiveId(id);
    document.getElementById(`legal-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs = (
    <div role="tablist" aria-label="Legal documents" className={cn("inline-flex rounded-xl p-1", compact ? "bg-neutral-100 dark:bg-white/5" : "bg-white/10 ring-1 ring-white/15 backdrop-blur")}>
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => switchTo(t.id)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13.5px] font-semibold transition-colors",
              compact
                ? on
                  ? "bg-white text-slate-900 shadow-sm dark:bg-[#1A1D20] dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
                : on
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-white/75 hover:text-white",
            )}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const summary = (
    <div className={cn("grid gap-3", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
      {doc.summary.map((s) => {
        const Icon = ICONS[s.icon] || Info;
        return (
          <div key={s.title} className="rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-[#1A1D20]">
            <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
            <p className="mt-2.5 text-[14px] font-semibold text-slate-900 dark:text-white">{s.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-400">{s.text}</p>
          </div>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4 font-figtree">
        {tabs}
        <p className="text-[13px] text-slate-500 dark:text-zinc-400">
          Last updated {LEGAL_UPDATED} · {minutes} min read
        </p>
        {summary}
        <div className="space-y-5 pt-1">
          {doc.sections.map((s, i) => (
            <Section key={s.id} section={s} index={i} compact />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="font-figtree text-slate-900 dark:text-white">
      {/* Hero: same brand surface as the home banner and footer */}
      <header
        className="brand-surface overflow-hidden rounded-2xl px-5 py-7 text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-9 print:text-black print:shadow-none"
      >
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">Legal</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight sm:text-[32px]">{doc.title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/80 sm:text-[15px]">{doc.intro}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-medium">
            {[`Updated ${LEGAL_UPDATED}`, `${minutes} min read`, "Governed by Indian law"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 print:hidden">{tabs}</div>
        </div>
      </header>

      <section className="mt-5" aria-label="Summary">
        <h2 className="mb-3 text-[15px] font-semibold text-slate-900 dark:text-white">The short version</h2>
        {summary}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Contents */}
        <aside className="print:hidden">
          <label className="lg:hidden">
            <span className="sr-only">Jump to section</span>
            <select
              value={activeId}
              onChange={(e) => jump(e.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[14px] font-medium text-slate-800 outline-none focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-[#1A1D20] dark:text-zinc-100"
            >
              {doc.sections.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.title}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label="Contents" className="sticky top-24 hidden lg:block">
            <p className="mb-2 px-2 text-[11.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Contents</p>
            <ol className="max-h-[calc(100dvh-12rem)] space-y-0.5 overflow-y-auto pr-1">
              {doc.sections.map((s, i) => {
                const on = s.id === activeId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => jump(s.id)}
                      aria-current={on ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug transition-colors",
                        on
                          ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-text)]"
                          : "text-slate-500 hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white",
                      )}
                    >
                      <span className="w-4 shrink-0 tabular-nums opacity-70">{i + 1}</span>
                      {s.title}
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-3 inline-flex items-center gap-1.5 px-2 text-[12.5px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print or save as PDF
            </button>
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {doc.sections.map((s, i) => (
            <Section key={s.id} section={s} index={i} />
          ))}

          {/* Help */}
          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-neutral-800 dark:bg-[#1A1D20] print:hidden">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
              <div>
                <p className="text-[15px] font-semibold">Still have a question?</p>
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                  Check the FAQ or write to us at{" "}
                  <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold text-[var(--accent-text)] hover:underline">
                    {LEGAL_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/faq"
                className="inline-flex h-10 items-center rounded-lg border border-neutral-200 px-4 text-[13.5px] font-semibold text-slate-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-zinc-100 dark:hover:bg-white/5"
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-10 items-center rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LegalDocument;
