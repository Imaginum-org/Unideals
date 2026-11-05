import { X } from "lucide-react";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";

function LegalAgreementModal({ activeTab, onTabChange, onClose, onAccept }) {
  return (
    <div
      className="fixed font-figtree inset-0 z-50 flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-agreement-title"
    >
      <div className="flex max-h-[89dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-[#18181B] shadow-2xl dark:bg-[#131313] dark:text-white sm:max-w-3xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          {/* <div>
            <h2
              id="legal-agreement-title"
              className="font-figtree text-base font-semibold sm:text-lg"
            >
              Unideals Terms & Privacy
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 lg:text-sm">
              Review the policies before creating your account.
            </p>
          </div> */}
          <div>
            <h1
              id="legal-agreement-title"
              className="mb-1 text-[1.2rem] lg:text-xl xl:text-xl text-gray-900 dark:text-white text-base font-semibold sm:text-lg mt-1"
            >
              Terms & Privacy
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 lg:text-sm">
              Review the policies before creating your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-red-500 hover:text-white dark:hover:bg-[#1A1D20]"
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
