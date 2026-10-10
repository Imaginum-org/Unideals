import { useState, useEffect, useRef, useMemo } from "react";
import ChatCard from "../components/ChatCard.jsx";
import userdp from "/userdp.webp";
import toast from "react-hot-toast";
import axios from "../../../services/axiosInstance";

import {
  ChevronLeft,
  Search,
  ExternalLink,
  RefreshCcw,
  ShieldAlert,
  Ban,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IoSend } from "react-icons/io5";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";

const DEMO_KEY_PREFIX = "unideals-chat-demo-";
const DEMO_CAP = 50;
const BLOCKED_KEY = "unideals-chat-blocked";

const supportChat = {
  id: "support",
  name: "Unideals Support",
  url: "/logo.svg",
};

const supportCategories = [
  {
    id: "order",
    label: "📦 Order Issue",
    aiResponse:
      "I can help with that! Usually, orders take 1-2 days to process. Check your 'My Purchases' section for real-time updates.",
  },
  {
    id: "payment",
    label: "💳 Payment/Refund",
    aiResponse:
      "Refunds typically reflect in 5-7 business days. If it's been longer, your bank might still be processing the transaction.",
  },
  {
    id: "report",
    label: "🛡️ Report User",
    aiResponse:
      "Safety is our priority. Please use the 'Report' button on their profile so our moderation team can review the case immediately.",
  },
  {
    id: "other",
    label: "❓ General Question",
    aiResponse:
      "I'm your AI assistant! You can ask me about creating listings, campus safety, or managing your profile.",
  },
];

const readBlocked = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const deepSeller = searchParams.get("seller") || "";
  const deepProduct = searchParams.get("product") || "";
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [blockedIds, setBlockedIds] = useState(readBlocked);
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );
  const messagesEndRef = useRef(null);
  const supportRunRef = useRef(0);

  useEffect(() => {
    const runRef = supportRunRef;
    return () => {
      // Invalidate any in-flight support flow on unmount.
      runRef.current += 1;
    };
  }, []);

  const baseUsers = [
    { id: 1, name: "Sarthak", url: "/userdp2.webp" },
    { id: 2, name: "Arnav Sharma" },
    { id: 3, name: "Piyush Srinivasan" },
    { id: 4, name: "Anvesha Shoumya" },
  ];

  // Deep link (?seller=&product=) becomes a conversation entry so the
  // product context survives login (returnTo keeps the full query).
  const deepUser = useMemo(() => {
    if (!deepSeller) return null;
    const match = baseUsers.find(
      (u) => String(u.id) === String(deepSeller) || u.name === deepSeller,
    );
    return {
      id: `seller-${deepSeller}`,
      name: match?.name || "Seller",
      url: match?.url,
      sellerId: deepSeller,
      productId: deepProduct || null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepSeller, deepProduct]);

  const users = useMemo(() => {
    const list = deepUser ? [deepUser, ...baseUsers] : baseUsers;
    return list.filter((u) => !blockedIds.has(String(u.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepUser, blockedIds]);

  const initialSupportMessage = {
    text: "Hi! 👋 I'm the CampusMart AI assistant. How can I help you today?",
    sender: "support",
    timestamp: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    isInitial: true,
  };

  const demoKeyFor = (user) => {
    if (!user) return null;
    if (user.id === "support") return `${DEMO_KEY_PREFIX}support`;
    const seller = user.sellerId || user.id;
    const product = user.productId || deepProduct || "general";
    return `${DEMO_KEY_PREFIX}${seller}-${product}`;
  };

  const loadDemoMessages = (key) => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(-DEMO_CAP) : null;
    } catch {
      return null;
    }
  };

  const persistDemoMessages = (key, messages) => {
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(messages.slice(-DEMO_CAP)));
    } catch {
      // quota — drop oldest implicitly via slice; ignore failures
    }
  };

  const [conversations, setConversations] = useState({
    [supportChat.id]: [initialSupportMessage],
  });

  // Auto-select deep-linked seller conversation; hydrate demo persistence.
  useEffect(() => {
    if (deepUser) {
      const key = `${DEMO_KEY_PREFIX}${deepUser.sellerId}-${deepUser.productId || deepProduct || "general"}`;
      const saved = loadDemoMessages(key);
      if (saved && saved.length > 0) {
        setConversations((prev) => ({ ...prev, [deepUser.id]: saved }));
      }
      setSelectedUser(deepUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepSeller, deepProduct]);

  // Persist non-support threads locally (demo only, per seller+product).
  useEffect(() => {
    if (!selectedUser || selectedUser.id === "support") return;
    const key = demoKeyFor(selectedUser);
    const messages = conversations[selectedUser.id];
    if (key && messages) persistDemoMessages(key, messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedUser]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [conversations, selectedUser, isTyping]);

  const addMessage = (userId, text, sender, extra = {}) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setConversations((prev) => ({
      ...prev,
      [userId]: [
        ...(prev[userId] || []),
        { text, sender, timestamp: time, ...extra },
      ].slice(-DEMO_CAP),
    }));
  };

  const handleSupportFlow = async (category) => {
    // Guard against overlapping flows / unmount mid-sequence: only the
    // latest flow may write messages.
    const runId = ++supportRunRef.current;
    const alive = () => runId === supportRunRef.current;
    addMessage(supportChat.id, category.label, "user");
    setIsTyping(true);
    await new Promise((res) => setTimeout(res, 1000));
    if (!alive()) return;
    setIsTyping(false);
    addMessage(supportChat.id, category.aiResponse, "support");
    await new Promise((res) => setTimeout(res, 500));
    if (!alive()) return;
    addMessage(
      supportChat.id,
      "Did that resolve your issue? If not, you can talk to a human representative.",
      "support",
      { isQueryEnd: true },
    );
  };

  const resetSupport = () =>
    setConversations((prev) => ({
      ...prev,
      [supportChat.id]: [initialSupportMessage],
    }));

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !selectedUser) return;
    addMessage(selectedUser.id, chatInput.trim(), "user");
    setChatInput("");
  };

  const handleReportUser = async () => {
    if (!selectedUser || selectedUser.id === "support") return;
    const sellerId = selectedUser.sellerId || selectedUser.id;
    try {
      // Backend contract: POST /api/report/user/:userId { reason, description? }
      // (reason must be a REPORT_REASONS enum value; description >= 10 chars).
      const productRef = selectedUser.productId || deepProduct;
      await axios.post(`/api/report/user/${sellerId}`, {
        reason: "other",
        description: productRef
          ? `Reported from chat (listing ${productRef}). Review requested.`
          : "Reported from chat. Review requested by buyer.",
      });
      toast.success("Thanks — our team will review this user");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report");
    }
  };

  const handleBlockUser = () => {
    if (!selectedUser || selectedUser.id === "support") return;
    const id = String(selectedUser.id);
    try {
      const next = new Set(blockedIds);
      next.add(id);
      localStorage.setItem(BLOCKED_KEY, JSON.stringify([...next]));
      setBlockedIds(next);
    } catch {
      setBlockedIds((prev) => new Set(prev).add(id));
    }
    toast.success("User blocked on this device");
    setSelectedUser(null);
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name || "").toLowerCase().includes(q));
  }, [users, searchQuery]);

  const visibleMessages = useMemo(() => {
    if (!selectedUser) return [];
    const q = searchQuery.trim().toLowerCase();
    const messages = conversations[selectedUser.id] || [];
    if (!q) return messages;
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [conversations, selectedUser, searchQuery]);

  const showProductChip =
    selectedUser &&
    selectedUser.id !== "support" &&
    (selectedUser.productId || deepProduct);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F7F8FA] dark:bg-[#131313] overflow-hidden font-roboto">
      {/* Demo banner — this chat preview stores messages on-device only */}
      <div className="z-10 bg-amber-50 px-4 py-2 text-center text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Chat preview — messages stay on this device
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`${
            selectedUser ? "hidden lg:flex" : "flex"
          } w-full lg:w-[350px] xl:w-[400px] flex-col border-r border-zinc-200 dark:border-[#2A2A2A] bg-[#F8F9FF] dark:bg-[#111214]`}
        >
          <div className="p-4">
            <div className="flex items-center bg-[#F7F8FA] dark:bg-[#1A1D20] rounded-2xl border border-zinc-100 dark:border-zinc-800 px-3 py-1 shadow-sm">
              <Search className="text-zinc-400 w-4 h-4" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search messages"
                className="w-full p-2.5 outline-none bg-transparent text-sm dark:text-white font-roboto"
                placeholder="Search messages..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <ChatCard
              user={supportChat}
              onClick={setSelectedUser}
              isSelected={selectedUser?.id === "support"}
            />
            <div className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-roboto">
              Recent Conversations
            </div>
            {filteredUsers.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-zinc-400">
                No conversations match “{searchQuery}”.
              </p>
            )}
            {filteredUsers.map((user) => (
              <ChatCard
                key={user.id}
                user={user}
                onClick={setSelectedUser}
                isSelected={selectedUser?.id === user.id}
              />
            ))}
          </div>
        </div>

        <div
          className={`${
            !selectedUser ? "hidden lg:flex" : "flex"
          } flex-1 flex-col h-full relative transition-colors duration-300`}
          style={{
            background: isDark
              ? "#1A1D20"
              : "linear-gradient(to bottom, #EAF1F9 0%, #E3F0FF 100%)",
          }}
        >
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between px-4 lg:px-6 py-3 bg-[#F7F8FA]/80 backdrop-blur-md border-b border-zinc-200/50 dark:bg-[#16181D]/90 z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    aria-label="Back to conversations"
                    className="lg:hidden p-1 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-[#394ff1]" />
                  </button>
                  <div className="relative">
                    <img
                      src={selectedUser.url || userdp}
                      className="size-10 rounded-full border-2 border-white shadow-sm object-cover"
                      alt={selectedUser.name || "Chat participant"}
                    />
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h2 className="font-bold text-sm dark:text-white leading-tight font-roboto">
                      {selectedUser.name}
                    </h2>
                    <span className="text-[10px] text-green-600 font-semibold uppercase tracking-wider font-roboto">
                      Online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedUser.id !== "support" && (
                    <>
                      <button
                        onClick={handleReportUser}
                        aria-label="Report user"
                        title="Report user"
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <ShieldAlert size={18} />
                      </button>
                      <button
                        onClick={handleBlockUser}
                        aria-label="Block user"
                        title="Block user"
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Ban size={18} />
                      </button>
                    </>
                  )}
                  {selectedUser.id === "support" && (
                    <button
                      onClick={resetSupport}
                      aria-label="Restart assistant conversation"
                      className="p-2 text-zinc-400 hover:text-[#394ff1] transition-colors"
                      title="Restart Assistant"
                    >
                      <RefreshCcw size={18} />
                    </button>
                  )}
                </div>
              </div>

              {showProductChip && (
                <button
                  onClick={() =>
                    navigate(`/product/${selectedUser.productId || deepProduct}`)
                  }
                  className="mx-4 lg:mx-6 mt-3 flex items-center gap-2 rounded-xl border border-indigo-100 bg-[#F7F8FA]/90 px-3 py-2 text-left text-xs font-semibold text-[#394ff1] shadow-sm dark:border-zinc-700 dark:bg-[#1E2025] dark:text-indigo-300"
                >
                  <span className="truncate">
                    📦 Viewing conversation about product #{selectedUser.productId || deepProduct}
                  </span>
                  <span className="shrink-0 underline">View</span>
                </button>
              )}

              {/* Safety nudge */}
              <p className="mx-4 lg:mx-6 mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-medium leading-5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                🛡️ Meet in public, check the pickup spot before paying.
              </p>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                {visibleMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.sender === "user"
                        ? "items-end"
                        : "items-start animate-in fade-in slide-in-from-bottom-2 duration-300"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] lg:max-w-[70%] px-4 py-3 rounded-2xl text-[14px] shadow-sm leading-relaxed font-robotFlex ${
                        msg.sender === "user"
                          ? "bg-[#394ff1] text-white rounded-tr-none"
                          : "bg-[#F7F8FA] dark:bg-[#1E2025] dark:text-white rounded-tl-none border border-white/50"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 px-1 font-roboto uppercase">
                      {msg.timestamp}
                    </span>
                    {selectedUser.id === "support" && msg.isInitial && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {supportCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleSupportFlow(cat)}
                            className="bg-[#F7F8FA] dark:bg-[#1A1D20] hover:bg-[#394ff1] hover:text-white dark:hover:bg-[#394ff1] transition-all border border-indigo-100 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-medium text-[#394ff1] shadow-sm active:scale-95 font-roboto"
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedUser.id === "support" && msg.isQueryEnd && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={resetSupport}
                          className="text-[11px] font-bold text-zinc-500 bg-zinc-200/50 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors font-roboto"
                        >
                          No, show categories
                        </button>
                        <Link
                          to="/contact"
                          className="flex items-center gap-1.5 text-[11px] font-bold bg-[#394ff1] text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-[#2d3ec9] transition-colors font-roboto"
                        >
                          <ExternalLink size={12} /> Talk to Human
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-roboto italic bg-[#F7F8FA]/80 dark:bg-[#1E2025] w-fit px-4 py-2 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <BrandLoader size="xs" />{" "}
                    Assistant is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-transparent backdrop-blur-md">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3 max-w-4xl mx-auto bg-[#F7F8FA] dark:bg-[#202122] p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    aria-label="Type a message"
                    placeholder={
                      selectedUser.id === "support"
                        ? "Select a category above..."
                        : "Type a message..."
                    }
                    className="flex-1 px-4 py-2 outline-none text-sm bg-transparent dark:text-white font-robotFlex"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    aria-label="Send message"
                    className="bg-[#394ff1] disabled:opacity-50 disabled:scale-100 p-2.5 rounded-xl text-white hover:scale-105 transition-all shadow-md active:bg-[#2d3ec9]"
                  >
                    <IoSend size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center gap-3 justify-center p-8">
              <img
                src="/logo.svg"
                alt="Unideals logo"
                className="size-12 object-contain drop-shadow-md"
              />

              <div className="max-w-sm text-center space-y-2 animate-in fade-in zoom-in duration-700">
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-white font-roboto tracking-tight">
                  Welcome to Unideals
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-roboto leading-relaxed">
                  Connect with students across campus. Select a conversation
                  from the sidebar to start chatting.
                </p>
              </div>

              <div className="absolute bottom-10 flex items-center gap-2 opacity-30 grayscale">
                <img src="/fav.svg" className="size-5" alt="" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] dark:text-white font-roboto">
                  Secure Messaging
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
