import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { refreshChatUnread } from "../../../services/chatUnread.js";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Crown,
  ExternalLink,
  Flag,
  Lock,
  MessagesSquare,
  MoreVertical,
  Search,
  Send,
  ShieldAlert,
  Timer,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import axios from "../../../services/axiosInstance";
import { useUser } from "../../../context/useUserContext.jsx";
import ConversationCard from "../components/ConversationCard.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import DealProgress from "../components/DealProgress.jsx";
import ReportUserModal from "../components/ReportUserModal.jsx";
import { useChatSocket } from "../hooks/useChatSocket.js";
import { dealStatusBadge } from "../utils/dealStage.js";
import { chatSettingsOf, wallpaperById } from "../utils/wallpapers.js";
import { formatName } from "../utils/display.js";
import Profile_left_part from "../../user/components/Profile_left_part.jsx";
import { useAppScreen } from "../../../components/layout/MobileAppBar.jsx";
import { productPath } from "../../../utils/productPath.js";
import * as chatApi from "../services/chatApi.js";

const QUICK_CHIPS = [
  "Yes",
  "No",
  "Let me check",
  "Sounds good",
  "Can we negotiate?",
  "When can we meet?",
];

// Header badge shares mapping with the orders page (dealStage.js) —
// negotiating shows no badge, everything else mirrors orders exactly.
const statusBadge = (status) => {
  if (!status || status === "negotiating") return null;
  return dealStatusBadge(status);
};

// Upsert merge for the thread poll: appends new bubbles and applies tick
// upgrades (sent -> delivered -> read) onto rendered messages, oldest first.
// Returns the previous array untouched when nothing changed (no re-render).
const mergeThreadMessages = (prev, incoming) => {
  if (!incoming?.length) return prev;
  const map = new Map(prev.map((m) => [String(m._id), m]));
  let changed = false;
  for (const m of incoming) {
    const k = String(m._id);
    const ex = map.get(k);
    if (!ex) {
      map.set(k, m);
      changed = true;
    } else if (
      ex.message_status !== m.message_status ||
      ex.text !== m.text ||
      ex.message_type !== m.message_type ||
      JSON.stringify(ex.reply || null) !== JSON.stringify(m.reply || null)
    ) {
      map.set(k, { ...ex, ...m });
      changed = true;
    }
  }
  if (!changed) return prev;
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
};

// WhatsApp-style day stickers: Today / Yesterday / locale date.
const dayKey = (iso) => {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return "";
  }
};

const dayLabel = (iso) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOf = (x) => {
      const c = new Date(x);
      c.setHours(0, 0, 0, 0);
      return c.getTime();
    };
    const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const ChatPanel = ({ embedded = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userDetails } = useUser();
  const me = userDetails?._id ? String(userDetails._id) : null;
  // Chat preferences live here (top) so every callback below can read them
  // without hitting temporal-dead-zone errors.
  const chatSettings = chatSettingsOf(userDetails);
  const receiptsOn = chatSettings.read_receipts !== false;
  const typingOn = chatSettings.typing_indicators !== false;

  const deepProduct = searchParams.get("product") || "";
  const deepConversation = searchParams.get("conversation") || "";

  const [tab, setTab] = useState("all"); // all | buying | selling
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deal, setDeal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [actingOffer, setActingOffer] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  // Deal card starts open; collapsing gives the thread more room.
  const [dealOpen, setDealOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const threadScrollRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeout = useRef(null);
  const sidebarRef = useRef(null);
  // Draggable list width (desktop only), clamped 280–560px and persisted.
  const [sideW, setSideW] = useState(() => {
    try {
      const v = Number(localStorage.getItem("unideals-chat-sidew"));
      return v >= 280 && v <= 560 ? Math.round(v) : null;
    } catch {
      return null;
    }
  });

  const resetSideW = useCallback(() => {
    try {
      localStorage.removeItem("unideals-chat-sidew");
    } catch {
      // ignore
    }
    if (sidebarRef.current) {
      sidebarRef.current.style.width = "";
      sidebarRef.current.style.flex = "";
    }
    setSideW(null);
  }, []);

  const onDividerDown = useCallback((e) => {
    const pane = sidebarRef.current;
    if (!pane) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = pane.getBoundingClientRect().width;
    const move = (ev) => {
      const w = Math.min(560, Math.max(280, startW + ev.clientX - startX));
      pane.style.width = `${w}px`;
      pane.style.flex = "0 0 auto";
    };
    const up = (ev) => {
      const w = Math.round(
        Math.min(560, Math.max(280, startW + ev.clientX - startX)),
      );
      try {
        localStorage.setItem("unideals-chat-sidew", String(w));
      } catch {
        // ignore
      }
      setSideW(w);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, []);
  // True while the user sits at the thread bottom, new bubbles auto-scroll
  // only then (reading history never gets yanked, WhatsApp behaviour).
  const nearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [socketLive, setSocketLive] = useState(true);
  const [peerOnlineIds, setPeerOnlineIds] = useState([]);
  // Cooldown after repeated flagged messages: server is the source of truth
  // (429 CHAT_COOLDOWN), this just renders the countdown + locks the bar.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const cooldownMsLeft = Math.max(0, cooldownUntil - cooldownNow);
  const coolingDown = cooldownMsLeft > 0;

  useEffect(() => {
    if (!coolingDown) return undefined;
    const t = setInterval(() => setCooldownNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [coolingDown]);

  const fmtCooldown = (ms) => {
    const s = Math.max(1, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const offerPopupRef = useRef(null);
  const rupeeBtnRef = useRef(null);

  // Make-an-Offer closes on outside tap or Escape (button toggle excluded).
  useEffect(() => {
    if (!offerOpen) return undefined;
    const onDown = (e) => {
      if (
        offerPopupRef.current &&
        !offerPopupRef.current.contains(e.target) &&
        rupeeBtnRef.current &&
        !rupeeBtnRef.current.contains(e.target)
      ) {
        setOfferOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOfferOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [offerOpen]);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;
  // Abort in-flight thread loads when the user switches chats fast.
  const threadAbortRef = useRef(null);
  // Double-tap guard for the send button (busy covers deal actions).
  const sendingRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Derived early: callbacks below capture it in deps, so it must be
  // initialized before the first useCallback that references it.
  const otherName = formatName(detail?.otherParty?.name);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
    nearBottomRef.current = true;
    setShowJump(false);
    setPendingCount(0);
  }, []);

  const dayScanRef = useRef(false);
  const lastScanRef = useRef(0);
  const [stickyDay, setStickyDay] = useState("");
  // True while the matching in-flow day sticker is itself on screen, the
  // floating pill hides then (WhatsApp behaviour) to avoid doubling.
  const [stickyHidden, setStickyHidden] = useState(true);
  const stickyHiddenRef = useRef(true);

  const handleThreadScroll = useCallback(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = gap < 120;
    nearBottomRef.current = near;
    // Functional updates bail out when unchanged, so fast scrolls don't
    // re-render the whole thread on every event.
    setShowJump((prev) => (prev === !near ? prev : !near));
    if (near) setPendingCount((prev) => (prev === 0 ? prev : 0));
    // Sticky day pill: throttled scan (~6fps) with a hysteresis deadband,
    // so the pill never flutters at section boundaries mid-scroll.
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastScanRef.current < 150 || dayScanRef.current) return;
    lastScanRef.current = now;
    dayScanRef.current = true;
    requestAnimationFrame(() => {
      dayScanRef.current = false;
      const box = threadScrollRef.current;
      if (!box) return;
      const top = box.getBoundingClientRect().top;
      const line = top + 72;
      let current = "";
      const hidden = stickyHiddenRef.current;
      const zone = top + (hidden ? 96 : 56);
      let inZone = false;
      box.querySelectorAll("[data-daylabel]").forEach((n) => {
        const r = n.getBoundingClientRect();
        const label = n.getAttribute("data-daylabel") || "";
        if (r.top <= line && label) current = label;
        if (label && r.top >= top - 4 && r.top <= zone) inZone = true;
      });
      setStickyDay((prev) => (prev === current ? prev : current));
      if (inZone !== hidden) {
        stickyHiddenRef.current = inZone;
        setStickyHidden(inZone);
      }
    });
  }, []);

  // ---- list ----
  const listAbortRef = useRef(null);
  const loadList = useCallback(
    async (silent = false) => {
      if (!silent) setListLoading(true);
      // Abort the previous list request: rapid typing (debounced search)
      // must never let a stale response overwrite the newest one.
      listAbortRef.current?.abort();
      const ctrl = new AbortController();
      listAbortRef.current = ctrl;
      try {
        const rows = await chatApi.fetchConversations({
          role: tab,
          search: debouncedSearch,
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        setConversations(rows);
      } catch (err) {
        if (ctrl.signal.aborted || err?.code === "ERR_CANCELED") return;
        if (!silent) {
          toast.error(err?.response?.data?.message || "Could not load chats");
        }
      } finally {
        if (listAbortRef.current === ctrl) setListLoading(false);
      }
    },
    [tab, debouncedSearch],
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Poll the list as a safety net only. While the socket is live it already
  // pushes new chats / unread, so polling backs off 12s → 60s (5x fewer
  // conversation-list DB queries per open chat tab). Hidden tabs never poll.
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) loadList(true);
    }, socketLive ? 60000 : 12000);
    const onFocus = () => loadList(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadList, socketLive]);

  // Mobile: an open thread goes full-screen (global header + tab bar step
  // aside via html[data-chat-thread], see index.css).
  useEffect(() => {
    if (embedded === false) return undefined;
    const root = document.documentElement;
    if (selectedId) root.setAttribute("data-chat-thread", "");
    else root.removeAttribute("data-chat-thread");
    return () => root.removeAttribute("data-chat-thread");
  }, [selectedId, embedded]);

  // Opening a thread marks it read server-side → refresh the shared header
  // badge once (debounced) instead of waiting for its next poll.
  useEffect(() => {
    if (!selectedId) return undefined;
    const t = setTimeout(() => refreshChatUnread({ force: true }), 1200);
    return () => clearTimeout(t);
  }, [selectedId]);

  // Socket came back after a drop → catch up immediately (anything missed
  // while offline), instead of waiting for the next slow poll tick.
  const wasLiveRef = useRef(true);
  useEffect(() => {
    if (socketLive && !wasLiveRef.current) {
      loadList(true);
      if (selectedId) {
        chatApi
          .fetchMessages(selectedId, { limit: 50 })
          .then((m) => setMessages((prev) => mergeThreadMessages(prev, m.messages)))
          .catch(() => {});
      }
    }
    wasLiveRef.current = socketLive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketLive]);

  // ---- deep link ?conversation=... (from orders) or ?product=... ----
  useEffect(() => {
    if ((!deepProduct && !deepConversation) || !me) return;
    if (deepConversation) {
      // Direct conversation select, same Deal the orders page shows.
      setSelectedId(String(deepConversation));
      setSearchParams({}, { replace: true });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const conv = await chatApi.createConversation(deepProduct);
        if (cancelled || !conv?._id) return;
        setSelectedId(String(conv._id));
        loadList(true);
        // Clear query so refresh doesn't recreate.
        setSearchParams({}, { replace: true });
      } catch (err) {
        const code = err?.response?.data?.code;
        if (code === "GIRLS_ONLY_PRODUCT") {
          toast.error("This is a girls-only listing. Only girls can start this chat.");
        } else {
          toast.error(err?.response?.data?.message || "Could not open chat");
        }
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepProduct, deepConversation, me]);

  // ---- select conversation: detail + messages + mark read ----
  const selectConversation = useCallback(
    async (conv) => {
      const id = String(conv?._id || conv);
      if (!id) return;
      // Cancel any in-flight thread load from a fast chat switch.
      threadAbortRef.current?.abort();
      const ctrl = new AbortController();
      threadAbortRef.current = ctrl;
      const { signal } = ctrl;
      setSelectedId(id);
      // Instant paint from the list-row cache (header + deal stepper render
      // immediately); the full fetch below overwrites with live data.
      const cached =
        conv && typeof conv === "object" && (conv.product || conv.product_snapshot)
          ? conv
          : null;
      if (cached) {
        setDetail({
          _id: id,
          role: cached.role || "buying",
          otherParty: cached.otherParty || null,
          product_id: cached.product || null,
          product_snapshot: cached.product_snapshot || null,
        });
        setDeal(
          cached.dealStatus
            ? {
                status: cached.dealStatus,
                current_price:
                  cached.dealPrice ?? cached.product?.selling_price ?? 0,
              }
            : null,
        );
      } else {
        setDetail(null);
        setDeal(null);
      }
      setMessages([]);
      setHasMore(false);
      setOfferOpen(false);
      setReplyingTo(null);
      setHighlightId(null);
      setDealOpen(true);
      setThreadLoading(true);
      try {
        const [d, m] = await Promise.all([
          chatApi.fetchConversation(id, { signal }),
          chatApi.fetchMessages(id, { limit: 50, signal }),
        ]);
        if (signal.aborted) return;
        setDetail(d);
        setDeal(
          d?.deal ||
            (await chatApi.fetchDeal(id, { signal }).catch(() => null)),
        );
        setMessages(m.messages);
        setHasMore(m.hasMore);
        chatApi.markRead(id, { receipt: receiptsOn }).catch(() => {});
        loadList(true);
      } catch (err) {
        if (signal.aborted || err?.code === "ERR_CANCELED") return;
        toast.error(err?.response?.data?.message || "Could not open conversation");
      } finally {
        // Only clear if no newer select took over.
        if (threadAbortRef.current === ctrl) setThreadLoading(false);
      }
    },
    [loadList, receiptsOn],
  );

  // Deep links (?conversation= from orders, ?product= creation) only set the
  // id, load the thread (with list-cache instant paint) on demand.
  useEffect(() => {
    if (!selectedId || !me) return;
    if (detail && String(detail._id) === String(selectedId)) return;
    // A select is already fetching this thread, let it finish.
    if (threadAbortRef.current && !threadAbortRef.current.signal.aborted) return;
    const cached = conversations.find((c) => String(c._id) === String(selectedId));
    selectConversation(cached || selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, me]);

  // Poll the active thread: every 5s only when the socket is down (covers
  // gaps / offline); 30s while live, since messages, ticks and deal changes
  // arrive over the socket. Was 2 requests every 5s per open chat.
  useEffect(() => {
    if (!selectedId) return undefined;
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const m = await chatApi.fetchMessages(selectedId, { limit: 50 });
        // Upsert merge: appends new bubbles AND picks up tick upgrades
        // (sent -> delivered -> read) on messages we already render.
        setMessages((prev) => mergeThreadMessages(prev, m.messages));
        const d = await chatApi.fetchDeal(selectedId).catch(() => null);
        if (d) setDeal(d);
      } catch {
        // ignore
      }
    }, socketLive ? 30000 : 5000);
    return () => clearInterval(t);
  }, [selectedId, socketLive]);

  // Smart auto-scroll: follow live chat at the bottom, never yank history.
  const prevLenRef = useRef(0);
  const suppressCountRef = useRef(false);
  useEffect(() => {
    const grew = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    // History prepends (Load older) are not new arrivals, never count them.
    if (suppressCountRef.current) {
      suppressCountRef.current = false;
      return;
    }
    if (!messages.length || grew <= 0) return;
    const last = messages[messages.length - 1];
    const mine = me && String(last?.sender_id) === String(me);
    if (nearBottomRef.current || mine) {
      scrollToBottom();
    } else {
      setPendingCount((c) => c + grew);
    }
  }, [messages, me, scrollToBottom]);

  // Fresh thread selection always starts at the bottom.
  useEffect(() => {
    nearBottomRef.current = true;
    prevLenRef.current = 0;
    setShowJump(false);
    setPendingCount(0);
    setPeerOnlineIds([]);
    setPeerTyping(false);
    setStickyDay("");
    stickyHiddenRef.current = true;
    setStickyHidden(true);
  }, [selectedId]);

  // Seed the sticky day pill from the top of a freshly loaded thread.
  useEffect(() => {
    if (messages.length && !stickyDay) {
      setStickyDay(dayLabel(messages[0].createdAt));
    }
  }, [messages, stickyDay]);

  // ---- realtime ----
  const handleSocketMessage = useCallback(
    (msg) => {
      const cid = String(msg?.conversation_id || "");
      if (!cid) return;
      // Ignore our own socket echo, own sends render from the REST
      // response (optimistic temp -> saved replace). Rendering the echo too
      // is what duplicated every outgoing message.
      if (me && String(msg?.sender_id || "") === String(me)) return;
      if (cid === selectedIdRef.current) {
        setMessages((prev) => {
          if (prev.some((x) => String(x._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        chatApi.markRead(cid, { receipt: receiptsOn }).catch(() => {});
      } else {
        loadList(true);
      }
    },
    [loadList, me, receiptsOn],
  );

  const handleSocketDeal = useCallback(
    (d) => {
      if (!d) return;
      // Accept when ids match, or when showing the id-less instant-paint
      // partial (a broadcast landing mid-load must not be dropped).
      setDeal((prev) =>
        !prev?._id || String(prev._id) === String(d._id) ? d : prev,
      );
      loadList(true);
    },
    [loadList],
  );

  // Tick lifecycle, realtime:
  // - message:delivered -> our ✓ becomes grey ✓✓ (reached peer's device)
  // - message:read -> our ✓✓ turns blue, ONLY when readBy is the peer.
  //   Our own read receipts echo back to us too, those must be ignored,
  //   otherwise ticks flash blue the moment WE open the chat.
  const handleSocketDelivered = useCallback((info) => {
    const cid = String(info?.conversationId || "");
    if (!cid || cid !== selectedIdRef.current) return;
    const ids = new Set((info?.messageIds || []).map(String));
    if (!ids.size) return;
    setMessages((prev) =>
      prev.map((m) =>
        ids.has(String(m._id)) && m.message_status === "sent"
          ? { ...m, message_status: "delivered" }
          : m,
      ),
    );
  }, []);

  const handleSocketRead = useCallback(
    (info) => {
      const cid = String(info?.conversationId || "");
      if (!cid || cid !== selectedIdRef.current) return;
      // Ignore our own read echo, blue ticks mean the PEER read.
      if (me && String(info?.readBy || "") === String(me)) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.sender_id) === String(me) &&
          (m.message_status === "sent" || m.message_status === "delivered")
            ? { ...m, message_status: "read" }
            : m,
        ),
      );
    },
    [me],
  );

  const handleSocketTyping = useCallback((info) => {
    if (String(info?.conversationId || "") === selectedIdRef.current) {
      setPeerTyping(Boolean(info?.isTyping));
      clearTimeout(typingTimeout.current);
      if (info?.isTyping) {
        typingTimeout.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    }
  }, []);

  const handleSocketPresence = useCallback((info) => {
    const cid = String(info?.conversationId || "");
    if (!cid || cid !== selectedIdRef.current) return;
    setPeerOnlineIds((info?.onlineUserIds || []).map(String));
  }, []);

  const { sendTyping } = useChatSocket({
    conversationId: selectedId,
    onMessage: handleSocketMessage,
    onDeal: handleSocketDeal,
    onDelivered: handleSocketDelivered,
    onRead: handleSocketRead,
    onTyping: handleSocketTyping,
    onPresence: handleSocketPresence,
    onStatus: setSocketLive,
    onListUpdate: () => loadList(true),
    enabled: Boolean(me),
  });

  // ---- send text ----
  const handleSend = async (e, preset) => {
    e?.preventDefault();
    if (coolingDown) return;
    const text = String(preset ?? chatInput).trim();
    if (!text || !selectedId || busy || sendingRef.current) return;
    sendingRef.current = true;
    const quote = replyingTo;
    setChatInput("");
    sendTyping(false);
    // Optimistic bubble. `burst` marks a send boundary so this message
    // always gets full spacing after the previous one (typed text followed
    // by a quick chip never looks merged). Local quote preview included.
    const temp = {
      _id: `temp-${Date.now()}`,
      conversation_id: selectedId,
      sender_id: me,
      message_type: "text",
      text,
      message_status: "sent",
      createdAt: new Date().toISOString(),
      optimistic: true,
      burst: true,
      ...(quote
        ? {
            reply_to: quote._id,
            reply: {
              _id: quote._id,
              text: String(quote.text || "").slice(0, 200),
              sender_id: quote.senderId,
              sender_name: quote.senderName,
              message_type: quote.type,
            },
          }
        : {}),
    };
    setMessages((prev) => [...prev, temp]);
    try {
      const saved = await chatApi.sendMessage(selectedId, text, {
        replyTo: quote?._id || null,
      });
      setMessages((prev) =>
        prev.map((m) => (m._id === temp._id ? { ...saved, burst: true } : m)),
      );
      setReplyingTo(null);
      loadList(true);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      const cd = err?.response?.data;
      if (err?.response?.status === 429 && cd?.code === "CHAT_COOLDOWN") {
        setCooldownUntil(Date.now() + Number(cd.retryAfterMs || 0));
        setCooldownNow(Date.now());
        toast.error(cd.message || "Slow down. Try again in a bit.");
        return;
      }
      toast.error(err?.response?.data?.message || "Could not send message");
    } finally {
      sendingRef.current = false;
    }
  };

  // ---- offers ----
  const handleMakeOffer = async () => {
    const amt = Math.trunc(Number(offerAmount));
    if (!amt || amt < 1 || !selectedId) {
      toast.error("Enter a valid amount");
      return;
    }
    // Offer rule (mirrors backend): greater than 0 and strictly below the
    // selling price, checked here for instant feedback.
    const ceiling = Number(
      deal?.original_price ?? askingPrice ?? deal?.current_price ?? 0,
    );
    if (ceiling > 0 && amt >= ceiling) {
      toast.error(
        `Offer must be less than the selling price (₹${ceiling.toLocaleString("en-IN")})`,
      );
      return;
    }
    setBusy(true);
    try {
      const { deal: d, message } = await chatApi.makeOffer(selectedId, amt);
      setDeal(d);
      setMessages((prev) => [...prev, message]);
      setOfferAmount("");
      setOfferOpen(false);
      dismissHint();
      loadList(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send offer");
    } finally {
      setBusy(false);
    }
  };

  const respondOffer = async (msg, action) => {
    if (!selectedId || actingOffer) return;
    setActingOffer(true);
    try {
      const d = await chatApi.respondOffer(selectedId, String(msg._id), action);
      setDeal(d);
      // Merge, don't replace, loaded history above must survive deal events.
      const fresh = await chatApi.fetchMessages(selectedId, { limit: 50 });
      setMessages((prev) => mergeThreadMessages(prev, fresh.messages));
      loadList(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not respond to offer");
    } finally {
      setActingOffer(false);
    }
  };

  // ---- quote reply ----
  const startReply = useCallback(
    (msg) => {
      if (!msg || msg.message_type === "system" || msg.is_flagged) return;
      // Optimistic (unsent) bubbles have no server id yet — wait for send.
      if (String(msg._id || "").startsWith("temp-")) return;
      const mine = me && String(msg.sender_id) === String(me);
      setReplyingTo({
        _id: String(msg._id),
        text: String(msg.text || "").slice(0, 160),
        senderId: msg.sender_id,
        senderName: mine ? "You" : otherName,
        type: msg.message_type,
      });
    },
    [me, otherName],
  );

  const flashHighlight = useCallback((id) => {
    setHighlightId(String(id));
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600);
  }, []);

  useEffect(
    () => () => clearTimeout(highlightTimer.current),
    [],
  );

  // Jump to a quoted message, paging history in if it is not loaded yet.
  const jumpToMessage = useCallback(
    async (id) => {
      if (!id) return;
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById(`msg-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          flashHighlight(id);
          return;
        }
        const more = await loadOlderRef.current(true);
        if (!more) break;
      }
      toast("Couldn't find that message here");
    },
    [flashHighlight],
  );

  // ---- deal actions (seller / buyer) ----
  const runDealAction = async (fn, successMsg) => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const d = await fn();
      setDeal(d);
      // Merge, don't replace, loaded history above must survive deal events.
      const fresh = await chatApi.fetchMessages(selectedId, { limit: 50 });
      setMessages((prev) => mergeThreadMessages(prev, fresh.messages));
      loadList(true);
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportProductOpen, setReportProductOpen] = useState(false);
  const [reportProductBusy, setReportProductBusy] = useState(false);
  // Quote-reply draft + jump highlight.
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const highlightTimer = useRef(null);
  // First-time coachmark: points first-timers at the ₹ offer button.
  // Dismissed forever per conversation (persisted) once seen acted upon.
  const [hintClosed, setHintClosed] = useState(false);
  const hintKey = (id) => `unideals-offer-hint:${id}`;

  useEffect(() => {
    setHintClosed(false);
    if (!selectedId) return;
    try {
      if (localStorage.getItem(hintKey(selectedId)) === "1") {
        setHintClosed(true);
      }
    } catch {
      // ignore
    }
  }, [selectedId]);

  const dismissHint = useCallback(() => {
    setHintClosed(true);
    if (selectedIdRef.current) {
      try {
        localStorage.setItem(hintKey(selectedIdRef.current), "1");
      } catch {
        // ignore
      }
    }
  }, []);

  const handleReportSubmit = async (reason, description) => {
    const otherId = detail?.otherParty?._id;
    if (!otherId) return;
    setReportBusy(true);
    try {
      await axios.post(`/api/report/user/${otherId}`, {
        reason,
        description: `${description} (From chat conversation ${selectedId})`,
      });
      setReportOpen(false);
      toast.success("Report sent. Our team will check it out.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report");
    } finally {
      setReportBusy(false);
    }
  };

  const handleReportProductSubmit = async (reason, description) => {
    const prodId = product?._id || product?.id || detail?.product_id?._id || detail?.product?._id;
    if (!prodId) {
      toast.error("Could not find product to report");
      return;
    }
    setReportProductBusy(true);
    try {
      await axios.post(`/api/report/product/${prodId}`, {
        reason,
        description: `${description} (Reported from chat for: ${productTitle})`,
      });
      setReportProductOpen(false);
      toast.success("Product report submitted. Our team will review it.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report");
    } finally {
      setReportProductBusy(false);
    }
  };

  const loadOlder = async (silent = false) => {
    if (!selectedId || !hasMore || loadingMore || !messages.length) return false;
    // Oldest REAL id: optimistic temp-ids are never valid cursors (the server
    // would ignore them and re-send the newest page as "older" duplicates).
    const oldestReal = messages.find(
      (m) => typeof m._id === "string" && /^[0-9a-fA-F]{24}$/.test(m._id),
    )?._id;
    if (!oldestReal) return false;
    const el = threadScrollRef.current;
    const prevH = el?.scrollHeight ?? 0;
    const prevT = el?.scrollTop ?? 0;
    if (!silent) setLoadingMore(true);
    try {
      const m = await chatApi.fetchMessages(selectedId, {
        limit: 50,
        before: oldestReal,
      });
      suppressCountRef.current = true;
      setMessages((prev) => [...m.messages, ...prev]);
      setHasMore(m.hasMore);
      // Hold the viewport on the same bubble (double rAF = post-paint),
      // then refresh the sticky day for the new top section.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevH + prevT;
          handleThreadScroll();
        }),
      );
      return m.hasMore;
    } catch {
      // ignore
      return false;
    } finally {
      if (!silent) setLoadingMore(false);
    }
  };
  const loadOlderRef = useRef(null);
  loadOlderRef.current = loadOlder;

  // ---- derived ----
  // Pro circle sits above everything; Pro+ ranks above Pro inside it.
  const proConvs = useMemo(
    () =>
      conversations
        .filter((c) =>
          ["pro", "pro_plus"].includes(c?.otherParty?.subscription),
        )
        .sort((a, b) => {
          const rank = (s) => (s === "pro_plus" ? 0 : 1);
          return (
            rank(a?.otherParty?.subscription) - rank(b?.otherParty?.subscription)
          );
        }),
    [conversations],
  );
  const normalConvs = useMemo(
    () =>
      conversations.filter(
        (c) => !["pro", "pro_plus"].includes(c?.otherParty?.subscription),
      ),
    [conversations],
  );

  const product = detail?.product_id || detail?.product || {};
  const productTitle = product?.title || detail?.product_snapshot?.title || "Product";
  const productImg = product?.images?.[0]?.url || product?.images?.[0] || detail?.product_snapshot?.image || "/logo.svg";
  const headerPrice = product?.selling_price ?? detail?.product_snapshot?.selling_price ?? deal?.current_price ?? 0;
  const negotiable = product?.is_negotiable !== false;
  const badge = statusBadge(deal?.status);
  const role = detail?.role || "buying";
  const wallCls = wallpaperById(chatSettings.wallpaper).cls;
  const otherId = detail?.otherParty?._id
    ? String(detail.otherParty._id)
    : null;
  const peerOnline = Boolean(otherId && peerOnlineIds.includes(otherId));
  // Seller's listing pickup point (spot + area), prefilled into the
  // schedule form, editable there. Falls back to any scheduled value.
  const pickupSnap = product?.pickup_address_snapshot || {};
  const defaultPickup = [pickupSnap.address_line, pickupSnap.city]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ");
  // Asking vs agreed: header always shows the LIVE effective price so buyer
  // and seller can never disagree about what the number means.
  const askingPrice = Number(
    product?.selling_price ?? detail?.product_snapshot?.selling_price ?? 0,
  );
  const agreedPrice =
    deal &&
    deal.status !== "cancelled" &&
    Number(deal.current_price) !== askingPrice
      ? Number(deal.current_price)
      : null;
  const popupAsking = Number(
    deal?.original_price ?? askingPrice ?? deal?.current_price ?? 0,
  );
  const hasOffers = (deal?.offer_history?.length || 0) > 0;
  const showOfferHint = Boolean(
    selectedId &&
      deal &&
      negotiable &&
      !hasOffers &&
      !hintClosed &&
      !offerOpen &&
      !threadLoading,
  );

  // ---- UI-only state (search, filters, menus, composer) ----
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [matchIdx, setMatchIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadAnchor, setUnreadAnchor] = useState(null); // { id, count, resolved, dividerId }
  const menuRef = useRef(null);
  const composerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Phones: the inbox is a full-screen app view (site header hidden).
  useAppScreen();

  // Fresh thread: close search/menu, forget the old query.
  useEffect(() => {
    setSearchOpen(false);
    setThreadQuery("");
    setMatchIdx(0);
    setMenuOpen(false);
  }, [selectedId]);

  // Overflow menu: outside tap / Escape closes it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Composer grows with its content (up to ~5 lines), shrinks after send.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [chatInput, selectedId]);

  // "New messages" divider: placed once, above the first message that was
  // unread when the conversation was opened from the list.
  const openConversation = useCallback(
    (conv) => {
      setUnreadAnchor({ id: String(conv?._id || ""), count: conv?.unread || 0, resolved: false, dividerId: null });
      selectConversation(conv);
    },
    [selectConversation],
  );
  useEffect(() => {
    if (!unreadAnchor || unreadAnchor.resolved || threadLoading) return;
    if (unreadAnchor.id !== String(selectedId) || unreadAnchor.count <= 0 || messages.length === 0) return;
    const incoming = messages.filter((m) => me && String(m.sender_id) !== me && m.message_type !== "system");
    const target = incoming[incoming.length - unreadAnchor.count];
    setUnreadAnchor((a) => ({ ...a, resolved: true, dividerId: target?._id ? String(target._id) : null }));
  }, [unreadAnchor, threadLoading, selectedId, messages, me]);
  const dividerId = unreadAnchor?.id === String(selectedId) ? unreadAnchor?.dividerId : null;

  // In-thread search over loaded messages (newest match first).
  const q = threadQuery.trim();
  const matchIds = useMemo(() => {
    if (q.length < 2) return [];
    const needle = q.toLowerCase();
    return messages
      .filter((m) => m.message_type === "text" && !m.is_flagged && String(m.text || "").toLowerCase().includes(needle))
      .map((m) => String(m._id));
  }, [messages, q]);
  useEffect(() => {
    if (matchIds.length === 0) return;
    const idx = matchIds.length - 1;
    setMatchIdx(idx);
    jumpToMessage(matchIds[idx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const stepMatch = (dir) => {
    if (matchIds.length === 0) return;
    const next = (matchIdx + dir + matchIds.length) % matchIds.length;
    setMatchIdx(next);
    jumpToMessage(matchIds[next]);
  };

  const visibleProConvs = unreadOnly ? proConvs.filter((c) => (c.unread || 0) > 0) : proConvs;
  const visibleNormalConvs = unreadOnly ? normalConvs.filter((c) => (c.unread || 0) > 0) : normalConvs;
  const totalUnread = conversations.reduce((t, c) => t + (c.unread || 0), 0);
  const nothingToShow = visibleProConvs.length === 0 && visibleNormalConvs.length === 0;
  const charCount = chatInput.length;

  const iconBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white";

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 touch-manipulation flex-col overflow-hidden font-figtree text-slate-900 dark:text-zinc-100"
          : "fixed inset-0 flex flex-col overflow-hidden bg-[#F7F9FD] font-figtree text-slate-900 dark:bg-[#131313] dark:text-zinc-100"
      }
    >
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ── Inbox ── */}
        <div
          ref={sidebarRef}
          style={sideW ? { width: sideW, flex: "0 0 auto" } : undefined}
          className={`${
            selectedId ? "hidden lg:flex" : "flex"
          } min-h-0 w-full flex-col border-r border-neutral-200/80 bg-white lg:w-[340px] lg:flex-none xl:w-[360px] dark:border-neutral-800 dark:bg-[#16181B]`}
        >
          <div className="space-y-2.5 px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3.5">
            <div className="flex items-center justify-between">
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 lg:text-[17px] dark:text-white">
                <span className="lg:hidden">Chats</span>
                <span className="hidden lg:inline">Messages</span>
              </h1>
              {totalUnread > 0 && (
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--accent-text)]">
                  {totalUnread} unread
                </span>
              )}
            </div>
            <label className="flex h-10 items-center gap-2 rounded-lg bg-neutral-100 px-3 lg:h-9 dark:bg-white/5">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search chats"
                className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 lg:text-[13.5px] dark:text-zinc-100"
                placeholder="Search people or products"
              />
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {["all", "buying", "selling"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`h-8 shrink-0 rounded-full px-3 text-[13px] capitalize transition-colors lg:h-7 lg:text-[12.5px] ${
                    tab === t
                      ? "bg-slate-900 font-semibold text-white dark:bg-white dark:text-slate-900"
                      : "bg-neutral-100 font-medium text-slate-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                  }`}
                >
                  {t === "all" ? "All" : t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                aria-pressed={unreadOnly}
                className={`h-8 shrink-0 rounded-full px-3 text-[13px] transition-colors lg:h-7 lg:text-[12.5px] ${
                  unreadOnly
                    ? "bg-[var(--accent)] font-semibold text-white"
                    : "bg-neutral-100 font-medium text-slate-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
            {listLoading ? (
              <div className="space-y-1 px-1 pt-1" aria-label="Loading conversations">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 px-1.5 py-2">
                    <div className="browse-shimmer size-11 shrink-0 rounded-lg bg-neutral-100 lg:size-10 dark:bg-white/5" />
                    <div className="flex-1 space-y-1.5">
                      <div className="browse-shimmer h-3 w-2/3 rounded-full bg-neutral-100 dark:bg-white/5" />
                      <div className="browse-shimmer h-2.5 w-1/2 rounded-full bg-neutral-100 dark:bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <MessagesSquare className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-white">
                  {debouncedSearch ? "No matching chats" : "No conversations yet"}
                </p>
                <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
                  {debouncedSearch ? "Try another name or product." : "Open a listing and tap “Chat with seller” to start."}
                </p>
              </div>
            ) : nothingToShow ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">You&apos;re all caught up</p>
                <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">No unread conversations.</p>
                <button type="button" onClick={() => setUnreadOnly(false)} className="mt-3 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
                  Show all chats
                </button>
              </div>
            ) : (
              <>
                {visibleProConvs.length > 0 && (
                  <>
                    <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <Crown className="h-3 w-3" aria-hidden="true" />
                      Priority
                    </p>
                    {visibleProConvs.map((c) => (
                      <ConversationCard key={c._id} conv={c} selected={String(selectedId) === String(c._id)} onClick={openConversation} />
                    ))}
                    <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">All chats</p>
                  </>
                )}
                {visibleNormalConvs.map((c) => (
                  <ConversationCard key={c._id} conv={c} selected={String(selectedId) === String(c._id)} onClick={openConversation} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Resizable seam (desktop): drag 280–560px, double-click resets */}
        <div
          onPointerDown={onDividerDown}
          onDoubleClick={resetSideW}
          title="Drag to resize · double-click to reset"
          className="group z-10 -ml-1 hidden w-2 shrink-0 cursor-col-resize touch-none items-stretch justify-center lg:flex"
        >
          <div className="my-2 w-[3px] rounded-full bg-transparent transition-colors group-hover:bg-[var(--accent-ring)] group-active:bg-[var(--accent)]" />
        </div>

        {/* ── Thread ── */}
        <div
          key={selectedId || "none"}
          className={`${!selectedId ? "hidden lg:flex" : "flex"} animate-chat-in relative h-full min-h-0 min-w-0 flex-1 flex-col bg-[#F7F9FD] dark:bg-[#131313]`}
        >
          {selectedId ? (
            <>
              {/* Header */}
              <div className="z-20 border-b border-neutral-200/80 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:pt-0 dark:border-neutral-800 dark:bg-[#16181B]/95">
                <div className="flex h-14 items-center gap-2 px-1.5 lg:px-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 active:bg-neutral-100 lg:hidden dark:text-zinc-200 dark:active:bg-white/10"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <Link to={productPath(product?._id ? product : detail?.product_id || "")} className="shrink-0" title="View listing">
                    <img
                      src={typeof productImg === "string" ? productImg : "/logo.svg"}
                      alt={productTitle}
                      loading="lazy"
                      width={36}
                      height={36}
                      className="size-9 rounded-lg border border-black/5 bg-white object-cover dark:border-white/10"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">{productTitle}</p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[12px] leading-tight text-slate-500 dark:text-zinc-400">
                      {peerOnline && <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />}
                      <span className="truncate">
                        {otherName}
                        {peerOnline ? " · online" : peerTyping ? " · typing…" : ""}
                      </span>
                      <span className="shrink-0 font-semibold text-slate-700 lg:hidden dark:text-zinc-200">
                        · ₹{Number(agreedPrice ?? askingPrice ?? headerPrice ?? 0).toLocaleString("en-IN")}
                      </span>
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-baseline gap-1.5 pr-1 lg:flex">
                    <span className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-white">
                      ₹{Number(agreedPrice ?? askingPrice ?? headerPrice ?? 0).toLocaleString("en-IN")}
                    </span>
                    {agreedPrice != null && (
                      <span className="text-[12px] text-slate-400 line-through">₹{Number(askingPrice || 0).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                  {badge && <span className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline ${badge.cls}`}>{badge.label}</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen((v) => !v);
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    }}
                    aria-label="Search in conversation"
                    aria-pressed={searchOpen}
                    className={`${iconBtn} ${searchOpen ? "bg-neutral-100 text-slate-900 dark:bg-white/10 dark:text-white" : ""}`}
                  >
                    <Search className="h-[18px] w-[18px]" />
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="More options" aria-expanded={menuOpen} className={iconBtn}>
                      <MoreVertical className="h-[18px] w-[18px]" />
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-[#1A1D20]"
                      >
                        <Link
                          role="menuitem"
                          to={productPath(product?._id ? product : detail?.product_id || "")}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-slate-700 hover:bg-neutral-100 dark:text-zinc-200 dark:hover:bg-white/5"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" /> View listing
                        </Link>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setDealOpen((v) => !v);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-neutral-100 dark:text-zinc-200 dark:hover:bg-white/5"
                        >
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dealOpen ? "rotate-180" : ""}`} />
                          {dealOpen ? "Collapse deal card" : "Expand deal card"}
                        </button>
                        {deal && !["completed", "cancelled", "negotiating"].includes(deal.status) && (
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              if (!window.confirm("Cancel this deal? The item becomes available again.")) return;
                              runDealAction(() => chatApi.cancelDeal(selectedId, "Cancelled from chat"), "Deal cancelled");
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-neutral-100 dark:text-zinc-200 dark:hover:bg-white/5"
                          >
                            <XCircle className="h-4 w-4 text-slate-400" /> Cancel deal
                          </button>
                        )}
                        <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setReportProductOpen(true);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-neutral-100 dark:text-zinc-200 dark:hover:bg-white/5"
                        >
                          <Flag className="h-4 w-4 text-amber-500" /> Report listing
                        </button>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setReportOpen(true);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <ShieldAlert className="h-4 w-4" /> Report {otherName || "user"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* In-thread search */}
                {searchOpen && (
                  <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-2 lg:px-4 dark:border-neutral-800">
                    <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-neutral-100 px-3 dark:bg-white/5">
                      <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <input
                        ref={searchInputRef}
                        type="search"
                        value={threadQuery}
                        onChange={(e) => setThreadQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            stepMatch(e.shiftKey ? 1 : -1);
                          }
                          if (e.key === "Escape") setSearchOpen(false);
                        }}
                        placeholder="Search this conversation"
                        aria-label="Search this conversation"
                        className="w-full bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400 lg:text-[13.5px] dark:text-white"
                      />
                    </label>
                    <span className="w-14 shrink-0 text-center text-[12px] tabular-nums text-slate-500 dark:text-zinc-400" aria-live="polite">
                      {q.length >= 2 ? (matchIds.length ? `${matchIdx + 1}/${matchIds.length}` : "0/0") : ""}
                    </span>
                    <button type="button" onClick={() => stepMatch(-1)} disabled={!matchIds.length} aria-label="Previous match" className={`${iconBtn} disabled:opacity-40`}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => stepMatch(1)} disabled={!matchIds.length} aria-label="Next match" className={`${iconBtn} disabled:opacity-40`}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className={iconBtn}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {!socketLive && (
                  <p className="flex items-center justify-center gap-1.5 border-t border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <WifiOff size={13} /> Reconnecting… messages will sync automatically
                  </p>
                )}
              </div>

              {/* Deal card */}
              {deal && (
                <div className="px-3 pt-2.5 lg:px-6">
                  <div className="mx-auto max-w-3xl">
                    <DealProgress
                      deal={deal}
                      role={role}
                      defaultLocation={defaultPickup}
                      busy={busy}
                      open={dealOpen}
                      onToggle={() => setDealOpen((v) => !v)}
                      onConfirmDeal={(amt) => runDealAction(() => chatApi.confirmDeal(selectedId, amt), "Deal locked")}
                      onSchedulePickup={(d, loc) => runDealAction(() => chatApi.schedulePickup(selectedId, d, loc), "Pickup set")}
                      onPayment={() => runDealAction(() => chatApi.confirmPayment(selectedId), "Payment confirmed")}
                      onReceived={() => runDealAction(() => chatApi.confirmItemReceived(selectedId), "Done. Enjoy your buy.")}
                      onRevert={() => runDealAction(() => chatApi.revertDeal(selectedId), "Step undone")}
                    />
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={threadScrollRef} onScroll={handleThreadScroll} className={`flex-1 overflow-y-auto overscroll-contain px-3 py-4 lg:px-6 ${wallCls}`}>
                <div className="mx-auto max-w-3xl">
                  {!threadLoading && (
                    <div className="mb-3 flex justify-center">
                      <p className="flex max-w-sm items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-center text-[11.5px] text-slate-500 shadow-sm ring-1 ring-black/5 dark:bg-[#1A1D20] dark:text-zinc-400 dark:ring-white/5">
                        <Lock size={11} className="shrink-0" />
                        Safe campus chat. Abuse is flagged automatically.
                      </p>
                    </div>
                  )}
                  {messages.length > 0 && !threadLoading && (
                    <div
                      className={`pointer-events-none sticky top-1 z-10 flex justify-center transition-opacity duration-150 ${
                        stickyDay && !stickyHidden ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-slate-500 shadow-sm ring-1 ring-black/5 dark:bg-[#1A1D20] dark:text-zinc-400 dark:ring-white/5">
                        {stickyDay || dayLabel(messages[0]?.createdAt)}
                      </span>
                    </div>
                  )}
                  {threadLoading && messages.length === 0 ? (
                    <div className="space-y-3" aria-label="Loading messages">
                      <div className="browse-shimmer h-9 w-2/3 rounded-2xl bg-neutral-200/70 dark:bg-white/5" />
                      <div className="browse-shimmer ml-auto h-9 w-1/2 rounded-2xl bg-neutral-200/70 dark:bg-white/5" />
                      <div className="browse-shimmer h-9 w-3/5 rounded-2xl bg-neutral-200/70 dark:bg-white/5" />
                      <div className="browse-shimmer ml-auto h-9 w-2/5 rounded-2xl bg-neutral-200/70 dark:bg-white/5" />
                    </div>
                  ) : !threadLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
                        <Send size={20} />
                      </span>
                      <p className="mt-3 text-[14px] font-semibold text-slate-900 dark:text-white">Start the conversation</p>
                      <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">Say hi, ask a question or make an offer.</p>
                    </div>
                  ) : (
                    <>
                      {hasMore && (
                        <div className="mb-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() => loadOlder()}
                            disabled={loadingMore}
                            className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[var(--accent-text)] shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 disabled:opacity-60 dark:bg-[#1A1D20] dark:ring-white/5"
                          >
                            {loadingMore ? "Loading…" : "Load earlier messages"}
                          </button>
                        </div>
                      )}
                      {(() => {
                        // Day separators break sender runs; consecutive
                        // incoming text bubbles stack tight, the rest breathe.
                        const nodes = [];
                        let lastDay = "";
                        let prevGroup = null;
                        messages.forEach((m, i) => {
                          const key = dayKey(m.createdAt);
                          if (key && key !== lastDay) {
                            lastDay = key;
                            nodes.push({ t: "day", id: `day-${key}-${i}`, label: dayLabel(m.createdAt) });
                            prevGroup = null;
                          }
                          if (dividerId && String(m._id) === dividerId) {
                            nodes.push({ t: "new", id: `new-${m._id}` });
                            prevGroup = null;
                          }
                          const group = m.message_type === "text" ? `text:${String(m.sender_id)}` : `solo:${String(m._id)}`;
                          const mineRow = me && String(m.sender_id) === String(me);
                          const tight = prevGroup !== null && prevGroup === group && !m.burst && !mineRow;
                          const next = messages[i + 1];
                          const lastOfGroup = !(next && next.message_type === "text" && String(next.sender_id) === String(m.sender_id));
                          nodes.push({ t: "msg", m, tight, lastOfGroup });
                          prevGroup = group;
                        });
                        return nodes.map((n) =>
                          n.t === "day" ? (
                            <div key={n.id} data-daylabel={n.label} className="mt-4 flex justify-center first:mt-0">
                              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-slate-500 shadow-sm ring-1 ring-black/5 dark:bg-[#1A1D20] dark:text-zinc-400 dark:ring-white/5">
                                {n.label}
                              </span>
                            </div>
                          ) : n.t === "new" ? (
                            <div key={n.id} className="my-3 flex items-center gap-3" role="separator" aria-label="New messages">
                              <span className="h-px flex-1 bg-[var(--accent-ring)]" />
                              <span className="text-[11.5px] font-semibold text-[var(--accent-text)]">New messages</span>
                              <span className="h-px flex-1 bg-[var(--accent-ring)]" />
                            </div>
                          ) : (
                            <div
                              key={n.m._id}
                              id={`msg-${n.m._id}`}
                              className={`${n.tight ? "mt-0.5" : "mt-2.5 first:mt-0"} scroll-mt-20 rounded-2xl transition-shadow ${
                                highlightId && String(highlightId) === String(n.m._id) ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent" : ""
                              }`}
                            >
                              <MessageBubble
                                msg={n.m}
                                isMine={me ? String(n.m.sender_id) === String(me) : false}
                                myId={me}
                                deal={deal}
                                otherName={otherName}
                                acting={actingOffer}
                                isLastOfGroup={n.lastOfGroup}
                                query={searchOpen && q.length >= 2 ? q : ""}
                                onAccept={(msg) => respondOffer(msg, "accept")}
                                onDecline={(msg) => respondOffer(msg, "decline")}
                                onCounter={() => {
                                  dismissHint();
                                  setOfferOpen(true);
                                }}
                                onReply={(msg) => {
                                  startReply(msg);
                                  setTimeout(() => composerRef.current?.focus(), 0);
                                }}
                                onJumpTo={jumpToMessage}
                              />
                            </div>
                          ),
                        );
                      })()}
                      {peerTyping && (
                        <div className="mt-2.5 flex items-start" aria-label={`${otherName} is typing`}>
                          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-black/[0.04] dark:bg-[#1F2226] dark:ring-white/5">
                            <span className="sr-only">typing</span>
                            {[0, 1, 2].map((i) => (
                              <span key={i} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>

              {/* Jump to latest */}
              {showJump && (
                <button
                  type="button"
                  onClick={() => scrollToBottom()}
                  aria-label="Jump to latest messages"
                  className="absolute bottom-32 right-4 z-10 grid size-10 place-items-center rounded-full border border-neutral-200 bg-white text-slate-700 shadow-lg hover:text-[var(--accent-text)] lg:right-8 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200"
                >
                  <ChevronDown size={20} />
                  {pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </button>
              )}

              {/* Composer */}
              <div className="border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:border-0 lg:bg-transparent lg:px-6 lg:pb-4 lg:backdrop-blur-none dark:border-neutral-800 dark:bg-[#16181B]/95 lg:dark:bg-transparent">
                <div className="mx-auto max-w-3xl lg:rounded-2xl lg:border lg:border-neutral-200/80 lg:bg-white lg:shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] lg:dark:border-neutral-800 lg:dark:bg-[#1A1D20]">
                  {coolingDown && (
                    <p className="mx-3 mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
                      <Timer size={13} className="shrink-0" />
                      Take a breather. Sending unlocks in {fmtCooldown(cooldownMsLeft)}.
                    </p>
                  )}
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-1 pt-2.5">
                    {QUICK_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={coolingDown}
                        onClick={(e) => handleSend(e, chip)}
                        className="h-7 shrink-0 rounded-full border border-neutral-200 bg-white px-3 text-[12.5px] text-slate-600 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] disabled:opacity-40 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-300"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {replyingTo && (
                    <div className="mx-3 mt-1.5 flex items-stretch overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/5">
                      <span className="w-[3px] shrink-0 bg-[var(--accent)]" />
                      <div className="min-w-0 flex-1 px-2.5 py-1.5">
                        <p className="truncate text-[12px] font-semibold text-[var(--accent-text)]">Replying to {replyingTo.senderName}</p>
                        <p className="truncate text-[12px] text-slate-600 dark:text-zinc-300">{replyingTo.text}</p>
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="px-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <div className="relative px-2.5 pb-2.5 pt-1.5">
                    {showOfferHint && (
                      <div className="absolute bottom-full left-2.5 z-20 mb-1.5 flex items-center gap-1 rounded-full bg-slate-900 py-1 pl-3 pr-1 text-white shadow-xl dark:bg-white dark:text-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            dismissHint();
                            setOfferOpen(true);
                          }}
                          className="whitespace-nowrap text-[12px] font-semibold"
                        >
                          Tap ₹ to make an offer
                        </button>
                        <button type="button" onClick={dismissHint} aria-label="Dismiss offer hint" className="rounded-full p-1 hover:bg-white/15">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {offerOpen && (
                      <div
                        ref={offerPopupRef}
                        className="absolute bottom-full left-2.5 z-20 mb-2 w-[290px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1A1D20]"
                      >
                        {!negotiable && (
                          <p className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-[12px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                            <Ban size={13} className="mt-0.5 shrink-0" />
                            The seller isn&apos;t taking offers on this one. The price is fixed.
                          </p>
                        )}
                        <div className="px-3.5 pt-3">
                          <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Make an offer</p>
                          <p className="text-[12px] text-slate-500 dark:text-zinc-400">
                            Asking <span className="font-semibold text-slate-800 dark:text-zinc-100">₹{Number(popupAsking || 0).toLocaleString("en-IN")}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 p-3.5">
                          <label
                            className={`flex h-10 min-w-0 flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3 focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] ${
                              !negotiable ? "opacity-50" : ""
                            }`}
                          >
                            <span className="mr-1 font-semibold text-slate-400">₹</span>
                            <input
                              value={offerAmount}
                              onChange={(e) => setOfferAmount(e.target.value.replace(/[^0-9]/g, ""))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleMakeOffer();
                                }
                              }}
                              inputMode="numeric"
                              autoFocus={negotiable}
                              disabled={!negotiable}
                              aria-label="Offer amount"
                              placeholder="Your offer"
                              className="w-full bg-transparent text-[15px] font-semibold tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-white"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy || !negotiable}
                            onClick={handleMakeOffer}
                            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
                          >
                            Send offer
                          </button>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSend} className="flex items-end gap-1.5">
                      <button
                        ref={rupeeBtnRef}
                        type="button"
                        title="Make an offer"
                        aria-label="Make an offer"
                        onClick={() => {
                          // After confirmation the price is locked: say so
                          // instead of opening a dead popup.
                          if (deal && !["negotiating", "offer_accepted", "cancelled"].includes(deal.status || "negotiating")) {
                            toast("Final price is already locked for this deal");
                            return;
                          }
                          setOfferOpen((v) => !v);
                        }}
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[19px] font-semibold transition-colors ${
                          offerOpen
                            ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                            : "text-slate-600 hover:bg-neutral-100 hover:text-[var(--accent-text)] dark:text-zinc-300 dark:hover:bg-white/5"
                        }`}
                      >
                        ₹
                      </button>
                      <div className="flex min-w-0 flex-1 items-end rounded-[20px] bg-neutral-100 px-3.5 py-2 focus-within:ring-2 focus-within:ring-[var(--accent-ring)] dark:bg-white/5">
                        <textarea
                          ref={composerRef}
                          rows={1}
                          value={chatInput}
                          maxLength={2000}
                          onChange={(e) => {
                            setChatInput(e.target.value);
                            if (typingOn) {
                              sendTyping(true);
                              clearTimeout(typingTimeout.current);
                              typingTimeout.current = setTimeout(() => sendTyping(false), 1200);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Enter sends, Shift+Enter adds a line (desktop).
                            // On touch keyboards Enter inserts a newline.
                            const coarse = window.matchMedia?.("(pointer: coarse)").matches;
                            if (e.key === "Enter" && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              handleSend(e);
                            }
                            if (e.key === "Escape" && replyingTo) setReplyingTo(null);
                          }}
                          placeholder={coolingDown ? "Sending paused…" : "Message"}
                          aria-label="Type a message"
                          disabled={coolingDown}
                          onFocus={() => {
                            // Mobile keyboard pushes the layout; keep the
                            // latest messages visible once it settles.
                            setTimeout(() => {
                              if (nearBottomRef.current) scrollToBottom(false);
                            }, 350);
                          }}
                          className="max-h-[132px] min-h-[24px] w-full resize-none bg-transparent text-[16px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 lg:text-[14px] lg:leading-[22px] dark:text-zinc-100"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || coolingDown}
                        aria-label="Send message"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] disabled:bg-neutral-300 disabled:shadow-none dark:disabled:bg-neutral-700"
                      >
                        <Send size={17} className="-ml-0.5" />
                      </button>
                    </form>
                    <div className="mt-1.5 hidden items-center justify-between px-1 text-[11px] text-slate-400 lg:flex dark:text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Lock size={10} />
                        Never share OTPs or passwords.
                      </span>
                      <span className="tabular-nums">
                        {charCount > 1800 ? `${charCount}/2000 · ` : ""}
                        <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center lg:flex">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <MessagesSquare className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">Your messages</h2>
              <p className="max-w-xs text-[13px] text-slate-500 dark:text-zinc-400">
                Pick a conversation to read it, make an offer or set up a pickup.
              </p>
              <ul className="mt-2 space-y-1.5 text-left text-[12.5px] text-slate-500 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" /> Meet on campus and pay at pickup
                </li>
                <li className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400" /> Search any conversation from its header
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <ReportUserModal
        open={reportOpen}
        userName={otherName}
        targetType="user"
        submitting={reportBusy}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportSubmit}
      />
      <ReportUserModal
        open={reportProductOpen}
        title={productTitle}
        targetType="product"
        submitting={reportProductBusy}
        onClose={() => setReportProductOpen(false)}
        onSubmit={handleReportProductSubmit}
      />
    </div>
  );
};

/**
 * /chat route: chat lives inside the profile two-column layout (menu left,
 * thread right, same shell as My Orders), so it is one tap away from
 * everything else in the account. All existing deep links (?product=,
 * ?conversation=) keep working unchanged.
 */
const Chat = () => {
  return (
    <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD]">
      <div className="flex h-[calc(100vh-var(--header-h)-var(--tabbar-h))] h-[calc(100dvh-var(--header-h)-var(--tabbar-h))]">
        {/* LEFT: profile menu */}
        <div className="hidden shrink-0 md:block">
          <Profile_left_part />
        </div>

        {/* RIGHT: chat panel */}
        <div className="h-full flex-1 min-w-0 min-h-0 flex flex-col bg-[#F7F9FD] dark:bg-[#131313]">
          <ChatPanel embedded />
        </div>
      </div>
    </div>
  );
};

export default Chat;
