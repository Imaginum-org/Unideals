import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  Camera,
  ChevronUp,
  History,
  ImagePlus,
  IndianRupee,
  Mic,
  Minus,
  RotateCcw,
  RotateCw,
  Search,
  ShieldCheck,
  Square,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { getAssistantChat, rateAssistantReply, sendAssistantMessage } from "../api/assistantApi.js";
import Wordmark from "../../../components/ui/Wordmark.jsx";
import { LOGO_PATHS, LOGO_VIEWBOX } from "../../../components/ui/BrandLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import PriceEstimateCard from "./PriceEstimateCard.jsx";
import ComparisonCard from "./ComparisonCard.jsx";
import ListingDraftCard from "./ListingDraftCard.jsx";
import ChecklistCard from "./ChecklistCard.jsx";
import BudgetBundleCard from "./BudgetBundleCard.jsx";
import SafetyTipCard from "./SafetyTipCard.jsx";
import AssistantMessageActions from "./AssistantMessageActions.jsx";
import AssistantHistoryPanel from "./AssistantHistoryPanel.jsx";

const quickActions = [
  { icon: Search, title: "Find a deal", hint: "Affordable electronics", prompt: "Find affordable electronics" },
  { icon: Wallet, title: "Shop on a budget", hint: "Cycles under ₹3,000", prompt: "Cycles under ₹3,000" },
  { icon: Tag, title: "Sell something", hint: "Draft a listing", prompt: "Help me sell a textbook" },
  { icon: IndianRupee, title: "Price check", hint: "Is it a fair deal?", prompt: "Check a fair price" },
];

const welcomeSuggestions = ["Campus safety tips", "Show trending items", "How do boosts work?"];

const initialMessage = {
  id: "welcome",
  text: "",
  sender: "assistant",
  isWelcome: true,
};

const hiddenRoutes = ["/chat", "/login", "/signup", "/forgot-password"];
const MAX_VOICE_RECORDING_MS = 60_000;
const STORAGE_KEY = "unideals-assistant-chat";
const MAX_STORED_MESSAGES = 30;

let messageCounter = 0;
const nextId = () => `m-${Date.now().toString(36)}-${(messageCounter += 1)}`;

const loadStoredMessages = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return [initialMessage];
};

// The saved chat this tab is continuing, tied to the account that owns it.
const CONVERSATION_KEY = "unideals-assistant-conversation";

const loadStoredConversation = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CONVERSATION_KEY) || "null");
    if (stored?.id && stored?.userId) return stored;
  } catch {
    // Storage unavailable or corrupt.
  }
  return null;
};

const saveConversation = (conversation) => {
  try {
    if (conversation) sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversation));
    else sessionStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Persistence is a nicety only.
  }
};

// One reply from the API, in the widget's message shape.
const toAssistantMessage = (data, id = nextId()) => ({
  id,
  serverId: data.messageId || data.serverId || undefined,
  feedback: data.feedback || null,
  text: data.reply || data.text || "Sorry, I didn't catch that. Could you rephrase?",
  sender: "assistant",
  intent: data.intent,
  category: data.category,
  products: data.productCards?.length ? data.productCards : data.products || [],
  searchQuery: data.searchQuery || "",
  suggestions: data.suggestions || [],
  estimate: data.estimate || null,
  comparison: data.comparison || null,
  draft: data.draft || null,
  checklist: data.checklist || null,
  bundle: data.bundle || null,
  safetyTips: data.safetyTips || null,
  route: data.route || null,
  routeLabel: data.routeLabel || null,
});

const saveMessages = (messages) => {
  try {
    // Images are large data URLs; keep the conversation light.
    const light = messages.slice(-MAX_STORED_MESSAGES).map(({ mediaPreview, ...rest }) => ({
      ...rest,
      hadMedia: rest.hadMedia || Boolean(mediaPreview),
    }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(light));
  } catch {
    // Quota exceeded or storage blocked: persistence is a nicety only.
  }
};

/* ── Brand mark: the Unideals logo ──
   BrandMark: static logo (cheap; used for per-message avatars).
   MorphMark: the navbar's live U <-> logo morph, glyph only. */
const BrandMark = ({ className = "h-7 w-7" }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] ring-1 ring-[#4A4DFE]/10 dark:bg-[#4A4DFE]/15 dark:ring-[#4A4DFE]/25 ${className}`}
    aria-hidden="true"
  >
    <svg viewBox={LOGO_VIEWBOX} className="h-[55%] w-[55%]" fill="none">
      {LOGO_PATHS.map((p) => (
        <path key={p.transform} transform={p.transform} d={p.d} fill="#4A4DFE" />
      ))}
    </svg>
  </span>
);

const MorphMark = ({ fontSize = 26, active, className = "" }) => (
  <span
    className={`flex shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] ring-1 ring-[#4A4DFE]/10 dark:bg-[#4A4DFE]/15 dark:ring-[#4A4DFE]/25 ${className}`}
    aria-hidden="true"
  >
    <Wordmark
      markOnly
      reversed
      active={active}
      fontSize={fontSize}
      fontWeight={800}
      letterSpacing={0}
      className="text-[#0F172A] dark:text-white"
    />
  </span>
);

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price || 0);

const CONDITION_LABELS = {
  brand_new: "Brand new",
  like_new: "Like new",
  gently_used: "Gently used",
  well_used: "Well used",
  for_parts_or_not_working: "For parts",
};

/* ── Lightweight rich text: **bold**, *italic*, lists and in-app /routes ── */
const renderInline = (text, keyPrefix) =>
  text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|(?<![\w/])\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)/gi).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (/^\/[a-z]/i.test(part)) {
      return (
        <Link key={key} to={part} className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-300">
          {part}
        </Link>
      );
    }
    return <span key={key}>{part}</span>;
  });

const RichText = ({ text = "" }) => {
  const lines = String(text).split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const bullet = trimmed.match(/^(?:[•\-–*]|(\d+)[.)])\s+(.*)$/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-[1px] shrink-0 text-[12.5px] font-semibold text-indigo-500 dark:text-indigo-300">
                {bullet[1] ? `${bullet[1]}.` : "•"}
              </span>
              <span>{renderInline(bullet[2], `l${index}`)}</span>
            </div>
          );
        }
        return <p key={index}>{renderInline(trimmed, `l${index}`)}</p>;
      })}
    </div>
  );
};

const ProductCard = ({ product }) => {
  const image = product.images?.[0] || "/image10.png";
  const hasDiscount = product.original_price > product.selling_price;
  const discount = hasDiscount
    ? Math.round(((product.original_price - product.selling_price) / product.original_price) * 100)
    : 0;
  const condition = product.conditionLabel || CONDITION_LABELS[product.condition];

  return (
    <Link
      to={`/product/${product._id}`}
      className="group flex w-[156px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_10px_24px_-12px_rgba(79,70,229,.45)] dark:border-zinc-800 dark:bg-[#1B1D22] dark:hover:border-indigo-500/50"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
        <img
          src={image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = "/image10.png";
          }}
        />
        {discount >= 5 && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {discount}% off
          </span>
        )}
        {product.is_boosted && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 shadow-sm backdrop-blur">
            ⚡ Hot
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-slate-900 dark:text-white">{product.title}</h3>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="text-[14px] font-bold tracking-tight text-indigo-700 dark:text-indigo-300">₹{formatPrice(product.selling_price)}</span>
          {hasDiscount && (
            <span className="text-[10.5px] text-slate-400 line-through">₹{formatPrice(product.original_price)}</span>
          )}
        </div>
        {condition && <span className="truncate text-[10.5px] font-medium text-slate-500 dark:text-zinc-400">{condition}</span>}
      </div>
    </Link>
  );
};

const SeeAllCard = ({ query }) => (
  <Link
    to={`/search?q=${encodeURIComponent(query)}`}
    className="flex w-[110px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3 text-center text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-900">
      <ArrowRight className="h-4 w-4" />
    </span>
    See all results
  </Link>
);

const TypingIndicator = () => (
  <div className="flex items-end gap-2" role="status" aria-label="Assistant is typing">
    <BrandMark className="h-7 w-7" />
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-3 dark:border-zinc-800 dark:bg-[#1B1D22]">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 motion-reduce:animate-none"
          style={{ animationDelay: `${dot * 140}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  </div>
);

const WelcomeHero = ({ name, onPick }) => (
  <div className="flex flex-col items-center px-1 pt-3 text-center">
    <div className="relative mb-3 h-16 w-16">
      <span className="absolute -inset-3 rounded-full bg-[#4A4DFE]/15 blur-xl" />
      <MorphMark fontSize={40} className="relative h-16 w-16" />
    </div>
    <h3 className="text-[19px] font-bold tracking-tight text-slate-900 dark:text-white">
      {name ? `Hey ${name}! 👋` : "Hey there! 👋"}
    </h3>
    <p className="mt-1 max-w-[290px] text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
      I can find listings, check fair prices, help you sell, and keep your deals safe.
    </p>
    <div className="mt-5 grid w-full grid-cols-2 gap-2">
      {quickActions.map(({ icon: Icon, title, hint, prompt }) => (
        <button
          key={title}
          type="button"
          onClick={() => onPick(prompt)}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_10px_24px_-14px_rgba(79,70,229,.5)] dark:border-zinc-800 dark:bg-[#1B1D22] dark:hover:border-indigo-500/50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-600 transition group-hover:from-indigo-500 group-hover:to-sky-500 group-hover:text-white dark:from-indigo-500/15 dark:to-sky-500/10 dark:text-indigo-300">
            <Icon className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-slate-900 dark:text-white">{title}</span>
            <span className="block text-[11.5px] text-slate-500 dark:text-zinc-400">{hint}</span>
          </span>
        </button>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {welcomeSuggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onPick(suggestion)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-300"
        >
          {suggestion === "Campus safety tips" && <ShieldCheck className="h-3.5 w-3.5" />}
          {suggestion}
        </button>
      ))}
    </div>
  </div>
);

/* ── Thought cloud above the launcher ──
   "Thinks" (animated dots), then types a short line, and cycles through a few
   prompts before settling on "Ask me anything". Click opens the assistant;
   the × hides it for the rest of the session. */
const CLOUD_DISMISSED_KEY = "unideals-assistant-cloud-dismissed";
const CLOUD_THINK_MS = 1300;
const CLOUD_TYPE_MS = 34;
const CLOUD_HOLD_MS = 3200;

const isCloudDismissed = () => {
  try {
    return sessionStorage.getItem(CLOUD_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

const ThinkingDots = () => (
  <span className="flex items-center gap-1 py-[3px]" aria-hidden="true">
    {[0, 1, 2].map((dot) => (
      <span
        key={dot}
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4A4DFE]"
        style={{ animationDelay: `${dot * 150}ms`, animationDuration: "900ms", opacity: 0.55 + dot * 0.2 }}
      />
    ))}
  </span>
);

const ThoughtCloud = ({ lines, reducedMotion, onOpen, onDismiss }) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(reducedMotion ? "shown" : "thinking");
  const [chars, setChars] = useState(0);
  const linesKey = lines.join("|");
  const isLast = index >= lines.length - 1;
  const line = lines[Math.min(index, lines.length - 1)] || "";

  // A new set of lines (e.g. after signing in) restarts the cycle.
  useEffect(() => {
    setIndex(reducedMotion ? lines.length - 1 : 0);
    setPhase(reducedMotion ? "shown" : "thinking");
    setChars(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    let timer;
    if (phase === "thinking") {
      timer = window.setTimeout(() => setPhase("typing"), CLOUD_THINK_MS);
    } else if (phase === "typing") {
      if (chars < line.length) timer = window.setTimeout(() => setChars((c) => c + 1), CLOUD_TYPE_MS);
      else setPhase("shown");
    } else if (phase === "shown" && !isLast) {
      timer = window.setTimeout(() => {
        setIndex((i) => i + 1);
        setChars(0);
        setPhase("thinking");
      }, CLOUD_HOLD_MS);
    }
    return () => window.clearTimeout(timer);
  }, [phase, chars, line, isLast, reducedMotion]);

  const text = phase === "shown" || reducedMotion ? line : line.slice(0, chars);

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ transformOrigin: "bottom right" }}
      className="group/cloud absolute bottom-full right-1 mb-5 [filter:drop-shadow(0_10px_22px_rgba(74,77,254,0.22))_drop-shadow(0_1px_2px_rgba(15,23,42,0.08))]"
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
        transition={reducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* cloud puffs: same fill as the body, so the shadow wraps one shape */}
        <span aria-hidden="true" className="absolute -top-3 left-4 h-8 w-8 rounded-full bg-white dark:bg-[#272B35]" />
        <span aria-hidden="true" className="absolute -top-[18px] left-[42%] h-10 w-10 rounded-full bg-white dark:bg-[#272B35]" />
        <span aria-hidden="true" className="absolute -top-2.5 right-5 h-7 w-7 rounded-full bg-white dark:bg-[#272B35]" />
        <button
          type="button"
          onClick={onOpen}
          className="relative flex min-h-[40px] min-w-[150px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-left text-[13.5px] font-semibold tracking-tight text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A4DFE]/50 dark:bg-[#272B35] dark:text-white"
          aria-label={`${line} Open Unideals AI`}
        >
          {phase === "thinking" ? (
            <ThinkingDots />
          ) : (
            <span aria-live="polite">
              {text}
              {phase === "typing" && <span className="ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] animate-pulse bg-[#4A4DFE]" />}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          aria-label="Hide this tip"
          className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white opacity-100 shadow transition hover:bg-slate-900 sm:opacity-0 sm:group-hover/cloud:opacity-100 dark:bg-zinc-200 dark:text-zinc-900"
        >
          <X className="h-3 w-3" />
        </button>
      </motion.div>
      {/* the trail of small bubbles leading down to the launcher */}
      <span aria-hidden="true" className="absolute -bottom-3 right-5 h-3.5 w-3.5 rounded-full bg-white dark:bg-[#272B35]" />
      <span aria-hidden="true" className="absolute -bottom-[22px] right-2.5 h-2 w-2 rounded-full bg-white dark:bg-[#272B35]" />
    </motion.div>
  );
};

const FloatingAssistant = () => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { userDetails } = useUser();
  const firstName = userDetails?.name?.trim().split(/\s+/)[0] || "";
  const userId = userDetails?._id || null;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [messages, setMessages] = useState(loadStoredMessages);
  const [conversation, setConversation] = useState(loadStoredConversation);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  // Only continue a saved chat that belongs to whoever is signed in now.
  const conversationId = userId && conversation?.userId === userId ? conversation.id : null;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const assistantVisibleRef = useRef(false);
  const [launcherHover, setLauncherHover] = useState(false);
  const [launcherPulse, setLauncherPulse] = useState(false);
  const [cloudDismissed, setCloudDismissed] = useState(isCloudDismissed);
  const [cloudReady, setCloudReady] = useState(false);
  assistantVisibleRef.current = isOpen && !isMinimized;

  const shouldHide = hiddenRoutes.some((route) => location.pathname.startsWith(route));
  const isPanelVisible = isOpen && !isMinimized;
  const hasConversation = messages.some((message) => message.sender === "user");
  const lastAssistantIndex = messages.reduce(
    (last, message, index) => (message.sender === "assistant" ? index : last),
    -1,
  );

  const pushAssistantNote = useCallback((text) => {
    setMessages((prev) => [...prev, { id: nextId(), text, sender: "assistant", isError: true }]);
  }, []);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    saveConversation(conversation);
  }, [conversation]);

  useEffect(() => {
    if (isPanelVisible) {
      messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "end" });
    }
  }, [messages, isPanelVisible, isTyping, prefersReducedMotion]);

  useEffect(() => {
    if (isPanelVisible) {
      const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isPanelVisible]);

  useEffect(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, [location.pathname]);

  // Esc closes the panel (or the camera overlay first).
  useEffect(() => {
    if (!isPanelVisible) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (cameraStreamRef.current) return;
      setIsMinimized(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPanelVisible]);

  // Idle attention cue: every few seconds the launcher's logo mark briefly
  // morphs into the "U" and back (the same morph as the navbar wordmark).
  useEffect(() => {
    if (prefersReducedMotion || isOpen || shouldHide) return undefined;
    let flipBack;
    const interval = window.setInterval(() => {
      setLauncherPulse(true);
      flipBack = window.setTimeout(() => setLauncherPulse(false), 1400);
    }, 7000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(flipBack);
      setLauncherPulse(false);
    };
  }, [prefersReducedMotion, isOpen, shouldHide]);

  // The thought cloud appears a moment after the page settles, not instantly.
  useEffect(() => {
    if (cloudDismissed || isOpen || shouldHide) {
      setCloudReady(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setCloudReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, [cloudDismissed, isOpen, shouldHide]);

  const dismissCloud = () => {
    setCloudDismissed(true);
    try {
      sessionStorage.setItem(CLOUD_DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it stays hidden until the next page load.
    }
  };

  // Auto-grow the composer up to ~4 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input, isPanelVisible]);

  const sendMessage = useCallback(async (text, attachments = []) => {
    const messageText = text.trim() || (attachments.length
      ? "Please identify this image and recommend relevant Unideals products."
      : "");
    if (!messageText || isTyping) return;

    const history = messages
      .filter((message) => message.text && !message.isWelcome && !message.isError)
      .slice(-8)
      .map((message) => ({ sender: message.sender, text: message.text }));

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        text: messageText,
        sender: "user",
        mediaPreview: attachments[0]?.preview || null,
      },
    ]);
    setInput("");
    setIsTyping(true);

    // Listings on screen, grouped by the reply that showed them, so a guest can
    // say "is the 2nd one negotiable?" (signed-in chats use the saved history).
    const shownProducts = messages
      .filter((message) => message.sender === "assistant" && message.products?.length)
      .slice(-3)
      .flatMap((message, group) =>
        message.products.slice(0, 6).map((product) => ({
          _id: product._id,
          title: product.title,
          selling_price: product.selling_price,
          group,
        })),
      );

    const replyId = nextId();
    const payload = {
      message: messageText,
      history,
      shownProducts,
      conversationId: conversationId || undefined,
      attachments: attachments.map((attachment) => {
        const item = { ...attachment };
        delete item.preview;
        return item;
      }),
    };
    // Streamed text shows up in the reply bubble as it's written.
    const onText = (textSoFar) => {
      setStreamingId(replyId);
      setMessages((prev) => {
        const index = prev.findIndex((item) => item.id === replyId);
        if (index === -1) return [...prev, { id: replyId, text: textSoFar, sender: "assistant", isStreaming: true }];
        const next = prev.slice();
        next[index] = { ...next[index], text: textSoFar };
        return next;
      });
    };

    try {
      let data;
      try {
        data = await sendAssistantMessage(payload, { onText });
      } catch (error) {
        // The saved chat expired or was deleted elsewhere: start a new one.
        if (error.response?.status !== 404 || !payload.conversationId) throw error;
        setConversation(null);
        data = await sendAssistantMessage({ ...payload, conversationId: undefined }, { onText });
      }
      if (data.conversationId && userId) setConversation({ id: data.conversationId, userId });

      setMessages((prev) => {
        const final = toAssistantMessage(data, replyId);
        const index = prev.findIndex((item) => item.id === replyId);
        if (index === -1) return [...prev, final];
        const next = prev.slice();
        next[index] = final;
        return next;
      });
    } catch (error) {
      const status = error.response?.status;
      setMessages((prev) => [
        ...prev.filter((item) => item.id !== replyId),
        {
          id: nextId(),
          text:
            status === 429
              ? "You're sending messages quickly. Give it a minute and try again."
              : error.response?.data?.message || "I couldn't reach the assistant right now. Check your connection and try again.",
          sender: "assistant",
          isError: true,
          retryText: attachments.length ? null : messageText,
        },
      ]);
    } finally {
      setIsTyping(false);
      setStreamingId(null);
    }
  }, [isTyping, messages, conversationId, userId]);

  const rateReply = useCallback(async (message, value) => {
    if (!conversationId || !message.serverId) return;
    const previous = message.feedback || null;
    const setFeedback = (feedback) =>
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, feedback } : item)));
    setFeedback(value);
    try {
      await rateAssistantReply(conversationId, message.serverId, value);
    } catch {
      setFeedback(previous);
    }
  }, [conversationId]);

  const openSavedChat = useCallback(async (id) => {
    try {
      const chat = await getAssistantChat(id);
      setMessages([
        initialMessage,
        ...chat.messages.map((item) =>
          item.sender === "assistant"
            ? toAssistantMessage(item, item.id)
            : { id: item.id, text: item.text, sender: "user", hadMedia: item.hadMedia },
        ),
      ]);
      setConversation({ id: chat.id, userId });
      setHistoryOpen(false);
    } catch {
      setHistoryOpen(false);
      pushAssistantNote("I couldn't open that chat. It may have expired.");
    }
  }, [pushAssistantNote, userId]);

  const retryMessage = (message) => {
    if (!message.retryText || isTyping) return;
    setMessages((prev) => {
      // Drop the failed exchange so the retry doesn't duplicate it.
      const index = prev.findIndex((item) => item.id === message.id);
      if (index < 1) return prev;
      return prev.slice(0, index - 1).concat(prev.slice(index + 1));
    });
    window.setTimeout(() => sendMessage(message.retryText), 0);
  };

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (event.detail?.message) {
        sendMessage(event.detail.message);
      }
    };

    window.addEventListener("open-unideals-assistant", handleOpenAssistant);
    return () => {
      window.removeEventListener("open-unideals-assistant", handleOpenAssistant);
    };
  }, [sendMessage]);

  const imageToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image processing is unavailable in this browser."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setCameraMenuOpen(false);
    if (!file) return;

    try {
      const data = await imageToDataUrl(file);
      setMediaPreview({ data, mimeType: "image/jpeg", preview: data });
      inputRef.current?.focus();
    } catch (error) {
      console.warn("[Assistant] Image could not be prepared:", error);
      pushAssistantNote("I could not read that image. Please try another photo.");
    }
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  useEffect(() => {
    if (isOpen && !isMinimized) return;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
    setCameraMenuOpen(false);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    window.clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
  }, [isOpen, isMinimized]);

  const openCamera = async () => {
    setCameraMenuOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!assistantVisibleRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        const video = cameraVideoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch((error) => {
            console.warn("[Assistant] Camera preview could not start:", error);
            closeCamera();
            pushAssistantNote("The camera opened but its preview could not start. Upload a picture from your device instead.");
            cameraInputRef.current?.click();
          });
        }
      });
    } catch (error) {
      console.warn("[Assistant] Camera access failed:", error?.name || error);
      pushAssistantNote("Camera access was blocked. Allow camera permission or upload a picture from your device.");
      cameraInputRef.current?.click();
    }
  };

  const captureCameraImage = () => {
    const video = cameraVideoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      pushAssistantNote("I could not capture that photo. Please try uploading an image instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    closeCamera();
    setMediaPreview({ data, mimeType: "image/jpeg", preview: data });
  };

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    window.clearTimeout(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handleMicClick = async () => {
    if (isRecording) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      pushAssistantNote("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!assistantVisibleRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        window.clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          pushAssistantNote("No audio was captured. Please try recording again.");
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              sendMessage("Please transcribe this audio and search Unideals for what I said.", [{ mimeType: blob.type, data: reader.result }]);
            } else {
              pushAssistantNote("I could not read that recording. Please try again.");
            }
          };
          reader.onerror = () => pushAssistantNote("I could not read that recording. Please try again.");
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_VOICE_RECORDING_MS);
    } catch (error) {
      console.warn("[Assistant] Microphone access failed:", error?.name || error);
      pushAssistantNote("Microphone access was blocked. Allow microphone permission and try again.");
    }
  };

  const submitCurrent = () => {
    if (isTyping) return;
    if (!input.trim() && !mediaPreview) return;
    const attachment = mediaPreview;
    setMediaPreview(null);
    setCameraMenuOpen(false);
    sendMessage(input, attachment ? [attachment] : []);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitCurrent();
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitCurrent();
    }
  };

  const resetChat = () => {
    setMessages([initialMessage]);
    setConversation(null);
    setHistoryOpen(false);
    setInput("");
    setMediaPreview(null);
    setCameraMenuOpen(false);
  };

  const openPanel = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  // Close = end the chat (clears the conversation). Minimize keeps it.
  const endChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    resetChat();
  };

  const isMinimizedBar = isOpen && isMinimized;
  const lastPreview =
    [...messages].reverse().find((message) => message.text && !message.isWelcome)?.text?.replace(/[*_`#>]/g, "").trim() ||
    "Chat minimized";

  if (shouldHide) return null;

  const panelMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 24, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.97 },
      };

  return (
    <div className="fixed bottom-[calc(var(--tabbar-h,0px)+0.75rem)] right-3 z-[70] flex flex-col items-end font-figtree sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isPanelVisible && (
          <motion.section
            key="assistant-panel"
            role="dialog"
            aria-label="Unideals AI assistant"
            {...panelMotion}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{ transformOrigin: "bottom right" }}
            className="relative mb-3 flex h-[min(680px,calc(100dvh-var(--tabbar-h,0px)-6rem))] w-[calc(100vw-24px)] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-[#F8F9FC] shadow-[0_32px_80px_-24px_rgba(30,27,75,0.38),0_0_0_1px_rgba(30,27,75,0.03)] dark:border-zinc-800 dark:bg-[#111215]"
          >
            {/* Header */}
            <header className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#16181C]/90">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative h-10 w-10 shrink-0">
                  <MorphMark fontSize={24} className="h-10 w-10" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#16181C]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Unideals AI</h2>
                    <span className="rounded-md bg-gradient-to-r from-indigo-500 to-sky-500 px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-wider text-white">Beta</span>
                  </div>
                  <p className="truncate text-[11.5px] font-medium text-slate-500 dark:text-zinc-400">
                    {isTyping ? "Typing…" : "Your campus shopping buddy"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                {userId && (
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Recent chats"
                    title="Recent chats"
                  >
                    <History className="h-4 w-4" />
                  </button>
                )}
                {hasConversation && (
                  <button
                    type="button"
                    onClick={resetChat}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                    aria-label="Start a new chat"
                    title="New chat"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  aria-label="Minimize assistant"
                  title="Minimize (Esc)"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={endChat}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  aria-label="End chat and close assistant"
                  title="End chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div
              aria-live="polite"
              aria-relevant="additions text"
              className="no-scrollbar relative flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(120%_60%_at_50%_0%,rgba(99,102,241,.07),transparent_60%)] px-4 py-4 dark:bg-[radial-gradient(120%_60%_at_50%_0%,rgba(99,102,241,.12),transparent_60%)]"
            >
              {messages.map((message, index) => {
                if (message.isWelcome) {
                  return hasConversation ? null : (
                    <WelcomeHero key={message.id || "welcome"} name={firstName} onPick={(prompt) => sendMessage(prompt)} />
                  );
                }

                const isUser = message.sender === "user";
                const showSuggestions = !isUser && index === lastAssistantIndex && !isTyping && message.suggestions?.length;

                return (
                  <div key={message.id || `${message.sender}-${index}`} className={`animate-chat-in flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    {isUser ? (
                      <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-gradient-to-br from-indigo-600 to-blue-600 px-3.5 py-2.5 text-[14px] leading-relaxed text-white shadow-[0_8px_20px_-12px_rgba(67,56,202,.7)]">
                        {message.mediaPreview && (
                          <img src={message.mediaPreview} alt="Uploaded for the assistant" className="mb-2 max-h-40 rounded-xl object-cover" />
                        )}
                        {!message.mediaPreview && message.hadMedia && (
                          <span className="mb-1 flex items-center gap-1 text-[11px] text-white/75"><ImagePlus className="h-3 w-3" /> Attachment</span>
                        )}
                        <span className="whitespace-pre-line break-words">{message.text}</span>
                      </div>
                    ) : (
                      <div className="flex w-full items-start gap-2">
                        <BrandMark className="mt-0.5 h-7 w-7" />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`w-fit max-w-full rounded-[20px] rounded-tl-md px-3.5 py-2.5 text-[14px] leading-relaxed ${
                              message.isError
                                ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                                : "border border-slate-200/80 bg-white text-slate-700 shadow-[0_6px_20px_-16px_rgba(15,23,42,.35)] dark:border-zinc-800 dark:bg-[#1B1D22] dark:text-zinc-200"
                            }`}
                          >
                            <RichText text={message.text} />
                            {message.isError && message.retryText && (
                              <button
                                type="button"
                                onClick={() => retryMessage(message)}
                                disabled={isTyping}
                                className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50 dark:bg-zinc-900 dark:text-rose-300"
                              >
                                <RotateCw className="h-3 w-3" /> Try again
                              </button>
                            )}
                          </div>

                          {!!message.products?.length && (
                            <div className="no-scrollbar -mr-4 mt-2 flex snap-x gap-2 overflow-x-auto pb-1 pr-4">
                              {message.products.slice(0, 6).map((product) => (
                                <ProductCard key={product._id || `${product.title}-${product.category}`} product={product} />
                              ))}
                              {message.searchQuery && <SeeAllCard query={message.searchQuery} />}
                            </div>
                          )}

                          {message.estimate && <PriceEstimateCard estimate={message.estimate} />}
                          {message.comparison && <ComparisonCard comparison={message.comparison} />}
                          {message.draft && <ListingDraftCard draft={message.draft} />}
                          {message.checklist && <ChecklistCard checklist={message.checklist} category={message.intent === "inspection" ? message.category : ""} />}
                          {message.bundle && <BudgetBundleCard bundle={message.bundle} />}
                          {message.safetyTips && <SafetyTipCard safetyTips={message.safetyTips} />}

                          {message.route && !message.draft && (
                            <Link
                              to={message.route}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(79,70,229,.8)] transition hover:bg-indigo-700"
                            >
                              {message.routeLabel || "Open page"} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}

                          {!message.isError && !message.isStreaming && message.text && (
                            <AssistantMessageActions
                              text={message.text}
                              feedback={message.feedback}
                              canRate={Boolean(conversationId && message.serverId)}
                              onRate={(value) => rateReply(message, value)}
                            />
                          )}

                          {showSuggestions ? (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {message.suggestions.slice(0, 4).map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => sendMessage(suggestion)}
                                  className="rounded-full border border-indigo-200/70 bg-white px-3 py-1.5 text-[12px] font-medium text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && !streamingId && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="relative border-t border-slate-200/70 bg-white/90 px-3 pb-2.5 pt-2.5 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#16181C]/95">
              <AnimatePresence>
                {cameraMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-3 mb-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-[#1B1D22]"
                  >
                    <button type="button" onClick={() => uploadInputRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <ImagePlus className="h-4 w-4 text-indigo-500" /> Upload a photo
                    </button>
                    <button type="button" onClick={openCamera} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      <Camera className="h-4 w-4 text-indigo-500" /> Take a picture
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {mediaPreview && (
                <div className="mb-2 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-2 text-[12px] text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                  <img src={mediaPreview.preview} alt="Selected upload" className="h-10 w-10 rounded-xl object-cover" />
                  <span className="flex-1">I&apos;ll find listings matching this photo</span>
                  <button type="button" onClick={() => setMediaPreview(null)} className="flex h-6 w-6 items-center justify-center rounded-full text-indigo-600 hover:bg-white dark:text-indigo-300 dark:hover:bg-zinc-900" aria-label="Remove selected image">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="mb-2 flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                  Listening… tap stop when you&apos;re done (max 60s)
                </div>
              )}

              <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />

              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-1 rounded-[22px] border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-[#1B1D22] dark:focus-within:border-indigo-500/40"
              >
                <button
                  type="button"
                  aria-label="Search with a photo"
                  title="Search with a photo"
                  aria-expanded={cameraMenuOpen}
                  onClick={() => setCameraMenuOpen((open) => !open)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${cameraMenuOpen ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"}`}
                >
                  <Camera className="h-[18px] w-[18px]" />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={mediaPreview ? "Add a note (optional)…" : "Search or ask anything…"}
                  maxLength={2000}
                  aria-label="Message the assistant"
                  className="no-scrollbar min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-[14px] leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  aria-label={isRecording ? "Stop recording" : "Search by voice"}
                  title={isRecording ? "Stop recording" : "Search by voice"}
                  onClick={handleMicClick}
                  disabled={isTyping}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${isRecording ? "bg-rose-500 text-white" : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"}`}
                >
                  {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
                <button
                  type="submit"
                  disabled={(!input.trim() && !mediaPreview) || isTyping}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,.8)] transition hover:brightness-110 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-zinc-700 dark:disabled:to-zinc-700"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </button>
              </form>
              <p className="mt-1.5 text-center text-[10.5px] text-slate-400 dark:text-zinc-500">
                AI can make mistakes. Always inspect items before you pay.
              </p>
            </div>

            {historyOpen && userId && (
              <AssistantHistoryPanel
                activeId={conversationId}
                onOpen={openSavedChat}
                onClose={() => setHistoryOpen(false)}
                onDeleted={(ids) => {
                  if (conversationId && ids.includes(conversationId)) setConversation(null);
                }}
              />
            )}

            {cameraOpen && (
              <div role="dialog" aria-modal="true" aria-label="Take a picture" className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-3 shadow-2xl dark:bg-[#1B1D22]">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Take a picture</h3>
                    <button type="button" onClick={closeCamera} aria-label="Close camera" className="text-sm font-semibold text-rose-600">Cancel</button>
                  </div>
                  <video ref={cameraVideoRef} muted playsInline onCanPlay={() => setCameraReady(true)} aria-label="Camera preview" className="aspect-[4/3] w-full rounded-2xl bg-black object-cover" />
                  <button type="button" onClick={captureCameraImage} disabled={!cameraReady} className="mt-3 w-full rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                    Capture and use photo
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Minimized bar — conversation kept, one tap to resume */}
      <AnimatePresence>
        {isMinimizedBar && (
          <motion.div
            key="assistant-minimized"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "bottom right" }}
            className="flex w-[min(320px,calc(100vw-24px))] items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_18px_40px_-18px_rgba(30,27,75,0.35)] backdrop-blur-xl dark:border-zinc-800 dark:bg-[#16181C]/95"
          >
            <button
              type="button"
              onClick={openPanel}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
              aria-label="Restore Unideals AI assistant"
            >
              <span className="relative">
                <BrandMark className="h-9 w-9" />
                {isTyping && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#4A4DFE] dark:border-[#16181C]" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">Unideals AI</span>
                <span className="block truncate text-[11.5px] text-slate-500 dark:text-zinc-400">
                  {isTyping ? "Typing…" : lastPreview}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={openPanel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label="Expand assistant"
              title="Expand"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={endChat}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              aria-label="End chat and close assistant"
              title="End chat"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher — the Unideals logo mark, morphing into the "U" on hover
          and briefly every few seconds (same morph as the navbar wordmark) */}
      {!isOpen && (
        <div className="group relative flex items-center">
          <AnimatePresence>
            {cloudReady && (
              <ThoughtCloud
                key={hasConversation ? "continue" : "intro"}
                lines={
                  hasConversation
                    ? ["Continue our chat? 💬"]
                    : [
                        firstName ? `Hi ${firstName}! 👋` : "Hi there! 👋",
                        "Looking for a deal? 🔍",
                        "Need a fair price check?",
                        "Selling something? 🏷️",
                        "Ask me anything ✨",
                      ]
                }
                reducedMotion={Boolean(prefersReducedMotion)}
                onOpen={openPanel}
                onDismiss={dismissCloud}
              />
            )}
          </AnimatePresence>
          {!cloudReady && (
            <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block sm:translate-x-1 dark:bg-white dark:text-slate-900">
              {hasConversation ? "Continue chat" : "Ask Unideals AI"}
            </span>
          )}
          <motion.button
            type="button"
            onClick={openPanel}
            onMouseEnter={() => setLauncherHover(true)}
            onMouseLeave={() => setLauncherHover(false)}
            onFocus={() => setLauncherHover(true)}
            onBlur={() => setLauncherHover(false)}
            initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-[0_12px_32px_-10px_rgba(74,77,254,0.45)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4A4DFE]/30 dark:border-zinc-700 dark:bg-[#16181C]"
            aria-label={hasConversation ? "Continue chat with Unideals AI" : "Open Unideals AI assistant"}
          >
            {/* soft brand halo */}
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#4A4DFE]/25 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] motion-reduce:animate-none" />
            <Wordmark
              markOnly
              active={!(launcherHover || launcherPulse)}
              fontSize={30}
              fontWeight={800}
              letterSpacing={0}
              className="text-[#0F172A] dark:text-white"
            />
            {hasConversation && (
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#4A4DFE] dark:border-[#16181C]" aria-hidden="true" />
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default FloatingAssistant;
