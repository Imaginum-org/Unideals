import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Camera,
  ExternalLink,
  Mic,
  MessageCircle,
  Minus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import axiosInstance from "../../../services/axiosInstance.js";
import PriceEstimateCard from "./PriceEstimateCard.jsx";
import ComparisonCard from "./ComparisonCard.jsx";
import ListingDraftCard from "./ListingDraftCard.jsx";
import ChecklistCard from "./ChecklistCard.jsx";
import BudgetBundleCard from "./BudgetBundleCard.jsx";
import SafetyTipCard from "./SafetyTipCard.jsx";

const quickPrompts = [
  "Cycles under ₹3,000",
  "Electronics",
  "Sell textbook",
  "Price check",
  "Safety tips",
];

const initialMessage = {
  text: "Hey there! 👋 I can instantly find campus deals, benchmark fair prices for your pre-owned items, draft counter-offers, and verify peer safety.",
  sender: "assistant",
  suggestions: quickPrompts,
};

const hiddenRoutes = ["/chat", "/login", "/signup", "/forgot-password"];

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
      className="rounded-[22px] border border-black/[0.07] bg-white/95 p-3 shadow-sm transition hover:border-blue-400/40 hover:shadow-md dark:border-zinc-800 dark:bg-[#181A1E]"
    >
      <div className="flex items-center gap-3">
        <img
          src={image}
          alt={product.title}
          className="h-[52px] w-[52px] shrink-0 rounded-2xl border border-black/[0.05] bg-slate-100 object-cover"
          onError={(event) => {
            event.currentTarget.src = "/image10.png";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Verified Student
            </span>
            <span className="text-[10.5px] font-medium text-slate-400">Campus listing</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[13.5px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white">
              {product.title}
            </h3>
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[14.5px] font-bold tracking-tight text-[#1D4ED8]">₹{formatPrice(product.selling_price)}</span>
            {product.original_price > product.selling_price && (
              <span className="text-[11px] text-slate-400 line-through">₹{formatPrice(product.original_price)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.04] pt-2.5">
        <span className="truncate text-[11px] font-medium text-slate-500">{category || "Campus marketplace"}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1D4ED8] px-3.5 py-1.5 text-xs font-semibold text-white">View <span aria-hidden>›</span></span>
      </div>
    </Link>
  );
};

const FloatingAssistant = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [messages, setMessages] = useState([initialMessage]);
  const messagesEndRef = useRef(null);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);

  const shouldHide = hiddenRoutes.some((route) =>
    location.pathname.startsWith(route),
  );

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  useEffect(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, [location.pathname]);

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
  }, [messages, isTyping]);

  const sendMessage = async (text, attachments = []) => {
    const messageText = text.trim() || (attachments.length
      ? "Please identify this image and recommend relevant UniDeals products."
      : "");
    if (!messageText || isTyping) return;

    const history = messages.slice(-8).map((message) => ({
      sender: message.sender,
      text: message.text,
    }));

    setMessages((prev) => [
      ...prev,
      {
        text: messageText,
        sender: "user",
        mediaPreview: attachments[0]?.preview || null,
      },
    ]);
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await axiosInstance.post("/api/chat/assistant", {
        message: messageText,
        history,
        attachments: attachments.map(({ preview, ...attachment }) => attachment),
      });

      const assistantData = data?.data;

      setMessages((prev) => [
        ...prev,
        {
          text: assistantData.reply,
          sender: "assistant",
          intent: assistantData.intent,
          products: assistantData.products || [],
          suggestions: assistantData.suggestions || [],
          estimate: assistantData.estimate || null,
          comparison: assistantData.comparison || null,
          draft: assistantData.draft || null,
          checklist: assistantData.checklist || null,
          bundle: assistantData.bundle || null,
          safetyTips: assistantData.safetyTips || null,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text:
            error.response?.data?.message ||
            "I could not reach the assistant right now. Please try again.",
          sender: "assistant",
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const imageToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
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
    } catch {
      setMessages((prev) => [...prev, { text: "I could not read that image. Please try another photo.", sender: "assistant", isError: true }]);
    }
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

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
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play();
        }
      });
    } catch {
      setMessages((prev) => [...prev, { text: "Camera access was blocked. Allow camera permission or upload a picture from your device.", sender: "assistant", isError: true }]);
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
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    closeCamera();
    setMediaPreview({ data, mimeType: "image/jpeg", preview: data });
  };

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const handleMicClick = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessages((prev) => [...prev, { text: "Audio recording is not supported in this browser.", sender: "assistant", isError: true }]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => recordingChunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage("Please transcribe this audio and search UniDeals for what I said.", [{ mimeType: blob.type, data: reader.result }]);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setMessages((prev) => [...prev, { text: "Microphone access was blocked. Allow microphone permission and try again.", sender: "assistant", isError: true }]);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const attachment = mediaPreview;
    setMediaPreview(null);
    sendMessage(input, attachment ? [attachment] : []);
  };

  const resetChat = () => {
    setMessages([initialMessage]);
    setInput("");
    setMediaPreview(null);
    setCameraMenuOpen(false);
  };

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[70] font-sans sm:bottom-6 sm:right-6">
      {isOpen && !isMinimized && (
        <section className="relative mb-3 flex h-[min(700px,86vh)] w-[calc(100vw-24px)] max-w-[420px] flex-col overflow-hidden rounded-[32px] border border-black/[0.07] bg-white/85 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(0,0,0,0.05)] ring-1 ring-white/70 backdrop-blur-2xl dark:border-zinc-800 dark:bg-[#15171B]">
          <header className="relative z-10 flex items-center justify-between border-b border-black/[0.05] bg-white/70 px-5 py-4 backdrop-blur-xl dark:bg-[#15171B]/80">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white shadow-sm ring-2 ring-white/80">
                <div className="absolute -inset-0.5 rounded-2xl bg-blue-500/25 blur-sm" />
                <MessageCircle className="relative h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[15px] font-bold leading-tight tracking-[-0.3px] text-[#1C1C1E] dark:text-white">UniDeals Copilot</h2>
                  <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-blue-700">AI</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium tracking-tight text-slate-500">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                  Live campus inventory active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                aria-label="Minimize assistant"
                title="Minimize"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Close assistant"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-[#101114]">
            <div className="my-1 flex justify-center"><span className="rounded-full border border-black/[0.03] bg-white/70 px-2.5 py-0.5 text-[11px] font-medium tracking-tight text-slate-400">Today · Campus Marketplace</span></div>
            {messages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`flex flex-col ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-line rounded-[22px] px-4 py-3 text-[14.5px] leading-relaxed tracking-[-0.2px] shadow-sm ${
                    message.sender === "user"
                      ? "rounded-tr-[6px] bg-gradient-to-br from-blue-700 to-blue-800 text-white"
                      : message.isError
                        ? "rounded-tl-[6px] border border-red-100 bg-red-50 text-red-700"
                        : "rounded-tl-[6px] border border-black/[0.03] bg-[#E9E9EB] text-[#1C1C1E] dark:border-zinc-800 dark:bg-[#1E2025] dark:text-white"
                  }`}
                >
                  {message.mediaPreview && (
                    <img src={message.mediaPreview} alt="Uploaded for assistant" className="mb-2 max-h-40 rounded-2xl object-cover" />
                  )}
                  {message.sender === "assistant" && (
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700"><Sparkles className="h-3 w-3" /> Assistant</div>
                  )}
                  {renderAssistantText(message.text)}
                </div>

                {!!(message.productCards || message.products)?.length && (
                  <div className="mt-2 grid w-full gap-2">
                    {(message.productCards || message.products).slice(0, 4).map((product) => (
                      <ProductResult key={product._id || `${product.title}-${product.category}`} product={product} />
                    ))}
                  </div>
                )}

                {message.estimate && <PriceEstimateCard estimate={message.estimate} />}
                {message.comparison && <ComparisonCard comparison={message.comparison} />}
                {message.draft && <ListingDraftCard draft={message.draft} />}
                {message.checklist && <ChecklistCard checklist={message.checklist} category={message.intent === "inspection" ? message.category : ""} />}
                {message.bundle && <BudgetBundleCard bundle={message.bundle} />}
                {message.safetyTips && <SafetyTipCard safetyTips={message.safetyTips} />}

                {!!message.suggestions?.length && (
                  <div className="mt-2 flex max-w-full flex-wrap gap-2">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="rounded-full border border-black/[0.07] bg-white/80 px-3 py-1.5 text-[12px] font-medium text-[#1C1C1E] shadow-sm transition hover:bg-white hover:text-blue-700 dark:border-zinc-800 dark:bg-[#1A1D20] dark:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-[#1E2025]">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-[#394ff1]" />
                Assistant is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-2 border-t border-black/[0.05] bg-white/80 p-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#15171B]">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={resetChat}
                className="flex items-center gap-1 text-[11.5px] font-medium text-slate-500 transition hover:text-blue-700"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset chat
              </button>
              <Link
                to="/chat"
                className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-700 transition hover:text-blue-800"
              >
                Open full chat
              </Link>
            </div>

            {cameraMenuOpen && (
              <div className="mb-2 flex gap-2 rounded-2xl border border-black/[0.06] bg-white p-2 shadow-sm">
                <button type="button" onClick={() => uploadInputRef.current?.click()} className="flex-1 rounded-xl bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">Upload from device</button>
                <button type="button" onClick={openCamera} className="flex-1 rounded-xl bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">Take a picture</button>
              </div>
            )}
            {mediaPreview && (
              <div className="mb-2 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-2 text-xs text-blue-800">
                <img src={mediaPreview.preview} alt="Selected upload" className="h-10 w-10 rounded-xl object-cover" />
                <span className="flex-1">Ask a question about this image</span>
                <button type="button" onClick={() => setMediaPreview(null)} className="font-bold text-blue-600" aria-label="Remove selected image">×</button>
              </div>
            )}
            {isRecording && <div className="mb-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">Recording audio... click the microphone to search</div>}
            <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-1 rounded-full border border-black/[0.07] bg-[#E9E9EB]/70 px-2 py-1 shadow-inner transition focus-within:border-blue-400/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-zinc-800 dark:bg-[#202122]"
            >
              <button type="button" aria-label="Upload or take a picture" onClick={() => setCameraMenuOpen((open) => !open)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8E8E93] transition hover:text-blue-700"><Camera className="h-5 w-5" /></button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything on campus..."
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[14.5px] tracking-[-0.2px] text-[#1C1C1E] outline-none placeholder:text-[#8E8E93] dark:text-white"
              />
              <button type="button" aria-label={isRecording ? "Stop recording" : "Record voice search"} onClick={handleMicClick} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${isRecording ? "text-red-600" : "text-[#8E8E93] hover:text-blue-700"}`}><Mic className="h-4 w-4" /></button>
              <button type="submit" disabled={(!input.trim() && !mediaPreview) || isTyping} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white shadow-[0_4px_14px_rgba(29,78,216,0.39)] transition hover:bg-blue-800 disabled:opacity-50" aria-label="Send message"><span className="text-lg leading-none">↑</span></button>
            </form>
          </div>

          {cameraOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-800">Take a picture</h3>
                  <button type="button" onClick={closeCamera} className="text-sm font-semibold text-red-600">Cancel</button>
                </div>
                <video ref={cameraVideoRef} muted playsInline className="aspect-[4/3] w-full rounded-2xl bg-black object-cover" />
                <button type="button" onClick={captureCameraImage} className="mt-3 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-800">Capture and use photo</button>
              </div>
            </div>
          )}
        </section>
      )}

      {(!isOpen || isMinimized) && (
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Glowing aura layers */}
          <span className="absolute -inset-3 rounded-full bg-blue-500/35 blur-xl animate-pulse pointer-events-none" />
          <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-blue-600/50 via-indigo-500/40 to-cyan-400/30 blur-lg pointer-events-none" />

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-white/50 bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 text-white shadow-[0_12px_32px_-4px_rgba(37,99,235,0.65),0_0_24px_rgba(59,130,246,0.45)] transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300/60 sm:h-16 sm:w-16"
            aria-label={isMinimized ? "Restore UniDeals Copilot" : "Open UniDeals Copilot"}
            title="UniDeals"
          >
            <MessageCircle className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingAssistant;
