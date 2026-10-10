import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBox,
  FiClock,
  FiMessageSquare,
  FiChevronRight,
  FiMapPin,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import DeleteProductModal from "../../product/components/DeleteProductModal.jsx";
import UnlistProductModal from "../../product/components/UnlistProductModal.jsx";
import RelistProductModal from "../../product/components/RelistProductModal.jsx";
import {
  deleteProduct,
  unlistProduct,
  relistProduct,
} from "../../product/api/productApi.js";
import { toast } from "../../../components/ui/toast.js";

const steps = [
  { id: 1, label: "Order Placed" },
  { id: 2, label: "Confirmed" },
  { id: 3, label: "Meeting Scheduled" },
  { id: 4, label: "Completed" },
];

const MyOrdersCard = ({
  orderId,
  placedOn,
  imageUrl,
  name,
  color,
  attr,
  status,
  price,
  sellerName = "",
  location = "",
  isOwnListing = false,
  onProductDeleted,
  onProductUnlisted,
  onProductRelisted,
}) => {
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [unlistModalOpen, setUnlistModalOpen] = useState(false);
  const [relistModalOpen, setRelistModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);
  const [isRelisting, setIsRelisting] = useState(false);

  const normalized = (status || "").toLowerCase().trim();

  let currentStep = 1;
  if (normalized === "confirmed") currentStep = 2;
  if (normalized === "in progress") currentStep = 3;
  if (normalized === "delivered") currentStep = 4;

  const handleArrowClick = () => {
    navigate(`/product/${orderId}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // Logic Handlers
  const handleDeleteProduct = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteProduct(orderId);
      if (res.data.success) {
        toast.success("Product deleted successfully");
        if (onProductDeleted) onProductDeleted(orderId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnlistProduct = async () => {
    try {
      setIsUnlisting(true);
      const res = await unlistProduct(orderId);
      if (res.data.success) {
        toast.success("Product unlisted successfully");
        if (onProductUnlisted) onProductUnlisted(orderId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to unlist product");
    } finally {
      setIsUnlisting(false);
    }
  };

  const handleRelistProduct = async () => {
    try {
      setIsRelisting(true);
      const res = await relistProduct(orderId);
      if (res.data.success) {
        toast.success("Product relisted successfully");
        if (onProductRelisted) onProductRelisted(orderId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to relist product");
    } finally {
      setIsRelisting(false);
    }
  };

  // Badge Status & Icon Logic
  let badgeStyles =
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  let StatusIcon = null;

  if (normalized === "in progress") {
    badgeStyles =
      "bg-[#FFF4E5] text-[#F59E0B] dark:bg-amber-900/20 dark:text-amber-500";
    StatusIcon = FiTruck;
  } else if (normalized === "delivered") {
    badgeStyles =
      "bg-[#E6FFEB] text-[#008526] dark:bg-emerald-900/20 dark:text-emerald-400";
    StatusIcon = FiCheckCircle;
  } else if (normalized === "cancelled" || normalized === "canceled") {
    badgeStyles =
      "bg-[#FFECEC] text-[#D12929] dark:bg-red-900/20 dark:text-red-500";
    StatusIcon = FiXCircle;
  }

  return (
    <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden font-figtree mb-1">
      {/* 1. HEADER ROW */}
      <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 bg-gray-100 dark:bg-[#242424] flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
          <FiBox size={16} />
          <span>#{orderId}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FiClock size={14} />
            {placedOn}
          </div>
          <div
            className={`text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${badgeStyles}`}
          >
            {StatusIcon && <StatusIcon size={14} strokeWidth={2.5} />}
            {status}
          </div>
        </div>
      </div>

      {/* 2. PRODUCT INFO BODY */}
      <div className="py-4 px-4 md:px-5 md:py-4">
        <div className="flex items-start gap-5">
          <img
            className="w-12 h-12 md:w-[5vw] md:h-[5vw] rounded-xl object-cover bg-gray-100 dark:bg-gray-800 border border-gray-50 dark:border-gray-700"
            src={imageUrl}
            alt={name}
          />
          <div className="flex-1">
            <h3 className="text-base lg:text-base font-bold text-gray-900 dark:text-white leading-tight">
              {name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-[1vh] text-xs text-gray-500 dark:text-gray-400">
              {isOwnListing ? (
                <span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  Your listing
                </span>
              ) : (
                <>
                  {sellerName ? (
                    <span className="font-medium text-gray-800">
                      Seller:{" "}
                      <span className="text-gray-400 font-normal">{sellerName}</span>
                    </span>
                  ) : null}
                  {location ? (
                    <>
                      <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                      <span className="flex items-center gap-1">
                        <FiMapPin size={12} className="text-gray-400" /> {location}
                      </span>
                    </>
                  ) : null}
                </>
              )}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-3">
              ₹{price}
            </div>
          </div>
        </div>

        {/* 3. STEPPER (Only for Non-Cancelled) */}
        {normalized !== "cancelled" && normalized !== "canceled" && (
          <div className="mt-6 mb-4 px-2 lg:px-4">
            <div className="flex items-center justify-between relative">
              {steps.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <div
                    key={step.id}
                    className="flex-1 flex items-center last:flex-none relative"
                  >
                    {/* The Node */}
                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-6 h-6 mx-3 md:mx-5 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
                          isCompleted || isCurrent
                            ? "bg-[#364EF2] text-white"
                            : "bg-[#F7F8FA] dark:bg-[#1c1c1c] border-2 border-gray-200 dark:border-gray-700 text-gray-400"
                        } ${
                          isCurrent
                            ? "ring-4 ring-blue-50 dark:ring-blue-900/20"
                            : ""
                        }`}
                      >
                        {isCompleted ? <MdCheck size={13} /> : step.id}
                      </div>

                      {/* Label Positioned Absolutely underneath */}
                      <span className="absolute top-8 text-[10px] lg:text-[11px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap text-center">
                        {step.label}
                      </span>
                    </div>

                    {/* The Connecting Line */}
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-[2px] mx-[-4px] transition-colors duration-300 ${
                          currentStep > index + 1
                            ? "bg-[#364EF2]"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Added spacer to prevent label overlap with footer */}
            <div className="h-4"></div>
          </div>
        )}
      </div>

      {/* 4. FOOTER ACTIONS ROW */}
      <div className="px-5 py-3 bg-gray-100 dark:bg-[#1A1D20]/50 border-t border-gray-50 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-2">
        {isOwnListing ? (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Your listing
          </span>
        ) : (
          <button
            onClick={() => navigate(`/chat?seller=${orderId}`)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <FiMessageSquare size={16} />
            Contact Seller
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {normalized !== "delivered" && normalized !== "sold" && (
            <>
              {normalized === "unlisted" ? (
                <button
                  onClick={() => setRelistModalOpen(true)}
                  className="rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-[#364EF2] transition-colors hover:bg-blue-50 dark:border-gray-700 dark:bg-[#1c1c1c] dark:hover:bg-blue-900/10"
                >
                  Relist
                </button>
              ) : (
                <button
                  onClick={() => setUnlistModalOpen(true)}
                  className="rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-[#F7F8FA] dark:border-gray-700 dark:bg-[#1c1c1c] dark:text-gray-300"
                >
                  Unlist
                </button>
              )}
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:border-gray-700 dark:bg-[#1c1c1c]"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={handleArrowClick}
            className="flex items-center gap-1 text-xs font-bold text-[#364EF2] hover:text-blue-700 transition-colors"
          >
            View Details
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* MODALS */}
      <DeleteProductModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteProduct}
        productName={name}
        isLoading={isDeleting}
      />
      <UnlistProductModal
        isOpen={unlistModalOpen}
        onClose={() => setUnlistModalOpen(false)}
        onConfirm={handleUnlistProduct}
        productName={name}
        isLoading={isUnlisting}
      />
      <RelistProductModal
        isOpen={relistModalOpen}
        onClose={() => setRelistModalOpen(false)}
        onConfirm={handleRelistProduct}
        productName={name}
        isLoading={isRelisting}
      />
    </div>
  );
};

export default MyOrdersCard;