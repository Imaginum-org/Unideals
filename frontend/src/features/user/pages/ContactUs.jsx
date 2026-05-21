import { useState } from "react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import emailjs from "@emailjs/browser";
import { Toaster, toast } from "react-hot-toast";
import Loading from "../../../Components/ui/ContactLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { Lightbulb, Sparkles } from "lucide-react";
import {
  MdAccessTime,
  MdEmail,
  MdHelp,
  MdOutlineArrowForward,
  MdOutlineLocalOffer,
  MdOutlineSubject,
} from "react-icons/md";

const EMAILJS_SERVICE_ID = (
  import.meta.env.VITE_EMAILJS_SERVICE_ID ||
  import.meta.env.VITE_SERVICE_ID ||
  ""
).trim();
const EMAILJS_TEMPLATE_ID = (
  import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
  import.meta.env.VITE_TEMPLATE_ID ||
  ""
).trim();
const EMAILJS_PUBLIC_KEY = (
  import.meta.env.VITE_EMAILJS_PUBLIC_KEY ||
  import.meta.env.VITE_PUBLIC_KEY ||
  ""
).trim();
const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "imaginum.org@gmail.com";

if (EMAILJS_PUBLIC_KEY) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

const contactTypes = [
  { value: "order", label: "Order issue" },
  { value: "payment", label: "Payment issue" },
  { value: "account", label: "Account help" },
  { value: "listing", label: "Product listing" },
  { value: "deal", label: "Deal or chat help" },
  { value: "safety", label: "Safety report" },
  { value: "other", label: "Other" },
];

const priorityOptions = [
  { value: "low", label: "Low", hint: "General question" },
  { value: "normal", label: "Normal", hint: "Need help soon" },
  { value: "urgent", label: "Urgent", hint: "Blocking issue" },
];

const quickTips = [
  "Include an order or product reference when possible.",
  "Use urgent only for blocked payments or safety issues.",
  "Tell us what result would solve the problem.",
];

const faqs = [
  {
    question: "How do I track my order?",
    answer:
      "Open My Orders from your profile menu. If the seller has shared status updates, they will appear inside the order card.",
  },
  {
    question: "What should I include for payment issues?",
    answer:
      "Share the order or product reference, payment time, amount, and a short description. Do not send passwords or card details.",
  },
  {
    question: "How fast will support reply?",
    answer:
      "Most messages are reviewed within 24 hours. Urgent safety or payment issues are prioritized first.",
  },
  {
    question: "Can I report a suspicious listing?",
    answer:
      "Yes. Choose Safety report or Product listing, include the product reference if you have it, and describe what looked wrong.",
  },
];

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || "";

function ContactUs() {
  const { userDetails } = useUser();
  const [contactType, setContactType] = useState("");
  const [priority, setPriority] = useState("");
  const [replyMethod, setReplyMethod] = useState("email");
  const [subject, setSubject] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedContactType = getOptionLabel(contactTypes, contactType);
  const selectedPriority = getOptionLabel(priorityOptions, priority);
  const senderName = userDetails?.name?.trim() || "Campus Mart user";
  const senderEmail = userDetails?.email?.trim() || "";

  const resetForm = () => {
    setContactType("");
    setPriority("normal");
    setReplyMethod("email");
    setSubject("");
    setReference("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!contactType || !subject.trim() || !message.trim()) {
      toast("Please complete the required fields.");
      return;
    }

    if (!senderEmail) {
      toast.error("We could not read your account email. Please log in again.");
      return;
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      toast.error("Contact service is not configured. Please try again later.");
      return;
    }

    const cleanReference = reference.trim() || "Not provided";
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    const fullMessage = [
      `Sender name: ${senderName}`,
      `Sender email: ${senderEmail}`,
      `Contact type: ${selectedContactType}`,
      `Priority: ${selectedPriority}`,
      `Preferred reply: ${selectedReplyMethod}`,
      `Reference: ${cleanReference}`,
      "",
      "Message:",
      cleanMessage,
    ].join("\n");

    setLoading(true);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: SUPPORT_EMAIL,
          from_name: senderName,
          sender_name: senderName,
          user_name: senderName,
          from_email: senderEmail,
          sender_email: senderEmail,
          reply_to: senderEmail,
          contact_type: selectedContactType,
          priority: selectedPriority,
          preferred_reply: selectedReplyMethod,
          reference: cleanReference,
          subject: `Unideals Support: ${cleanSubject}`,
          user_subject: cleanSubject,
          message: fullMessage,
          user_message: cleanMessage,
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      );

      toast.success("Message sent successfully!");
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (index) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 1800,
          maxToasts: 1,
        }}
      />
      {loading && <Loading />}

      <div className="min-h-screen bg-[#FBFBFB] dark:bg-[#131313]">
        <div className="flex min-h-[calc(100vh-70px)]">
          <aside className="hidden bg-[#FBFBFB] pb-[2vh] pl-[2vw] pr-[1.75vw] pt-[3.5vh] dark:bg-[#131313] md:block md:w-[37%] lg:w-[28%] xl:-mr-4 xl:w-[26%] xl:pb-0 xl:pt-[2.5vh]">
            <Profile_left_part />
          </aside>

          <main className="w-full overflow-y-auto bg-[#FBFBFB] px-4 py-6 dark:bg-[#131313] md:w-[63%] md:px-7 lg:w-[72%] xl:w-[73.5%] xl:px-10">
            <div className="mx-auto max-w-6xl">
              <section className="overflow-hidden rounded-3xl border border-[#E7E9FF] bg-white shadow-[0_18px_45px_rgba(36,49,148,0.08)] dark:border-[#282A2C] dark:bg-[#1A1D20]">
                <div className="relative bg-gradient-to-r from-[#364EF2] via-[#4545F4] to-[#2367E8] px-5 py-6 text-white sm:px-7 lg:px-8 overflow-hidden">
                  <div className="absolute right-[-3rem] top-[-3rem] h-36 w-36 rounded-full bg-white/10" />
                  <div className="absolute bottom-[-4rem] left-[32%] h-32 w-32 rounded-full bg-white/10" />

                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                        <MdEmail className="text-base" />
                        Unideals Support
                      </div>
                      <h1 className="font-poppins text-2xl font-semibold tracking-normal sm:text-3xl">
                        How can we help?
                      </h1>
                      <p className="mt-2 max-w-2xl font-inter text-sm leading-6 text-white/85 sm:text-base">
                        Send us the details and we&apos;ll route your message
                        with the right context.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <AuthLikeField
                        label="Contact type"
                        required
                        icon={<MdHelp />}
                        active={Boolean(contactType)}
                      >
                        <select
                          value={contactType}
                          onChange={(event) =>
                            setContactType(event.target.value)
                          }
                          className="h-[6.3vh] min-h-12 w-full appearance-none rounded-xl border border-transparent bg-slate-50 pl-10 pr-9 text-[0.8125rem] text-[#111827] outline-none transition focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#131313] dark:text-white dark:focus:bg-[#1A1D20]"
                        >
                          {/* This empty, disabled, hidden option prevents the text overlap */}
                          <option value="" disabled hidden></option>

                          {contactTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </AuthLikeField>
                      <AuthLikeField
                        label="Priority"
                        icon={<MdAccessTime />}
                        active={Boolean(priority)}
                      >
                        <select
                          value={priority}
                          onChange={(event) => setPriority(event.target.value)}
                          className="h-[6.3vh] min-h-12 w-full appearance-none rounded-xl border border-transparent bg-slate-50 pl-10 pr-9 text-[0.8125rem] text-[#111827] outline-none transition focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#131313] dark:text-white dark:focus:bg-[#1A1D20]"
                        >
                          {/* This empty, disabled, hidden option prevents the text overlap */}
                          <option value="" disabled hidden></option>

                          {priorityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.hint}
                            </option>
                          ))}
                        </select>
                      </AuthLikeField>
                    </div>

                    <AuthLikeField
                      label="Subject"
                      required
                      icon={<MdOutlineSubject />}
                      active={Boolean(subject)}
                    >
                      <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="h-[6.3vh] min-h-12 w-full rounded-xl border border-transparent bg-slate-50 pl-10 pr-3 text-[0.8125rem] text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#131313] dark:text-white dark:focus:bg-[#1A1D20]"
                        placeholder=" "
                      />
                    </AuthLikeField>

                    <AuthLikeField
                      label="Message"
                      required
                      icon={<MdOutlineLocalOffer />}
                      active={Boolean(message)}
                      multiline
                    >
                      <textarea
                        rows="2"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="min-h-[5.7rem] w-full resize-none rounded-xl border border-transparent bg-slate-50 pb-3 pl-10 pr-4 pt-6 text-[0.8125rem] leading-6 text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-white focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#131313] dark:text-white dark:focus:bg-[#1A1D20]"
                        placeholder=" "
                      />
                    </AuthLikeField>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Please do not include passwords, OTPs, or card details.
                      </p>
                      <button
                        disabled={loading}
                        type="submit"
                        className="inline-flex h-[6.3vh] items-center justify-center gap-2 rounded-xl bg-[#364EF2] px-7 font-poppins text-sm font-semibold text-white shadow-[0_12px_24px_rgba(54,78,242,0.25)] transition hover:bg-[#2d44dd] disabled:cursor-not-allowed disabled:opacity-60 xl:text-xs"
                      >
                        {loading ? "Sending..." : "Send "}
                        <MdOutlineArrowForward className="text-lg xl:text-base" />
                      </button>
                    </div>
                  </form>

                  <aside className="space-y-3">
                    <div className="rounded-2xl bg-[#F0F0FF] px-6 py-5 dark:border dark:border-[#2A2D35] dark:bg-[#131313]">
                      {/* Header */}
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="relative">
                          <Lightbulb className="h-5 w-5 fill-[#3838EC] text-[#3838EC] dark:fill-indigo-400 dark:text-indigo-400" />
                          <Sparkles className="absolute -right-2 -top-1 h-2.5 w-2.5 text-[#3838EC] dark:text-indigo-400" />
                        </div>
                        <h2 className="font-['Figtree'] text-base font-semibold uppercase leading-6 text-black dark:text-white">
                          Quick tips
                        </h2>
                      </div>

                      {/* Custom Bullet List */}
                      <ul className="flex flex-col gap-1">
                        {quickTips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2.5">
                            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/60 dark:bg-indigo-500/60">
                              <Sparkles className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-['Figtree'] text-[0.85rem] font-normal leading-6 text-black dark:text-slate-300">
                              {tip}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </aside>
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-[#E7E9FF] bg-white p-5 shadow-[0_18px_45px_rgba(36,49,148,0.06)] dark:border-[#282A2C] dark:bg-[#1A1D20] sm:p-7">
                <h2 className="font-poppins text-xl font-semibold text-gray-950 dark:text-white">
                  Frequently Asked Questions
                </h2>

                {/* Changed from 'grid lg:grid-cols-2' to 'flex flex-col' for 1 row per question */}
                <div className="mt-5 flex flex-col gap-3">
                  {faqs.map((item, index) => {
                    const isOpen = activeIndex === index;
                    return (
                      <div
                        key={item.question}
                        className="rounded-2xl border border-gray-200 bg-white dark:border-[#2A2D35] dark:bg-[#131313]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFAQ(index)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                        >
                          <span className="font-poppins text-sm font-medium text-gray-900 dark:text-white">
                            {item.question}
                          </span>
                          <span
                            className={`text-lg text-[#364EF2] transition-transform duration-200 ${
                              isOpen ? "rotate-45" : ""
                            }`}
                          >
                            +
                          </span>
                        </button>

                        <div
                          className={`grid transition-all duration-300 ease-out ${
                            isOpen
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="px-4 pb-4 text-sm leading-6 text-gray-600 dark:text-gray-400">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

function AuthLikeField({
  label,
  required = false,
  icon,
  active,
  multiline = false,
  children,
}) {
  return (
    <label className="block">
      <span className="relative block group">
        <span
          className={`absolute left-3 z-10 text-lg text-gray-500 transition group-focus-within:text-[#393AF2] ${
            multiline ? "top-7" : "top-1/2 -translate-y-1/2"
          }`}
        >
          {icon}
        </span>
        <span
          className={`pointer-events-none absolute left-10 z-10 px-1 font-figtree transition-all duration-200 ${
            active
              ? "-top-0 -translate-y-1/2 bg-white text-[0.625rem] text-[#393AF2] dark:bg-[#131313] dark:text-[#818cf8]"
              : `${multiline ? "top-7" : "top-1/2 -translate-y-1/2"} text-[0.75rem] text-gray-500/80`
          } group-focus-within:-top-0 group-focus-within:-translate-y-1/2 group-focus-within:bg-white group-focus-within:text-[0.625rem] group-focus-within:text-[#393AF2] dark:group-focus-within:bg-[#131313] dark:group-focus-within:text-[#818cf8]`}
        >
          {label}
          {required ? " *" : ""}
        </span>
        {children}
      </span>
    </label>
  );
}

export default ContactUs;
