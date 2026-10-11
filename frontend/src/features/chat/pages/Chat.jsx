import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Ban, ChevronDown, ChevronLeft, Crown, Flag, Lock, Reply, Search, Send, ShieldAlert, Timer, WifiOff, X } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import axios from "../../../services/axiosInstance";
import { useUser } from "../../../context/useUserContext.jsx";
import ConversationCard from "../components/ConversationCard.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import DealProgress from "../components/DealProgress.jsx";
import ReportUserModal from "../components/ReportUserModal.jsx";
import { useChatSocket } from "../hooks/useChatSocket.js";
import { dealStatusBadge } from "../utils/dealStage.js";
import { INPUT_BASE, SELL_BTN } from "../utils/chatTheme.js";
import { chatSettingsOf, wallpaperById } from "../utils/wallpapers.js";
import { formatName } from "../utils/display.js";
import Profile_left_part from "../../user/components/Profile_left_part.jsx";
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

  // Poll list every 12s for new chats / unread (socket also pushes).
  // Skipped while the tab is hidden, sockets + focus refetch cover it.
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) loadList(true);
    }, 12000);
    const onFocus = () => loadList(true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadList]);

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
        toast.error(err?.response?.data?.message || "Could not open chat");
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

  // Poll active thread every 5s (covers socket gaps / offline).
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
    }, 5000);
    return () => clearInterval(t);
  }, [selectedId]);

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

  return (
    <div
      className={
        embedded
          ? "flex flex-col h-full min-h-0 text-zinc-900 dark:text-zinc-100 overflow-hidden font-figtree touch-manipulation"
          : "fixed inset-0 flex flex-col bg-[#F7F8FA] dark:bg-[#131313] text-zinc-900 dark:text-zinc-100 overflow-hidden font-figtree"
      }
    >
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* LEFT */}
        <div
          ref={sidebarRef}
          style={sideW ? { width: sideW, flex: "0 0 auto" } : undefined}
          className={`${
            selectedId ? "hidden lg:flex" : "flex"
          } w-full lg:flex-[0_0_33%] lg:min-w-[300px] lg:max-w-[440px] flex-col min-h-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#131313]`}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center bg-[#F1F3F6] dark:bg-[#1A1D20] rounded-lg px-3 py-1">
              <Search className="text-zinc-400 w-4 h-4 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search chats"
                className="w-full p-2 outline-none bg-transparent text-base sm:text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                placeholder="Search names or products..."
              />
            </div>
            <div className="flex gap-2">
              {["all", "buying", "selling"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] capitalize transition-all ${
                    tab === t
                      ? "bg-[#3838EC] text-white font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-[#1A1D20] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  {t === "all" ? "All" : t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4" ref={listRef}>
            {listLoading ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-400">Loading chats…</p>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">No conversations yet</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Open a product and tap “Chat with Seller” to start.
                </p>
              </div>
            ) : (
              <>
                {proConvs.length > 0 && (
                  <>
                    <div className="mx-1 mt-1 mb-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400/25 via-orange-400/15 to-amber-400/25 border border-amber-300/60 text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                      <Crown size={13} strokeWidth={2.5} />
                      <span className="flex-1">Pro circle · {proConvs.length}</span>
                    </div>
                    {proConvs.map((c) => (
                      <ConversationCard
                        key={c._id}
                        conv={c}
                        selected={String(selectedId) === String(c._id)}
                        onClick={selectConversation}
                      />
                    ))}
                  </>
                )}
                <div className="px-2 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {proConvs.length > 0 ? "Other conversations" : "Recent Conversations"}
                </div>
                {normalConvs.map((c) => (
                  <ConversationCard
                    key={c._id}
                    conv={c}
                    selected={String(selectedId) === String(c._id)}
                    onClick={selectConversation}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Draggable divider: hover the list/thread seam to resize (280–560px, double-click resets) */}
        <div
          onPointerDown={onDividerDown}
          onDoubleClick={resetSideW}
          title="Drag to resize · double-click to reset"
          className="hidden lg:flex w-2 -ml-1 mr-0 shrink-0 cursor-col-resize touch-none items-stretch justify-center group z-10"
        >
          <div className="w-[3px] rounded-full bg-transparent group-hover:bg-[#3838EC]/40 group-active:bg-[#3838EC]/60 transition-colors my-2" />
        </div>

        {/* RIGHT */}
        <div
          key={selectedId || "none"}
          className={`${
            !selectedId ? "hidden lg:flex" : "flex"
          } flex-1 flex-col h-full min-h-0 min-w-0 relative bg-[#F7F9FD] dark:bg-[#131313] animate-chat-in`}
        >
          {selectedId ? (
            <>
              {/* Reconnecting banner */}
              {!socketLive && (
                <div className="mx-3 sm:mx-6 lg:mx-12 xl:mx-20 mt-3 flex items-center justify-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                  <WifiOff size={14} /> Reconnecting… messages will sync automatically
                </div>
              )}

              {/* Product header card */}
              <div className="mx-3 sm:mx-6 lg:mx-12 xl:mx-20 mt-3 rounded-lg border border-zinc-200 bg-white dark:bg-[#1c1c1c] dark:border-zinc-800 px-3 py-2 min-h-[60px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                    className="lg:hidden p-1 hover:bg-zinc-100 rounded-full"
                  >
                    <ChevronLeft className="w-6 h-6 text-[#394ff1]" />
                  </button>
                  <img
                    src={typeof productImg === "string" ? productImg : "/logo.svg"}
                    alt={productTitle}
                    loading="lazy"
                    width={44}
                    height={44}
                    className="size-9 sm:size-11 rounded-lg object-cover border border-zinc-100 bg-white shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm sm:text-[15px] text-zinc-900 dark:text-white truncate leading-tight">
                      {productTitle}
                    </h2>
                    <p className="text-sm sm:text-[15px] font-bold text-[#3838EC] leading-tight">
                      ₹{Number(agreedPrice ?? askingPrice ?? headerPrice ?? 0).toLocaleString("en-IN")}
                      {agreedPrice != null && (
                        <span className="ml-1.5 text-xs font-semibold text-zinc-400 line-through">
                          ₹{Number(askingPrice || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {agreedPrice != null ? "Agreed price" : "Asking price"}
                      {peerOnline ? (
                        <span className="font-normal text-[13px] text-[#319F43]">
                          {" "}online
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {badge && (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  <button
                    onClick={() => setReportProductOpen(true)}
                    title="Report product / listing"
                    aria-label="Report product / listing"
                    className="p-1.5 sm:p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition shrink-0"
                  >
                    <Flag size={18} />
                  </button>
                  <button
                    onClick={() => setReportOpen(true)}
                    title="Report user"
                    aria-label="Report user"
                    className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition shrink-0"
                  >
                    <ShieldAlert size={18} />
                  </button>
                </div>
              </div>

              {/* Deal progress (both sides; actions gated by role+status) */}
              {deal && (
                <div className="mx-3 sm:mx-6 lg:mx-12 xl:mx-20 mt-2">
                <DealProgress
                  deal={deal}
                  role={role}
                  defaultLocation={defaultPickup}
                  busy={busy}
                  open={dealOpen}
                  onToggle={() => setDealOpen((v) => !v)}
                  onConfirmDeal={(amt) =>
                    runDealAction(() => chatApi.confirmDeal(selectedId, amt), "Deal locked")
                  }
                  onSchedulePickup={(d, loc) =>
                    runDealAction(() => chatApi.schedulePickup(selectedId, d, loc), "Pickup set")
                  }
                  onPayment={() =>
                    runDealAction(() => chatApi.confirmPayment(selectedId), "Payment confirmed")
                  }
                  onReceived={() =>
                    runDealAction(() => chatApi.confirmItemReceived(selectedId), "Done. Enjoy your buy.")
                  }
                />
                </div>
              )}

              {/* Messages */}
              <div
                ref={threadScrollRef}
                onScroll={handleThreadScroll}
                className={`flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 lg:px-12 xl:px-20 py-4 bg-[#F7F9FD] dark:bg-[#131313] ${wallCls}`}
              >
                {!threadLoading && (
                  <div className="flex justify-center">
                    <p className="flex max-w-md items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-center text-[12px] leading-5 text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200/90">
                      <Lock size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="font-bold">Safe campus chat.</span>{" "}
                        Messages are encrypted in transit and only visible
                        inside this chat. Abuse gets auto-flagged.
                      </span>
                    </p>
                  </div>
                )}
                {messages.length > 0 && !threadLoading && (
                  <div className={`sticky top-1 z-10 flex justify-center pointer-events-none transition-opacity duration-150 ${stickyDay && !stickyHidden ? "opacity-100" : "opacity-0"}`}>
                    <span className="text-[12.5px] uppercase font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#1c1c1c] px-3 py-[5px] rounded-lg shadow">
                      {stickyDay || dayLabel(messages[0]?.createdAt)}
                    </span>
                  </div>
                )}
                {threadLoading && messages.length === 0 ? (
                  <div className="space-y-3 animate-pulse" aria-label="Loading messages">
                    <div className="h-10 w-2/3 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-10 w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800 ml-auto" />
                    <div className="h-6 w-1/3 rounded-full bg-zinc-200 dark:bg-zinc-800 mx-auto" />
                    <div className="h-10 w-3/5 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                ) : !threadLoading && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <span className="size-12 rounded-full bg-[#3838EC]/10 text-[#3838EC] flex items-center justify-center">
                      <Send size={20} />
                    </span>
                    <p className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-100">
                      No messages yet
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Say hi and lock the deal.
                    </p>
                  </div>
                ) : (
                  <>
                {hasMore && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => loadOlder()}
                      disabled={loadingMore}
                      className={`${SELL_BTN} px-3 py-1.5 text-[11px]`}
                    >
                      {loadingMore ? "Loading…" : "Load older messages"}
                    </button>
                  </div>
                )}
                {(() => {
                  // Flat node stream: day separators break sender groups,
                  // consecutive same-sender text bubbles stack tight (2px)
                  // while everything else breathes (12px), WhatsApp rhythm.
                  const nodes = [];
                  let lastDay = "";
                  let prevGroup = null;
                  messages.forEach((m, i) => {
                    const key = dayKey(m.createdAt);
                    if (key && key !== lastDay) {
                      lastDay = key;
                      nodes.push({
                        t: "day",
                        id: `day-${key}-${i}`,
                        label: dayLabel(m.createdAt),
                      });
                      prevGroup = null;
                    }
                    const group =
                      m.message_type === "text"
                        ? `text:${String(m.sender_id)}`
                        : `solo:${String(m._id)}`;
                    // Breathing room: only incoming runs stack tight. Everything
                    // I send (typed or quick chip) gets the full gap, live
                    // and on reload alike, nothing ever looks merged.
                    const mineRow = me && String(m.sender_id) === String(me);
                    const tight =
                      prevGroup !== null &&
                      prevGroup === group &&
                      !m.burst &&
                      !mineRow;
                    const next = messages[i + 1];
                    const lastOfGroup = !(
                      next &&
                      next.message_type === "text" &&
                      String(next.sender_id) === String(m.sender_id)
                    );
                    nodes.push({ t: "msg", m, tight, lastOfGroup });
                    prevGroup = group;
                  });
                  return nodes.map((n) =>
                    n.t === "day" ? (
                      <div
                        key={n.id}
                        data-daylabel={n.label}
                        className="flex justify-center mt-3 first:mt-0"
                      >
                        <span className="text-[12.5px] uppercase font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#1c1c1c] px-3 py-[5px] rounded-lg shadow-sm">
                          {n.label}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={n.m._id}
                        id={`msg-${n.m._id}`}
                        className={`${n.tight ? "mt-1" : "mt-3 first:mt-0"} rounded-lg scroll-mt-4 transition-shadow ${
                          highlightId && String(highlightId) === String(n.m._id)
                            ? "ring-2 ring-[#3838EC] shadow-lg shadow-indigo-500/20"
                            : ""
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
                          onAccept={(msg) => respondOffer(msg, "accept")}
                          onDecline={(msg) => respondOffer(msg, "decline")}
                          onCounter={() => {
                            dismissHint();
                            setOfferOpen(true);
                          }}
                          onReply={startReply}
                          onJumpTo={jumpToMessage}
                        />
                      </div>
                    ),
                  );
                })()}
                {peerTyping && (
                  <div className="flex items-start mt-3" aria-label={`${otherName} is typing`}>
                    <div className="flex items-center gap-1.5 rounded-lg rounded-bl-none bg-white dark:bg-[#1c1c1c] border border-zinc-100 dark:border-zinc-800 px-4 py-3 shadow-sm">
                      <span className="sr-only">typing</span>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-2 rounded-full bg-[#3838EC] animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Jump to latest (shows when reading history + new arrivals) */}
              {showJump && (
                <button
                  onClick={() => scrollToBottom()}
                  aria-label="Jump to latest messages"
                  className="absolute right-4 bottom-36 z-10 size-10 rounded-full bg-white dark:bg-[#1c1c1c] shadow-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:text-[#3838EC]"
                >
                  <ChevronDown size={20} />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#3838EC] text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </button>
              )}

              {/* Floating bottom bar: quick chips + input in one blurred card */}
              <div className="mx-3 sm:mx-6 lg:mx-12 xl:mx-20 mb-[max(0.75rem,env(safe-area-inset-bottom))] rounded-2xl bg-white/90 dark:bg-[#1c1c1c]/90 backdrop-blur-md border border-white/70 dark:border-zinc-700/60 shadow-[0_14px_44px_-12px_rgba(56,56,236,0.35)]">
              {coolingDown && (
                <div className="mx-3 mt-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2">
                  <Timer size={14} className="text-red-500 shrink-0" />
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                    Take a breather. Sending unlocks in {fmtCooldown(cooldownMsLeft)}.
                  </p>
                </div>
              )}
              <div className="px-3 pt-2.5 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    disabled={coolingDown}
                    onClick={(e) => handleSend(e, chip)}
                    className="shrink-0 text-[13px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1c] text-zinc-700 dark:text-zinc-200 px-3.5 py-1.5 rounded-full hover:border-[#3838EC] hover:text-[#3838EC] disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Reply quote bar */}
              {replyingTo && (
                <div className="mx-3 mt-2 flex items-stretch gap-0 overflow-hidden rounded-lg bg-black/[0.05] dark:bg-white/10">
                  <span className="w-1 shrink-0 bg-[#3838EC]" />
                  <div className="min-w-0 flex-1 px-2.5 py-1.5">
                    <p className="text-[12px] font-semibold text-[#3838EC] dark:text-[#8FA2FF] truncate">
                      Replying to {replyingTo.senderName}
                    </p>
                    <p className="text-[12px] text-zinc-600 dark:text-zinc-300 truncate">
                      {replyingTo.text}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                    className="px-2.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input + offer */}
              <div className="px-3 pb-2.5 pt-1 relative">
                {showOfferHint && (
                  <div className="absolute left-2 bottom-full mb-2 z-20 flex items-center gap-1 rounded-full bg-zinc-900 text-white pl-3 pr-1.5 py-1.5 shadow-xl">
                    <button
                      onClick={() => {
                        dismissHint();
                        setOfferOpen(true);
                      }}
                      className="text-[11px] font-semibold whitespace-nowrap"
                    >
                      Tap ₹ to make an offer
                    </button>
                    <button
                      onClick={dismissHint}
                      aria-label="Dismiss offer hint"
                      className="p-1 rounded-full hover:bg-white/15"
                    >
                      <X size={12} />
                    </button>
                    <span className="absolute -bottom-[3px] left-7 size-2 rotate-45 bg-zinc-900" />
                  </div>
                )}
                {offerOpen && (
                  <div
                    ref={offerPopupRef}
                    className="absolute left-3 bottom-full mb-2 w-[280px] rounded-xl border border-indigo-100 bg-white shadow-2xl overflow-hidden z-20"
                  >
                    {!negotiable && (
                      <div className="flex items-start gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
                        <Ban size={14} className="text-amber-600 shrink-0 mt-px" />
                        <p className="text-[11px] font-semibold leading-5 text-amber-700">
                          Seller&apos;s not accepting offers on this one, the
                          price is fixed.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 px-4 pt-3.5">
                      <span className="size-9 rounded-full bg-[#3838EC]/10 text-[#3838EC] flex items-center justify-center text-lg font-black shrink-0">
                        ₹
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[15px] text-zinc-900 leading-tight">
                          Make an Offer
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Asking{" "}
                          <span className="font-bold text-[#3838EC]">
                            ₹{Number(popupAsking || 0).toLocaleString("en-IN")}
                          </span>{" "}
                          · offer below this
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5 flex gap-2">
                      <label
                        className={`${INPUT_BASE} flex-1 min-w-0 flex items-center px-3 transition-colors focus-within:border-[#3838EC] ${
                          !negotiable ? "opacity-50" : ""
                        }`}
                      >
                        <span className="font-bold text-zinc-500 mr-1">₹</span>
                        <input
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
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
                          placeholder="Enter amount"
                          className="w-full bg-transparent py-2.5 text-base sm:text-sm font-bold text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 outline-none disabled:cursor-not-allowed"
                        />
                      </label>
                      <button
                        disabled={busy || !negotiable}
                        onClick={handleMakeOffer}
                        className={`${SELL_BTN} px-5 py-2.5 text-sm shadow-md shadow-indigo-500/25 shrink-0`}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-1.5">
                  <button
                    ref={rupeeBtnRef}
                    type="button"
                    title="Make an offer"
                    aria-label="Make an offer"
                    onClick={() => {
                      // Post-confirm the final price is locked, say so
                      // instead of opening a dead popup. Negotiation-off is
                      // explained inside the popup with a notice banner.
                      if (
                        deal &&
                        !["negotiating", "offer_accepted", "cancelled"].includes(
                          deal.status || "negotiating",
                        )
                      ) {
                        toast("Final price is already locked for this deal");
                        return;
                      }
                      setOfferOpen((v) => !v);
                    }}
                    className="px-2 text-[22px] leading-none font-normal text-zinc-800 hover:text-[#3838EC] dark:text-zinc-100 shrink-0"
                  >
                    ₹
                  </button>
                  <input
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      if (typingOn) {
                        sendTyping(true);
                        clearTimeout(typingTimeout.current);
                        typingTimeout.current = setTimeout(() => sendTyping(false), 1200);
                      }
                    }}
                    placeholder={coolingDown ? "Sending paused..." : "Type a message..."}
                    aria-label="Type a message"
                    disabled={coolingDown}
                    onFocus={() => {
                      // Mobile keyboard pushes the layout, keep the latest
                      // messages visible once it settles.
                      setTimeout(() => {
                        if (nearBottomRef.current) scrollToBottom(false);
                      }, 350);
                    }}
                    className="flex-1 min-w-0 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-base sm:text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#3838EC] dark:bg-[#131313] dark:border-zinc-700 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || coolingDown}
                    aria-label="Send message"
                    className="rounded-full bg-[#3838EC] hover:bg-[#2f2fd9] disabled:opacity-50 p-3 text-[#FCFCFC] transition-all shrink-0 shadow-sm"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <p className="flex items-center justify-center gap-1 px-3 pb-1 pt-1 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                  <Lock size={10} className="shrink-0" />
                  Be kind, abuse gets flagged to admins. Never share OTPs or
                  passwords.
                </p>
              </div>
              </div>
            </>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center gap-3 justify-center p-8">
              <img src="/logo.svg" alt="Unideals logo" className="size-12 object-contain" />
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white tracking-tight">
                Welcome to Unideals
              </h2>
              <p className="text-sm text-zinc-500 max-w-sm text-center">
                Select a conversation from the sidebar to start chatting.
              </p>
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
      <div className="flex h-[calc(100vh-70px)] h-[calc(100dvh-70px)]">
        {/* LEFT: profile menu */}
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2 xl:pb-0">
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
