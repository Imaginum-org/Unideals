import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FAQ_COUNT, POPULAR_QUESTIONS } from "../../help/faqData.js";
import Select from "../../../components/ui/Select.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { AccountLayout, CARD, FLUSH_ON_PHONE, PageHeader, btnPrimary, btnSecondary } from "../components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";
import { toast } from "../../../components/ui/toast.js";
import axios from "../../../services/axiosInstance.js";
import {
  Search,
  MessageSquare,
  ShieldAlert,
  Lightbulb,
  Clock,
  Mail,
  ChevronDown,
  X,
  AlertTriangle,
} from "lucide-react";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";


function ContactUs() {
  const { userDetails } = useUser();
  // The first form is open by default: most visitors come here to contact us.
  const [activeForm, setActiveForm] = useState("contact"); // 'contact' | 'report' | 'suggest' | null
  const navigate = useNavigate();
  const [helpQuery, setHelpQuery] = useState("");

  // Guest email: prefilled when logged in, editable input when guest.
  const [guestEmail, setGuestEmail] = useState(userDetails?.email || "");
  useEffect(() => {
    if (userDetails?.email) setGuestEmail(userDetails.email);
  }, [userDetails?.email]);

  // Unified Form States
  const [contactForm, setContactForm] = useState({ topic: "", message: "" });
  const [reportForm, setReportForm] = useState({
    category: "",
    link: "",
    description: "",
  });
  const [suggestForm, setSuggestForm] = useState({
    title: "",
    description: "",
    whyUseful: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Client-side length + rate limits (EmailJS quota protection)
    const lastSent = Number(sessionStorage.getItem("contactLastSent") || 0);
    if (Date.now() - lastSent < 30000) {
      toast.error("Please wait before sending another message.");
      setIsSubmitting(false);
      return;
    }
    const clamp = (s, max) => String(s || "").trim().slice(0, max);
    const cleanReplyEmail = clamp(guestEmail, 254).toLowerCase();

    if (!cleanReplyEmail || !cleanReplyEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    // Server-agnostic ticket ID shown to the user for follow-ups.
    const ticketId = Date.now().toString(36).toUpperCase();

    // Base template parameters mapped to your HTML template
    let templateParams = {
      sender_name: clamp(userDetails?.name || "Unregistered User", 100),
      sender_email: cleanReplyEmail,
      preferred_reply: "Email",
      reference: "N/A",
    };

    // Dynamically update parameters based on the active form
    if (activeForm === "contact") {
      if (!contactForm.topic || !contactForm.message.trim()) {
        toast.error("Please fill in all fields.");
        setIsSubmitting(false);
        return;
      }
      if (contactForm.message.trim().length > 2000) {
        toast.error("Message is too long (max 2000 characters).");
        setIsSubmitting(false);
        return;
      }
      templateParams = {
        ...templateParams,
        contact_type: "Support Request",
        priority: "Normal",
        user_subject: clamp(contactForm.topic, 200),
        user_message: clamp(contactForm.message, 2000),
      };
    } else if (activeForm === "report") {
      if (!reportForm.category || !reportForm.description.trim()) {
        toast.error("Please select a category and provide a description.");
        setIsSubmitting(false);
        return;
      }
      if (reportForm.description.trim().length > 2000) {
        toast.error("Description is too long (max 2000 characters).");
        setIsSubmitting(false);
        return;
      }
      templateParams = {
        ...templateParams,
        contact_type: "Issue / Bug Report",
        priority: "High",
        reference: clamp(reportForm.link || "N/A", 500),
        user_subject: clamp(reportForm.category, 200),
        user_message: clamp(reportForm.description, 2000),
      };
    } else if (activeForm === "suggest") {
      if (!suggestForm.title || !suggestForm.description.trim()) {
        toast.error("Please provide a title and description.");
        setIsSubmitting(false);
        return;
      }
      if (
        suggestForm.description.trim().length > 2000 ||
        String(suggestForm.title || "").length > 200
      ) {
        toast.error("Suggestion is too long.");
        setIsSubmitting(false);
        return;
      }
      templateParams = {
        ...templateParams,
        contact_type: "Feature Suggestion",
        priority: "Low",
        user_subject: clamp(suggestForm.title, 200),
        user_message: clamp(`Description:\n${suggestForm.description}\n\nWhy it is useful:\n${suggestForm.whyUseful || "Not provided"}`, 2000),
      };
    }

    try {
      // 1. Save to backend database for the Admin Portal moderation queue
      try {
        await axios.post("/api/report/support", {
          topic: templateParams.user_subject,
          category: templateParams.user_subject,
          description: templateParams.user_message,
          reference: templateParams.reference,
          email: cleanReplyEmail,
          name: userDetails?.name,
          support_type: activeForm,
          priority: templateParams.priority,
        });
      } catch (backendErr) {
        console.warn("Could not save support ticket to database:", backendErr);
      }

      // 2. Send via email service
      const { default: emailjs } = await import("@emailjs/browser");
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
      );

      sessionStorage.setItem("contactLastSent", String(Date.now()));
      toast.success(
        `Message sent successfully! Ticket ID: ${ticketId}. We'll be in touch soon.`,
      );

      // Clear forms and reset view
      setContactForm({ topic: "", message: "" });
      setReportForm({ category: "", link: "", description: "" });
      setSuggestForm({ title: "", description: "", whyUseful: "" });
      setActiveForm(null);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const input =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white dark:placeholder:text-zinc-500";
  const label = "mb-1.5 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200";
  const ACTIONS = [
    { id: "contact", icon: MessageSquare, title: "Contact support", hint: "Account or deal help", tone: "bg-[var(--accent-soft)] text-[var(--accent-text)]" },
    { id: "report", icon: ShieldAlert, title: "Report an issue", hint: "Safety, fraud or bugs", tone: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" },
    { id: "suggest", icon: Lightbulb, title: "Suggest a feature", hint: "Share your ideas", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" },
  ];
  const submitTone = {
    contact: "",
    report: "!bg-red-600 hover:!bg-red-700",
    suggest: "!bg-emerald-600 hover:!bg-emerald-700",
  };

  const emailField = (
    <div>
      <label htmlFor="support-email" className={label}>
        Your email
      </label>
      <input
        id="support-email"
        type="email"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        placeholder="you@college.edu"
        required
        maxLength={254}
        autoComplete="email"
        className={`${input} h-11`}
      />
    </div>
  );

  const formFooter = (submitLabel, Icon) => (
    <>
      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={() => setActiveForm(null)} className={cn(btnSecondary, "h-11")}>
          Back
        </button>
        <button type="submit" disabled={isSubmitting} className={cn(btnPrimary, "h-11 flex-1", submitTone[activeForm])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <ButtonLoader loading={isSubmitting} loadingText="Sending…">
            {submitLabel}
          </ButtonLoader>
        </button>
      </div>
      <a
        href="mailto:hi@unideals.in"
        className="inline-flex items-center gap-1.5 self-start text-[12px] font-medium text-slate-500 hover:text-[var(--accent-text)] dark:text-zinc-400"
        title="Submit first, then email screenshots with your ticket ID"
      >
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        Screenshots? Email us
      </a>
    </>
  );

  const content = (
    <div className="flex flex-col gap-4 sm:gap-5">
      {!userDetails?._id && (
        <PageHeader title="Help & support" description="Find answers, report a problem or reach our team." />
      )}

      {/* Help-centre header: search goes to the FAQ tab */}
      <section className="brand-surface overflow-hidden rounded-2xl px-5 py-6 text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] max-sm:-mx-4 max-sm:rounded-none sm:px-8 sm:py-8">
        <h2 className="text-[20px] font-semibold tracking-tight sm:text-[24px]">How can we help?</h2>
        <p className="mt-1 text-[13.5px] text-white/75">Search {FAQ_COUNT} answers, or send us a message below.</p>
        <form
          className="relative mt-4 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            const q = helpQuery.trim();
            navigate(q ? `/faq?q=${encodeURIComponent(q)}` : "/faq");
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={helpQuery}
            onChange={(e) => setHelpQuery(e.target.value)}
            placeholder="Search, e.g. “boost” or “cancel deal”"
            aria-label="Search the FAQ"
            enterKeyHint="search"
            className="h-11 w-full rounded-lg border-0 bg-white pl-10 pr-24 text-[14px] text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-white/30"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md bg-[var(--accent)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]">
            Search
          </button>
        </form>
        <p className="mt-3 text-[12.5px] text-white/70">
          Popular:{" "}
          {[
            ["Boosts", "boost"],
            ["Cancel a deal", "cancel"],
            ["Payments", "pay"],
            ["Safety", "safe"],
          ].map(([label, q], i) => (
            <span key={q}>
              {i > 0 && <span className="mx-1.5 text-white/40">·</span>}
              <Link to={`/faq?q=${q}`} className="font-medium text-white underline-offset-4 hover:underline">
                {label}
              </Link>
            </span>
          ))}
        </p>
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Contact the team</h2>
      {/* Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ACTIONS.map(({ id, icon: Icon, title, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveForm(activeForm === id ? null : id)}
            aria-pressed={activeForm === id}
            className={cn(
              CARD,
              "flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-px sm:flex-col sm:items-start",
              activeForm === id ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft-strong)]" : "hover:border-[var(--accent-ring)]",
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", activeForm === id ? "text-[var(--accent-text)]" : "text-slate-400 dark:text-zinc-500")} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-slate-900 dark:text-white">{title}</span>
              <span className="block text-[12.5px] text-slate-500 dark:text-zinc-400">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeForm ? (
          <motion.section
            key={activeForm}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn(CARD, FLUSH_ON_PHONE, "relative p-4 sm:p-6")}
          >
            <button
              type="button"
              onClick={() => setActiveForm(null)}
              aria-label="Close form"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {activeForm === "contact" && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Contact support</h2>
                </div>
                {emailField}
                <div>
                  <span className={label}>Topic</span>
                  <Select
                    value={contactForm.topic}
                    onChange={(v) => setContactForm({ ...contactForm, topic: v })}
                    placeholder="Select a topic"
                    ariaLabel="Select a topic"
                    options={[
                      { value: "Account assistance", label: "Account assistance" },
                      { value: "Deal inquiries", label: "Deal inquiries" },
                      { value: "Other", label: "Other" },
                    ]}
                  />
                </div>
                <div>
                  <label htmlFor="support-message" className={label}>
                    Message
                  </label>
                  <textarea
                    id="support-message"
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className={`${input} resize-y py-2.5`}
                    placeholder="Describe your issue in as much detail as possible…"
                    required
                  />
                </div>
                {formFooter("Send message", MessageSquare)}
              </form>
            )}

            {activeForm === "report" && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Report an issue</h2>
                </div>
                <p className="flex gap-2 rounded-lg bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Emergency? Contact campus security first.
                </p>
                {emailField}
                <div>
                  <span className={label}>What are you reporting?</span>
                  <Select
                    value={reportForm.category}
                    onChange={(v) => setReportForm({ ...reportForm, category: v })}
                    placeholder="Select a category"
                    ariaLabel="Report category"
                    options={[
                      "Fraud or Scam Seller",
                      "Safety Concern",
                      "App Bug / Glitch",
                      "Harassment or abuse",
                      "Spam or Bot account",
                      "Inappropriate Content",
                      "Payment / Deal Dispute",
                      "Account or Login Issue",
                      "Fake or Misleading Product",
                      "Other Issue",
                    ].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                <div>
                  <label htmlFor="report-link" className={label}>
                    Link, user or page <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="report-link"
                    type="text"
                    value={reportForm.link}
                    onChange={(e) => setReportForm({ ...reportForm, link: e.target.value })}
                    className={`${input} h-11`}
                    placeholder="Paste a link or describe where it happened"
                  />
                </div>
                <div>
                  <label htmlFor="report-description" className={label}>
                    What happened?
                  </label>
                  <textarea
                    id="report-description"
                    rows={4}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    required
                    className={`${input} resize-y py-2.5`}
                    placeholder="Be specific: dates, messages, or steps to trigger the bug…"
                  />
                </div>
                {formFooter("Submit report", ShieldAlert)}
              </form>
            )}

            {activeForm === "suggest" && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Suggest a feature</h2>
                </div>
                {emailField}
                <div>
                  <label htmlFor="suggest-title" className={label}>
                    Feature title
                  </label>
                  <input
                    id="suggest-title"
                    type="text"
                    value={suggestForm.title}
                    onChange={(e) => setSuggestForm({ ...suggestForm, title: e.target.value })}
                    required
                    className={`${input} h-11`}
                    placeholder="e.g. Filter by hostel block"
                  />
                </div>
                <div>
                  <label htmlFor="suggest-description" className={label}>
                    Describe it
                  </label>
                  <textarea
                    id="suggest-description"
                    rows={3}
                    value={suggestForm.description}
                    onChange={(e) => setSuggestForm({ ...suggestForm, description: e.target.value })}
                    required
                    className={`${input} resize-y py-2.5`}
                    placeholder="What should it do? How would it work?"
                  />
                </div>
                <div>
                  <label htmlFor="suggest-why" className={label}>
                    Why is it useful? <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="suggest-why"
                    rows={2}
                    value={suggestForm.whyUseful}
                    onChange={(e) => setSuggestForm({ ...suggestForm, whyUseful: e.target.value })}
                    className={`${input} resize-y py-2.5`}
                    placeholder="Who benefits and how?"
                  />
                </div>
                {formFooter("Submit idea", Lightbulb)}
              </form>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>
      </div>

      <aside className="flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-4">
      {/* Talk to a person */}
      <section className={cn(CARD, FLUSH_ON_PHONE, "p-4 sm:p-5")}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Talk to a person</h2>
        </div>
        <dl className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-zinc-400">Typical reply</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {userDetails?.subscription === "pro_plus" || userDetails?.subscription === "pro" ? "~1 hour · priority" : "~2 hours"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500 dark:text-zinc-400">Hours</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">9 AM – 9 PM</dd>
          </div>
        </dl>
        <a href="mailto:hi@unideals.in" className={cn(btnSecondary, "mt-4 w-full")}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          hi@unideals.in
        </a>
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] text-slate-500 dark:text-zinc-400">
          <Clock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Emergency on campus? Contact campus security first.
        </p>
      </section>

      {/* Popular questions → full FAQ tab */}
      <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden")}>
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 sm:px-5 dark:border-neutral-800">
          <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Popular questions</h2>
          <Link to="/faq" className="text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
            All {FAQ_COUNT}
          </Link>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {POPULAR_QUESTIONS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[13.5px] font-medium text-slate-800 hover:text-[var(--accent-text)] sm:px-5 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-4 pb-4 text-[13px] leading-relaxed text-slate-600 sm:px-5 dark:text-zinc-400">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      </aside>
      </div>
    </div>
  );

  // Signed in: account shell. Signed out: plain public page (the account
  // sidebar would bounce guests to /login).
  if (userDetails?._id) {
    return (
      <AccountLayout
        seoTitle="Help & support | Unideals"
        width="xl"
        title="Help & support"
      >
        {content}
      </AccountLayout>
    );
  }
  return (
    <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] font-figtree dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">{content}</div>
    </div>
  );
}

export default ContactUs;
