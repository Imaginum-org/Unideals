import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  ExternalLink,
  Mic,
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
  "Find affordable electronics",
  "Help me sell a textbook",
  "Check a fair price",
  "Campus safety tips",
];

const initialMessage = {
  text: "Hey there! 👋 I can find campus listings, check fair prices, help you sell, and share safe buying tips.",
  sender: "assistant",
  suggestions: quickPrompts,
};

const hiddenRoutes = ["/chat", "/login", "/signup", "/forgot-password"];
const MAX_VOICE_RECORDING_MS = 60_000;

const AssistantMark = () => (
  <svg
    viewBox="0 0 64 64"
    aria-hidden="true"
    className="h-full w-full"
    fill="none"
  >
    <circle cx="30" cy="34" r="28" fill="url(#assistant-mark-gradient)" />
    <path
      d="M18.5 18h8v17.8c0 3.5 1.8 5.7 5 5.7 3.4 0 5.5-2.4 5.5-6.1V20h7.8v15.5c0 8.2-5.3 13.1-13.3 13.1-8 0-13-4.9-13-12.8V18Z"
      fill="white"
    />
    <path
      d="m49 7 1.6 4.5L55 13l-4.4 1.5L49 19l-1.6-4.5L43 13l4.4-1.5L49 7Z"
      fill="white"
    />
    <path
      d="m41.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"
      fill="#C7D2FE"
    />
    <defs>
      <linearGradient id="assistant-mark-gradient" x1="8" y1="7" x2="53" y2="59" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3838EC" />
        <stop offset="1" stopColor="#2636C8" />
      </linearGradient>
    </defs>
  </svg>
);

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
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
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
  const recordingTimerRef = useRef(null);
  const assistantVisibleRef = useRef(false);
  assistantVisibleRef.current = isOpen && !isMinimized;

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

  const sendMessage = useCallback(async (text, attachments = []) => {
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
        attachments: attachments.map((attachment) => {
          const payload = { ...attachment };
          delete payload.preview;
          return payload;
        }),
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
  }, [isTyping, messages]);

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
    } catch (error) {
      console.warn("[Assistant] Image could not be prepared:", error);
      setMessages((prev) => [...prev, { text: "I could not read that image. Please try another photo.", sender: "assistant", isError: true }]);
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
            setMessages((prev) => [...prev, { text: "The camera opened but its preview could not start. Upload a picture from your device instead.", sender: "assistant", isError: true }]);
            cameraInputRef.current?.click();
          });
        }
      });
    } catch (error) {
      console.warn("[Assistant] Camera access failed:", error?.name || error);
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
    const context = canvas.getContext("2d");
    if (!context) {
      setMessages((prev) => [...prev, { text: "I could not capture that photo. Please try uploading an image instead.", sender: "assistant", isError: true }]);
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
      setMessages((prev) => [...prev, { text: "Audio recording is not supported in this browser.", sender: "assistant", isError: true }]);
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
          setMessages((prev) => [...prev, { text: "No audio was captured. Please try recording again.", sender: "assistant", isError: true }]);
        } else {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              sendMessage("Please transcribe this audio and search UniDeals for what I said.", [{ mimeType: blob.type, data: reader.result }]);
            } else {
              setMessages((prev) => [...prev, { text: "I could not read that recording. Please try again.", sender: "assistant", isError: true }]);
            }
          };
          reader.onerror = () => setMessages((prev) => [...prev, { text: "I could not read that recording. Please try again.", sender: "assistant", isError: true }]);
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
      setMessages((prev) => [...prev, { text: "Microphone access was blocked. Allow microphone permission and try again.", sender: "assistant", isError: true }]);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isTyping) return;
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
    <div className="fixed bottom-3 right-3 z-[70] font-figtree sm:bottom-6 sm:right-6">
      {isOpen && !isMinimized && (
        <section className="relative mb-3 flex h-[min(760px,88vh)] w-[calc(100vw-24px)] max-w-[520px] flex-col overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_90px_-24px_rgba(25,35,90,0.34),0_0_0_1px_rgba(25,35,90,0.05)] ring-1 ring-white/70 backdrop-blur-2xl dark:border-zinc-800 dark:bg-[#15171B]">
          <header className="relative z-10 flex items-center justify-between border-b border-black/[0.05] bg-white/70 px-5 py-4 backdrop-blur-xl dark:bg-[#15171B]/80">
            <div className="flex items-center gap-3">
              <div               className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <AssistantMark />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[15px] font-bold leading-tight tracking-[-0.3px] text-[#1C1C1E] dark:text-white">UniDeals Assistant</h2>
                  <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-blue-700">AI</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-medium tracking-tight text-slate-500">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                  Here for your campus marketplace
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

          <div aria-live="polite" aria-relevant="additions text" className="no-scrollbar flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,.08),transparent_55%),linear-gradient(180deg,#f7f8ff_0%,#f6f7fb_100%)] px-4 py-4 dark:bg-[#101114] sm:px-5">
            <div className="my-1 flex justify-center"><span className="rounded-full border border-black/[0.03] bg-white/70 px-2.5 py-0.5 text-[11px] font-medium tracking-tight text-slate-400">Today · Campus Marketplace</span></div>
            {messages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`animate-chat-in flex flex-col ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-line rounded-[22px] px-4 py-3 text-[14.5px] leading-relaxed tracking-[-0.2px] shadow-sm ${
                    message.sender === "user"
                      ? "rounded-tr-[7px] bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white shadow-[0_8px_20px_-12px_rgba(67,56,202,.8)]"
                      : message.isError
                        ? "rounded-tl-[6px] border border-red-100 bg-red-50 text-red-700"
                        : "rounded-tl-[7px] border border-slate-200/80 bg-white text-slate-800 shadow-[0_8px_24px_-18px_rgba(15,23,42,.3)] dark:border-zinc-800 dark:bg-[#1E2025] dark:text-white"
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
                <Sparkles className="h-3.5 w-3.5 animate-spin text-[#394ff1] motion-reduce:animate-none" />
                Assistant is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-2 border-t border-slate-200/70 bg-white/95 p-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-[#15171B] sm:p-4">
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
            {isRecording && <div className="mb-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">Recording audio (max 60 seconds)... click the microphone to search</div>}
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
                  maxLength={2000}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[14.5px] tracking-[-0.2px] text-[#1C1C1E] outline-none placeholder:text-[#8E8E93] dark:text-white"
              />
              <button type="button" aria-label={isRecording ? "Stop recording" : "Record voice search"} onClick={handleMicClick} disabled={isTyping} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${isRecording ? "text-red-600" : "text-[#8E8E93] hover:text-blue-700"}`}><Mic className="h-4 w-4" /></button>
              <button type="submit" disabled={(!input.trim() && !mediaPreview) || isTyping} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white shadow-[0_4px_14px_rgba(29,78,216,0.39)] transition hover:bg-blue-800 disabled:opacity-50" aria-label="Send message"><span className="text-lg leading-none">↑</span></button>
            </form>
          </div>

          {cameraOpen && (
            <div role="dialog" aria-modal="true" aria-label="Take a picture" className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-800">Take a picture</h3>
                  <button type="button" onClick={closeCamera} aria-label="Close camera" className="text-sm font-semibold text-red-600">Cancel</button>
                </div>
                <video ref={cameraVideoRef} muted playsInline onCanPlay={() => setCameraReady(true)} aria-label="Camera preview" className="aspect-[4/3] w-full rounded-2xl bg-black object-cover" />
                <button type="button" onClick={captureCameraImage} disabled={!cameraReady} className="mt-3 w-full rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Capture and use photo</button>
              </div>
            </div>
          )}
        </section>
      )}

      {(!isOpen || isMinimized) && (
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="pointer-events-none absolute -inset-2 rounded-full bg-indigo-500/20 blur-xl" />

          <motion.button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.07, rotate: 5 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-white shadow-[0_12px_30px_-8px_rgba(49,54,205,.55)] focus:outline-none focus:ring-4 focus:ring-indigo-300/60"
            aria-label={isMinimized ? "Restore UniDeals Copilot" : "Open UniDeals Copilot"}
            title="UniDeals"
          >
            <motion.span
              animate={prefersReducedMotion ? undefined : { y: [0, -2, 0] }}
              transition={prefersReducedMotion ? undefined : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="h-14 w-14 transition-transform duration-300 group-hover:scale-105"
            >
              <AssistantMark />
            </motion.span>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default FloatingAssistant;
