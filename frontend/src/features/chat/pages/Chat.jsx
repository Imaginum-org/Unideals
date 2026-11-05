import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ChatCard from "../components/ChatCard.jsx";
import PriceEstimateCard from "../components/PriceEstimateCard.jsx";
import ComparisonCard from "../components/ComparisonCard.jsx";
import ListingDraftCard from "../components/ListingDraftCard.jsx";
import ChecklistCard from "../components/ChecklistCard.jsx";
import BudgetBundleCard from "../components/BudgetBundleCard.jsx";
import SafetyTipCard from "../components/SafetyTipCard.jsx";
import userdp from "/userdp.webp";

import {
  Bot,
  ChevronLeft,
  ExternalLink,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { IoSend } from "react-icons/io5";
import Header from "../../../Components/layout/Header.jsx";
import axiosInstance from "../../../services/axiosInstance.js";

const supportChat = {
  id: "support",
  name: "Unideals Support",
  url: "/logo.svg",
};

const quickPrompts = [
  "Find a cycle under 3000",
  "Recommend electronics",
  "Help me sell my books",
  "Estimate price for my calculator",
];

  const users = [
    { id: 1, name: "Sarthak", url: "/userdp2.webp" },
    { id: 2, name: "Arnav Sharma" },
    { id: 3, name: "Piyush Srinivasan" },
    { id: 4, name: "Anvesha Shoumya" },
  ];

const initialSupportMessage = {
  text: "Hi! I am your UniDeals assistant. I can search listings, recommend deals, estimate prices, answer marketplace questions, and help write product listings.",
  sender: "support",
  timestamp: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  isInitial: true,
  suggestions: quickPrompts,
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    price || 0,
  );

const renderAssistantText = (text = "") =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });

const ProductResult = ({ product }) => {
  const image = product.images?.[0] || "/image10.png";
  const category = product.categoryLabel || product.category?.replaceAll("_", " ");

  return (
    <Link
      to={`/product/${product._id}`}
      className="flex w-full gap-3 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-[#394ff1]/40 hover:shadow-md dark:border-zinc-800 dark:bg-[#181A1E]"
    >
      <img
        src={image}
        alt={product.title}
        className="h-20 w-20 shrink-0 rounded-md object-cover"
        onError={(event) => {
          event.currentTarget.src = "/image10.png";
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 dark:text-white">
            {product.title}
          </h3>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </div>
        <p className="mt-1 text-xs capitalize text-zinc-500 dark:text-zinc-400">
          {category}
        </p>
        <p className="mt-2 text-base font-black text-[#394ff1]">
          Rs {formatPrice(product.selling_price)}
        </p>
      </div>
    </Link>
  );
};

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState(supportChat);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState({
    [supportChat.id]: [initialSupportMessage],
  });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedUser, isTyping]);

  const addMessage = (userId, text, sender, extra = {}) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const message = { text, sender, timestamp: time, ...extra };

    setConversations((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] || []), message],
    }));

    return message;
  };

  const resetSupport = () => {
    setConversations((prev) => ({
      ...prev,
      [supportChat.id]: [initialSupportMessage],
    }));
  };

  const sendAssistantMessage = async (text) => {
    const messageText = text.trim();
    if (!messageText) return;

    const currentMessages = conversations[supportChat.id] || [];
    addMessage(supportChat.id, messageText, "user");
    setChatInput("");
    setIsTyping(true);

    try {
      const { data } = await axiosInstance.post("/api/chat/assistant", {
        message: messageText,
        history: currentMessages.slice(-8).map((message) => ({
          sender: message.sender,
          text: message.text,
        })),
      });

      const assistantData = data?.data;
      addMessage(supportChat.id, assistantData.reply, "support", {
        intent: assistantData.intent,
        products: assistantData.products || [],
        suggestions: assistantData.suggestions || [],
        estimate: assistantData.estimate || null,
        comparison: assistantData.comparison || null,
        draft: assistantData.draft || null,
        checklist: assistantData.checklist || null,
        bundle: assistantData.bundle || null,
        safetyTips: assistantData.safetyTips || null,
      });
    } catch (error) {
      addMessage(
        supportChat.id,
        error.response?.data?.message ||
          "I could not reach the assistant right now. Please try again.",
        "support",
        { isError: true },
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (event) => {
    event?.preventDefault();
    if (!chatInput.trim() || !selectedUser) return;

    if (selectedUser.id === supportChat.id) {
      sendAssistantMessage(chatInput);
      return;
    }

    addMessage(selectedUser.id, chatInput.trim(), "user");
    setChatInput("");
  };

  const currentMessages = selectedUser
    ? conversations[selectedUser.id] || []
    : [];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white font-roboto dark:bg-[#131313]">
      <Header
        color="#394ff1"
        textColor="#ffffff"
        bagUrl="/whitebag.png"
        isChat
        darkUrl="/bag.png"
        isHome="s"
      />

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className={`${
            selectedUser ? "hidden lg:flex" : "flex"
          } w-full flex-col border-r border-zinc-200 bg-[#F8F9FF] dark:border-[#2A2A2A] dark:bg-[#111214] lg:w-[350px] xl:w-[400px]`}
        >
          <div className="p-4">
            <div className="flex items-center rounded-lg border border-zinc-100 bg-white px-3 py-1 shadow-sm dark:border-zinc-800 dark:bg-[#1A1D20]">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                className="w-full bg-transparent p-2.5 text-sm outline-none dark:text-white"
                placeholder="Search messages..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <ChatCard
              user={supportChat}
              onClick={setSelectedUser}
              isSelected={selectedUser?.id === supportChat.id}
            />
            <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Recent Conversations
            </div>
            {users.map((user) => (
              <ChatCard
                key={user.id}
                user={user}
                onClick={setSelectedUser}
                isSelected={selectedUser?.id === user.id}
              />
            ))}
          </div>
        </aside>

        <main
          className={`${
            !selectedUser ? "hidden lg:flex" : "flex"
          } relative h-full flex-1 flex-col transition-colors duration-300`}
          style={{
            background: isDark
              ? "#1A1D20"
              : "linear-gradient(to bottom, #EAF1F9 0%, #E3F0FF 100%)",
          }}
        >
          {selectedUser ? (
            <>
              <div className="z-10 flex items-center justify-between border-b border-zinc-200/50 bg-white/80 px-4 py-3 backdrop-blur-md dark:bg-[#16181D]/90 lg:px-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="rounded-full p-1 transition-colors hover:bg-zinc-100 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="h-6 w-6 text-[#394ff1]" />
                  </button>
                  <div className="relative">
                    <img
                      src={selectedUser.url || userdp}
                      className="size-10 rounded-full border-2 border-white object-cover shadow-sm"
                      alt=""
                    />
                    <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold leading-tight dark:text-white">
                      {selectedUser.name}
                    </h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600">
                      Online
                    </span>
                  </div>
                </div>
                {selectedUser.id === supportChat.id && (
                  <button
                    onClick={resetSupport}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#394ff1] dark:hover:bg-zinc-800"
                    title="Restart assistant"
                    aria-label="Restart assistant"
                  >
                    <RefreshCcw size={18} />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
                {currentMessages.map((msg, index) => (
                  <div
                    key={`${msg.timestamp}-${index}`}
                    className={`flex flex-col ${
                      msg.sender === "user"
                        ? "items-end"
                        : "items-start animate-in fade-in slide-in-from-bottom-2 duration-300"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-lg px-4 py-3 text-[14px] leading-relaxed shadow-sm lg:max-w-[72%] ${
                        msg.sender === "user"
                          ? "rounded-tr-none bg-[#394ff1] text-white"
                          : msg.isError
                            ? "rounded-tl-none border border-red-100 bg-red-50 text-red-700"
                            : "rounded-tl-none border border-white/50 bg-white text-zinc-800 dark:bg-[#1E2025] dark:text-white"
                      }`}
                    >
                      {msg.sender === "support" && (
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#394ff1]">
                          <Bot size={14} />
                          Assistant
                        </div>
                      )}
                      {renderAssistantText(msg.text)}
                    </div>

                    {!!(msg.productCards || msg.products)?.length && (
                      <div className="mt-3 grid w-full max-w-[760px] gap-2 sm:grid-cols-2">
                        {(msg.productCards || msg.products).map((product) => (
                          <ProductResult key={product._id || `${product.title}-${product.category}`} product={product} />
                        ))}
                      </div>
                    )}

                    <div className="w-full max-w-[760px]">
                      {msg.estimate && <PriceEstimateCard estimate={msg.estimate} />}
                      {msg.comparison && <ComparisonCard comparison={msg.comparison} />}
                      {msg.draft && <ListingDraftCard draft={msg.draft} />}
                      {msg.checklist && <ChecklistCard checklist={msg.checklist} category={msg.intent === "inspection" ? msg.category : ""} />}
                      {msg.bundle && <BudgetBundleCard bundle={msg.bundle} />}
                      {msg.safetyTips && <SafetyTipCard safetyTips={msg.safetyTips} />}
                    </div>

                    {!!msg.suggestions?.length && (
                      <div className="mt-3 flex max-w-[760px] flex-wrap gap-2">
                        {msg.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => sendAssistantMessage(suggestion)}
                            className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-[#394ff1] shadow-sm transition hover:bg-[#394ff1] hover:text-white dark:border-zinc-800 dark:bg-[#1A1D20]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="mt-1 px-1 text-[9px] uppercase text-zinc-400">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex w-fit items-center gap-2 rounded-full border border-zinc-100 bg-white/80 px-4 py-2 text-[11px] italic text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-[#1E2025]">
                    <Sparkles size={14} className="animate-spin text-indigo-500" />
                    Assistant is thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-transparent p-4 backdrop-blur-md">
                <form
                  onSubmit={handleSendMessage}
                  className="mx-auto flex max-w-4xl items-center gap-3 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl transition-all dark:border-zinc-800 dark:bg-[#202122]"
                >
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder={
                      selectedUser.id === supportChat.id
                        ? "Ask UniDeals..."
                        : "Type a message..."
                    }
                    className="flex-1 bg-transparent px-4 py-2 text-sm outline-none dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="rounded-lg bg-[#394ff1] p-2.5 text-white shadow-md transition-all hover:scale-105 active:bg-[#2d3ec9] disabled:scale-100 disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <IoSend size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 lg:flex">
              <img
                src="/logo.svg"
                alt="image"
                className="size-12 object-contain drop-shadow-md"
              />
              <div className="max-w-sm animate-in fade-in zoom-in space-y-2 text-center duration-700">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-white">
                  Welcome to CampusMart
                </h2>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Select a conversation from the sidebar to start chatting.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Chat;
