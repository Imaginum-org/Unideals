import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "../../../context/useUserContext.jsx";
import Profile_left_part from "../components/Profile_left_part.jsx";
import {
  Search,
  MessageSquare,
  ShieldAlert,
  Lightbulb,
  Clock,
  Mail,
  Headphones,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
} from "lucide-react";

// FAQ Data Structure
const faqData = [
  {
    id: "transactions",
    title: "TRANSACTIONS",
    questions: [
      {
        q: "How do I track the status of a deal?",
        a: 'Go to Orders in your profile — each deal shows a live progress tracker from "Enquired" through "Meetup Confirmed" and "Completed". You and the seller both get notifications at each stage.',
      },
      {
        q: "Can I return an item after buying it?",
        a: "UniDeals connects students directly — there is no platform-level returns system. We strongly recommend inspecting all items before completing a deal. Once marked as done, transactions cannot be reversed.",
      },
      {
        q: "What if I got scammed or the item is not as described?",
        a: "Report the listing immediately using the flag icon on the product page or seller profile. Our safety team reviews every report within 24 hours and will contact you via email.",
      },
    ],
  },
  {
    id: "safety",
    title: "SAFETY",
    questions: [
      {
        q: "Is it safe to meet a seller on campus?",
        a: "All users on UniDeals are verified students. Always meet in public, well-lit campus areas — the canteen, library lobby, or main gate. Never share home addresses or pay before inspecting the item.",
      },
      {
        q: "What if a seller stops responding?",
        a: "If a seller stops responding, we recommend canceling the deal and looking for alternative listings.",
      },
    ],
  },
  {
    id: "account",
    title: "ACCOUNT & VERIFICATION",
    questions: [
      {
        q: "How does Campus Verification Works ?",
        a: "Go to Settings → Verification and enter your official university email (e.g. name@vitstudent.ac.in). We send a one-click confirmation link. Once verified, your profile shows a blue badge which increases buyer trust",
      },
      {
        q: "How do I delete my account ?",
        a: 'Go to Settings → Profile and scroll to the Account section. Click "Delete account". This is permanent and cannot be undone. All your listings will be removed.',
      },
      {
        q: "Can I change my campus or pickup location ?",
        a: "Yes — go to Settings → Pickup Spots to update your preferred campus meetup locations. To change your campus, update it under Settings → Profile.",
      },
    ],
  },
  {
    id: "listings",
    title: "LISTINGS",
    questions: [
      {
        q: "How do I create a listing",
        a: 'Tap "Sell" in the navigation bar. Add photos, set a price, write a clear description, and choose a category. Your listing goes live immediately after submission.',
      },
      {
        q: "How does Boost work",
        a: "Boosting a listing promotes it to the top of search results and category feeds for 48 hours. You can boost any active listing from My Listings → Boost.",
      },
    ],
  },
];

function Termscondition() {
  const { userDetails } = useUser();
  const [activeForm, setActiveForm] = useState(null); // 'contact', 'report', 'suggest'
  const [openCategory, setOpenCategory] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);

  const toggleCategory = (id) => {
    setOpenCategory(openCategory === id ? null : id);
    setOpenQuestion(null);
  };

  const toggleQuestion = (q) => {
    setOpenQuestion(openQuestion === q ? null : q);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="h-screen w-full dark:bg-[#131313] flex flex-col bg-[#F7F9FD] font-figtree">
      <div className="flex-1 lg:flex md:flex overflow-hidden">
        {/* LEFT PANEL - Only render if user exists */}
        {userDetails?._id ? (
          <div className="hidden md:block md:w-[37%] lg:w-[28%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2 xl:pb-0">
            <Profile_left_part />
          </div>
        ) : null}

        {/* RIGHT PANEL (Main Content Area) */}
        <div
          className={`h-full overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-4 xl:px-[5.7rem] xl:py-6 ${
            userDetails?._id
              ? "w-full md:w-[63%] lg:w-[72%] xl:w-[73.5%]"
              : "mx-auto w-full max-w-5xl"
          }`}
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-3xl mx-auto pb-10"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Help & Support
              </h1>
              <p className="text-sm text-gray-500">
                Find answers, report issues, or reach our team.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div variants={itemVariants} className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search help articles..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-[#1f1f1f] dark:border-gray-700 dark:text-white transition-all"
              />
            </motion.div>

            {/* Action Cards (Merged Bug & Issue) */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
            >
              <button
                onClick={() => setActiveForm("contact")}
                className={`group p-4 text-left border rounded-2xl transition-all duration-300 ${
                  activeForm === "contact"
                    ? "border-indigo-500 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                } bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-[#4F46E5] group-hover:scale-105 group-hover:shadow-md">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold  text-gray-900 dark:text-white transition-colors">
                  Contact support
                </h3>
                <p className="text-xs text-gray-500 mt-1">Reach our team</p>
              </button>

              <button
                onClick={() => setActiveForm("report")}
                className={`group p-4 text-left border rounded-2xl transition-all duration-300 ${
                  activeForm === "report"
                    ? "border-red-500 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                } bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-[#EF4444] group-hover:scale-105 group-hover:shadow-md">
                  <ShieldAlert className="w-4 h-4 text-red-500 transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white transition-colors">
                  Report an issue
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Safety, fraud or bugs
                </p>
              </button>

              <button
                onClick={() => setActiveForm("suggest")}
                className={`group p-4 text-left border rounded-2xl transition-all duration-300 ${
                  activeForm === "suggest"
                    ? "border-green-500 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                } bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-[#22C55E] group-hover:scale-105 group-hover:shadow-md">
                  <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400 transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bolds text-gray-900 dark:text-white transition-colors">
                  Suggest a feature
                </h3>
                <p className="text-xs text-gray-500 mt-1">Share your ideas</p>
              </button>
            </motion.div>

            {/* Dynamic Content Area with AnimatePresence for smooth mounting/unmounting */}
            <AnimatePresence mode="wait">
              {activeForm ? (
                <motion.div
                  key="form-view"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1f1f1f] p-5 relative mb-6"
                >
                  <button
                    onClick={() => setActiveForm(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* CONTACT FORM */}
                  {activeForm === "contact" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h2 className="text-base font-semibold mb-1 dark:text-white">
                        Contact support
                      </h2>
                      <p className="text-xs text-gray-500 mb-4">
                        Fill in the details below and we will follow up.
                      </p>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Topic
                      </label>
                      <select className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none">
                        <option>Select a topic</option>
                        <option>Account assistance</option>
                        <option>Deal inquiries</option>
                        <option>Other</option>
                      </select>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Message
                      </label>
                      <textarea
                        rows="3"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        placeholder="Describe your issue in as much detail as possible..."
                      ></textarea>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveForm(null)}
                          className="px-5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                        >
                          Back
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]">
                          <MessageSquare className="w-4 h-4" /> Send message
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* MERGED REPORT FORM (Issue + Bug) */}
                  {activeForm === "report" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h2 className="text-base font-semibold mb-1 dark:text-white">
                        Report an issue or bug
                      </h2>
                      <p className="text-xs text-gray-500 mb-4">
                        Let us know what's wrong so we can fix it.
                      </p>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-3 mb-4 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-500">
                          For immediate safety emergencies on campus, contact
                          campus security first. UniDeals reports are reviewed
                          within 24 hours.
                        </p>
                      </div>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        What are you reporting?
                      </label>
                      <select className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none">
                        <option>Select category...</option>
                        <option>Fraud or Scam Seller</option>
                        <option>Safety Concern</option>
                        <option>App Bug / Glitch</option>
                        <option>Harassment or abuse</option>
                        <option>Spam or Bot account</option>
                        <option>Inappropriate Content</option>
                      </select>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Link, User ID, or Page Section (optional)
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                        placeholder="e.g. Paste a link, user ID, or type 'My Listings'"
                      />

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tell us what happened / Steps to reproduce
                      </label>
                      <textarea
                        rows="3"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                        placeholder="Be as specific as possible. Include dates, messages, or steps to trigger the bug..."
                      ></textarea>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveForm(null)}
                          className="px-5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                        >
                          Back
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]">
                          <ShieldAlert className="w-4 h-4" /> Submit report
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* SUGGEST FEATURE FORM */}
                  {activeForm === "suggest" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h2 className="text-base font-semibold mb-1 dark:text-white">
                        Suggest a feature
                      </h2>
                      <p className="text-xs text-gray-500 mb-4">
                        Fill in the details below and we will review your idea.
                      </p>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Feature title
                      </label>
                      <input
                        type="text"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                        placeholder="e.g. Filter by hostel block"
                      />

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Describe the feature
                      </label>
                      <textarea
                        rows="2"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                        placeholder="What should it do? How would it work?"
                      ></textarea>

                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Why is it useful? (optional)
                      </label>
                      <textarea
                        rows="2"
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                        placeholder="Who benefits and how?"
                      ></textarea>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveForm(null)}
                          className="px-5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                        >
                          Back
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]">
                          <Lightbulb className="w-4 h-4" /> Submit idea
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="faq-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Response Time Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 mb-6 bg-white shadow-sm border border-gray-100 rounded-xl dark:bg-[#1a1a1a] dark:border-gray-800">
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                      <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg mr-3">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span>
                        Avg response:{" "}
                        <strong className="text-gray-900 dark:text-white font-semibold">
                          under 2 hours
                        </strong>{" "}
                        during campus hours (9 AM – 9 PM)
                      </span>
                    </div>
                    <a
                      href="mailto:hi@unideals.in"
                      className="flex items-center mt-3 sm:mt-0 px-3 py-1.5 bg-gray-50 dark:bg-[#252525] rounded-lg text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors font-medium"
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> hi@unideals.in
                    </a>
                  </div>

                  {/* FAQ Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl dark:bg-[#1f1f1f] dark:border-gray-700 p-4 lg:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-xs font-bold text-gray-400 tracking-wider">
                        FREQUENTLY ASKED
                      </h3>
                      <Headphones className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="">
                      {faqData.map((category) => (
                        <div
                          key={category.id}
                          className="border-b border-gray-50 last:border-0 dark:border-gray-800/50 pb-1"
                        >
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full flex items-center justify-between py-3 text-left focus:outline-none group"
                          >
                            <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                              {category.title}
                            </span>
                            <motion.div
                              animate={{
                                rotate: openCategory === category.id ? 180 : 0,
                              }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                            </motion.div>
                          </button>

                          {/* Nested Questions with AnimatePresence */}
                          <AnimatePresence>
                            {openCategory === category.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.25,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="pl-1 pb-4 space-y-2 pt-1">
                                  {category.questions.length > 0 ? (
                                    category.questions.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-50/80 dark:bg-[#171717] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all"
                                      >
                                        <button
                                          onClick={() => toggleQuestion(item.q)}
                                          className="w-full flex items-center justify-between p-3.5 text-left focus:outline-none group"
                                        >
                                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.q}
                                          </span>
                                          <motion.div
                                            animate={{
                                              rotate:
                                                openQuestion === item.q
                                                  ? 180
                                                  : 0,
                                            }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            <ChevronDown
                                              className={`w-4 h-4 flex-shrink-0 ml-2 transition-colors ${
                                                openQuestion === item.q
                                                  ? "text-indigo-500"
                                                  : "text-gray-400 group-hover:text-gray-600"
                                              }`}
                                            />
                                          </motion.div>
                                        </button>

                                        <AnimatePresence>
                                          {openQuestion === item.q && (
                                            <motion.div
                                              initial={{
                                                height: 0,
                                                opacity: 0,
                                              }}
                                              animate={{
                                                height: "auto",
                                                opacity: 1,
                                              }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.2 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="p-3.5 pt-0 text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100/50 dark:border-gray-800/50 mt-1">
                                                {item.a}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-gray-400 p-2 italic">
                                      No articles in this category yet.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Termscondition;
