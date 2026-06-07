import { X } from "lucide-react";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";

function LegalAgreementModal({ activeTab, onTabChange, onClose, onAccept }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-agreement-title"
    >
      <div className=" relative flex max-h-[89dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#F7F9FD] text-[#18181B] shadow-2xl dark:bg-[#131313] dark:text-white sm:max-w-3xl sm:rounded-2xl">
        <div className=" dark:border-zinc-800  mt-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-2 rounded-full p-1 text-gray-500 transition hover:bg-red-500 hover:text-white dark:hover:bg-[#1A1D20]"
            aria-label="Close legal agreement"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <LegalDocument type={activeTab} compact />
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <button
            type="button"
            onClick={onAccept}
            className="h-10 rounded-xl bg-[#393AF2] px-5 text-sm font-semibold text-white transition hover:bg-[#2829D8]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalAgreementModal;
