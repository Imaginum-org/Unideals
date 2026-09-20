import { useNavigate } from "react-router-dom";
import { Crown, Rocket, X } from "lucide-react";

// LimitModal — shared "out of plan limit" upgrade prompt.
//
// Shows when the user hits LISTING_LIMIT / WISHLIST_LIMIT / boost quota:
//   "You're out of limit — Upgrade to continue" with Upgrade + optional
//   one-time boost shortcut. Rendered conditionally by callers:
//
//   const [limitInfo, setLimitInfo] = useState(null);
//   ...
//   catch (error) {
//     if (error?.response?.data?.code === "LISTING_LIMIT") {
//       setLimitInfo({ title, message, showBoostShortcut });
//     }
//   }
//   {limitInfo && <LimitModal ... onClose={() => setLimitInfo(null)} />}
const LimitModal = ({
  title = "You're out of limit",
  message = "You've reached your plan's limit. Upgrade to continue.",
  showBoostShortcut = false,
  onClose,
}) => {
  const navigate = useNavigate();

  const goToPricing = () => {
    onClose?.();
    navigate("/price");
  };

  const goToListings = () => {
    onClose?.();
    navigate("/productlisted");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#1c1c1c] font-figtree"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#4A3CFF]">
            <Crown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-[#09111F] dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs font-medium leading-5 text-[#5B6472] dark:text-gray-300">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#09111F] transition hover:bg-[#F2F4F9] dark:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {showBoostShortcut && (
            <button
              type="button"
              onClick={goToListings}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E6EAF2] px-4 text-[12px] font-bold text-[#09111F] transition hover:border-[#4A3CFF] hover:text-[#4A3CFF] dark:text-white"
            >
              <Rocket size={14} />
              Buy a boost ₹29+
            </button>
          )}
          <button
            type="button"
            onClick={goToPricing}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4A3CFF] px-5 text-[12px] font-extrabold text-white transition hover:bg-[#382DE8]"
          >
            Upgrade plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitModal;
