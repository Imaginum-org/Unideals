import { useEffect, useMemo, useState } from "react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import emailjs from "@emailjs/browser";
import { Toaster, toast } from "react-hot-toast";
import Loading from "../../../Components/ui/ContactLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import {
  MdAccessTime,
  MdEmail,
  MdHelp,
  MdOutlineArrowForward,
  MdOutlineChat,
  MdOutlineLocalOffer,
  MdOutlinePerson,
  MdOutlineReceiptLong,
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

const replyMethods = [
  { value: "email", label: "Email" },
  { value: "chat", label: "Unideals chat" },
  { value: "either", label: "Either works" },
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
  const [priority, setPriority] = useState("normal");
  const [replyMethod, setReplyMethod] = useState("email");
  const [name, setName] = useState(userDetails?.name || "");
  const [email, setEmail] = useState(userDetails?.email || "");
  const [subject, setSubject] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedContactType = getOptionLabel(contactTypes, contactType);
  const selectedPriority = getOptionLabel(priorityOptions, priority);
  const selectedReplyMethod = getOptionLabel(replyMethods, replyMethod);

  useEffect(() => {
    if (userDetails?.name) setName((current) => current || userDetails.name);
    if (userDetails?.email) setEmail((current) => current || userDetails.email);
  }, [userDetails?.email, userDetails?.name]);

  const messagePreview = useMemo(() => {
    const trimmed = message.trim();
    if (!trimmed) return "Tell us what happened and what you need help with.";
    return trimmed.length > 88 ? `${trimmed.slice(0, 88)}...` : trimmed;
  }, [message]);

  const resetForm = () => {
    setContactType("");
    setPriority("normal");
    setReplyMethod("email");
    setName(userDetails?.name || "");
    setEmail(userDetails?.email || "");
    setSubject("");
    setReference("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !name.trim() ||
      !email.trim() ||
      !contactType ||
      !subject.trim() ||
      !message.trim()
    ) {
      toast("Please complete the required fields.");
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
      `Sender name: ${name.trim()}`,
      `Sender email: ${email.trim()}`,
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
          from_name: name.trim(),
          sender_name: name.trim(),
          user_name: name.trim(),
          from_email: email.trim(),
          sender_email: email.trim(),
          reply_to: email.trim(),
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
                <div className="relative bg-gradient-to-r from-[#364EF2] via-[#4545F4] to-[#2367E8] px-5 py-6 text-white sm:px-7 lg:px-8">
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
                      <Field
                        label="Your name"
                        required
                        icon={<MdOutlinePerson />}
                      >
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="contact-input"
                          placeholder="Enter your name"
                        />
                      </Field>

                      <Field label="Email address" required icon={<MdEmail />}>
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="contact-input"
                          placeholder="you@example.com"
                        />
                      </Field>

                      <Field label="Contact type" required icon={<MdHelp />}>
                        <select
                          value={contactType}
                          onChange={(event) =>
                            setContactType(event.target.value)
                          }
                          className="contact-input appearance-none"
                        >
                          <option value="">Select a contact type</option>
                          {contactTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Priority" icon={<MdAccessTime />}>
                        <select
                          value={priority}
                          onChange={(event) => setPriority(event.target.value)}
                          className="contact-input appearance-none"
                        >
                          {priorityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} - {option.hint}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Subject" required icon={<MdOutlineSubject />}>
                      <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        className="contact-input"
                        placeholder="Short summary of the issue"
                      />
                    </Field>

                    <Field
                      label="Message"
                      required
                      icon={<MdOutlineLocalOffer />}
                    >
                      <textarea
                        rows="6"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        className="contact-input min-h-[9rem] resize-none py-3 leading-6"
                        placeholder="Describe what happened, what you tried, and what outcome you need."
                      />
                    </Field>

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

                  <aside className="space-y-4">
                    <div className="rounded-2xl border border-[#E7E9FF] bg-[#F7F8FF] p-5 dark:border-[#2A2D35] dark:bg-[#131313]">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#364EF2]">
                        Message preview
                      </p>
                      <h2 className="mt-3 font-poppins text-lg font-semibold text-slate-950 dark:text-white">
                        {subject.trim() || "No subject yet"}
                      </h2>
                      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <p>
                          <span className="font-medium text-slate-950 dark:text-white">
                            From:
                          </span>{" "}
                          {name.trim() || "Your name"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-950 dark:text-white">
                            Type:
                          </span>{" "}
                          {selectedContactType || "Not selected"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-950 dark:text-white">
                            Priority:
                          </span>{" "}
                          {selectedPriority}
                        </p>
                        <p className="leading-6">{messagePreview}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#E7E9FF] bg-white p-5 dark:border-[#2A2D35] dark:bg-[#131313]">
                      <h2 className="font-poppins text-lg font-semibold text-slate-950 dark:text-white">
                        Quick tips
                      </h2>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        <li>
                          Include an order or product reference when possible.
                        </li>
                        <li>
                          Use urgent only for blocked payments or safety issues.
                        </li>
                        <li>Tell us what result would solve the problem.</li>
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

function Field({ label, required = false, icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 font-poppins text-sm font-medium text-slate-800 dark:text-white">
        <span className="text-lg text-[#364EF2]">{icon}</span>
        {label}
        {required ? <span className="text-[#364EF2]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

export default ContactUs;
