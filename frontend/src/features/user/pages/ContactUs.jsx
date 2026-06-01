import React, { useState } from "react";
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
  AlertTriangle
} from "lucide-react";

// FAQ Data Structure
const faqData = [
  {
    id: "transactions",
    title: "TRANSACTIONS",
    questions: [
      { q: "How do I track the status of a deal?", a: "Check your 'My Deals' section for real-time updates." },
      { q: "Can I return an item after buying it?", a: "Returns depend on the mutual agreement between the buyer and seller." },
      { q: "What if I got scammed or the item is not as described?", a: "Please report the user immediately using our reporting tool." }
    ]
  },
  {
    id: "safety",
    title: "SAFETY",
    questions: [
      {
        q: "Is it safe to meet a seller on campus?",
        a: "All users on UniDeals are verified students. Always meet in public, well-lit campus areas — the canteen, library lobby, or main gate. Never share home addresses or pay before inspecting the item."
      },
      { q: "What if a seller stops responding?", a: "If a seller stops responding, we recommend canceling the deal and looking for alternative listings." }
    ]
  },
  { id: "account", title: "ACCOUNT & VERIFICATION", questions: [] },
  { id: "listings", title: "LISTINGS", questions: [] }
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
          className={`h-full overflow-y-auto no-scrollbar bg-[#FBFBFB] dark:bg-[#131313] p-4 lg:p-8 ${
            userDetails?._id
              ? "w-full md:w-[63%] lg:w-[72%] xl:w-[73.5%]"
              : "mx-auto w-full max-w-5xl"
          }`}
        >
          <div className="max-w-3xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Help & Support</h1>
              <p className="text-sm text-gray-500">Find answers, report issues, or reach our team.</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search help articles..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-[#1f1f1f] dark:border-gray-700 dark:text-white"
              />
            </div>

            {/* Action Cards (Merged Bug & Issue) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setActiveForm('contact')}
                className={`p-4 text-left border rounded-xl transition-all ${activeForm === 'contact' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'} bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Contact support</h3>
                <p className="text-xs text-gray-500 mt-1">Reach our team</p>
              </button>

              <button
                onClick={() => setActiveForm('report')}
                className={`p-4 text-left border rounded-xl transition-all ${activeForm === 'report' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:border-gray-300'} bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Report an issue / bug</h3>
                <p className="text-xs text-gray-500 mt-1">Safety, fraud, or broken features</p>
              </button>

              <button
                onClick={() => setActiveForm('suggest')}
                className={`p-4 text-left border rounded-xl transition-all ${activeForm === 'suggest' ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 hover:border-gray-300'} bg-white dark:bg-[#1f1f1f] dark:border-gray-700`}
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Suggest a feature</h3>
                <p className="text-xs text-gray-500 mt-1">Share your ideas</p>
              </button>
            </div>

            {/* Dynamic Content Area */}
            {activeForm ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1f1f1f] p-5 relative mb-6 animate-in fade-in slide-in-from-top-4">
                <button
                  onClick={() => setActiveForm(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* CONTACT FORM */}
                {activeForm === 'contact' && (
                  <div>
                    <h2 className="text-base font-semibold mb-1 dark:text-white">Contact support</h2>
                    <p className="text-xs text-gray-500 mb-4">Fill in the details below and we will follow up.</p>
                    
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                    <select className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white">
                      <option>Select a topic</option>
                      <option>Account assistance</option>
                      <option>Deal inquiries</option>
                      <option>Other</option>
                    </select>

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                    <textarea 
                      rows="3" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none"
                      placeholder="Describe your issue in as much detail as possible..."
                    ></textarea>

                    <div className="flex gap-3">
                      <button onClick={() => setActiveForm(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                      <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        <MessageSquare className="w-4 h-4" /> Send message
                      </button>
                    </div>
                  </div>
                )}

                {/* MERGED REPORT FORM (Issue + Bug) */}
                {activeForm === 'report' && (
                  <div>
                    <h2 className="text-base font-semibold mb-1 dark:text-white">Report an issue or bug</h2>
                    <p className="text-xs text-gray-500 mb-4">Let us know what's wrong so we can fix it.</p>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-3 mb-4 flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800 dark:text-yellow-500">For immediate safety emergencies on campus, contact campus security first. UniDeals reports are reviewed within 24 hours.</p>
                    </div>

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">What are you reporting?</label>
                    <select className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white focus:ring-1 focus:ring-indigo-500">
                      <option>Select category...</option>
                      <option>Fraud or Scam</option>
                      <option>Safety Concern</option>
                      <option>App Bug / Glitch</option>
                      <option>Inappropriate Content</option>
                    </select>

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Link, User ID, or Page Section (optional)</label>
                    <input 
                      type="text" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white"
                      placeholder="e.g. Paste a link, user ID, or type 'My Listings'"
                    />

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tell us what happened / Steps to reproduce</label>
                    <textarea 
                      rows="3" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none"
                      placeholder="Be as specific as possible. Include dates, messages, or steps to trigger the bug..."
                    ></textarea>

                    <div className="flex gap-3">
                      <button onClick={() => setActiveForm(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                      <button className="flex-1 flex items-center justify-center gap-2 bg-[#F14646] hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        <ShieldAlert className="w-4 h-4" /> Submit report
                      </button>
                    </div>
                  </div>
                )}

                {/* SUGGEST FEATURE FORM */}
                {activeForm === 'suggest' && (
                  <div>
                    <h2 className="text-base font-semibold mb-1 dark:text-white">Suggest a feature</h2>
                    <p className="text-xs text-gray-500 mb-4">Fill in the details below and we will review your idea.</p>
                    
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Feature title</label>
                    <input 
                      type="text" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white"
                      placeholder="e.g. Filter by hostel block"
                    />

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Describe the feature</label>
                    <textarea 
                      rows="2" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none"
                      placeholder="What should it do? How would it work?"
                    ></textarea>

                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Why is it useful? (optional)</label>
                    <textarea 
                      rows="2" 
                      className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4 bg-white dark:bg-[#131313] dark:text-white resize-none"
                      placeholder="Who benefits and how?"
                    ></textarea>

                    <div className="flex gap-3">
                      <button onClick={() => setActiveForm(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">Back</button>
                      <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        <Lightbulb className="w-4 h-4" /> Submit idea
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Response Time Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 mb-6 bg-gray-50 border border-gray-100 rounded-lg dark:bg-[#1a1a1a] dark:border-gray-800">
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Avg response: <strong className="text-gray-900 dark:text-white font-semibold">under 2 hours</strong> during campus hours (9 AM – 9 PM)</span>
                  </div>
                  <a href="mailto:hi@unideals.in" className="flex items-center mt-2 sm:mt-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                    <Mail className="w-4 h-4 mr-1.5" /> hi@unideals.in
                  </a>
                </div>

                {/* FAQ Section */}
                <div className="bg-white border border-gray-200 rounded-xl dark:bg-[#1f1f1f] dark:border-gray-700 p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xs font-bold text-gray-400 tracking-wider">FREQUENTLY ASKED</h3>
                    <Headphones className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="space-y-1">
                    {faqData.map((category) => (
                      <div key={category.id} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full flex items-center justify-between py-3 text-left focus:outline-none"
                        >
                          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                            {category.title}
                          </span>
                          {openCategory === category.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {/* Nested Questions */}
                        {openCategory === category.id && (
                          <div className="pl-2 pb-3 space-y-2">
                            {category.questions.length > 0 ? (
                              category.questions.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-[#131313] rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                                  <button
                                    onClick={() => toggleQuestion(item.q)}
                                    className="w-full flex items-center justify-between p-3 text-left focus:outline-none"
                                  >
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.q}</span>
                                    {openQuestion === item.q ? (
                                      <ChevronUp className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                  </button>
                                  {openQuestion === item.q && (
                                    <div className="p-3 pt-0 text-xs text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 mt-2">
                                      {item.a}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 p-2">No articles in this category yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Termscondition;