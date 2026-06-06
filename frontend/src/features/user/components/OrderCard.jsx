import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiEye,
  FiHeart,
  FiMessageSquare,
  FiEdit2,
  FiEyeOff,
  FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";
import { IoRocketOutline } from "react-icons/io5";

import DeleteProductModal from "../../product/components/DeleteProductModal.jsx";
import UnlistProductModal from "../../product/components/UnlistProductModal.jsx";
import RelistProductModal from "../../product/components/RelistProductModal.jsx";
import {
  deleteProduct,
  unlistProduct,
  relistProduct,
} from "../../product/api/productApi.js";
import toast from "react-hot-toast";

const OrderCard = ({
  orderId,
  placedOn,
  imageUrl,
  name,
  color,
  attr,
  status,
  price,
  viewsCount = 0,
  wishlistedCount = 0,
  onProductDeleted,
  onProductUnlisted,
  onProductRelisted,
}) => {
  const navigate = useNavigate();
  const handleCardClick = () => {
    navigate(`/product/${orderId}`);
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [unlistModalOpen, setUnlistModalOpen] = useState(false);
  const [relistModalOpen, setRelistModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);
  const [isRelisting, setIsRelisting] = useState(false);

  const normalized = (status || "").toLowerCase().trim();
  const isActive =
    normalized === "listed" ||
    normalized === "active" ||
    normalized === "in progress";
  const isUnlisted = normalized === "unlisted";
  const isDelivered = normalized === "delivered" || normalized === "sold";

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

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden font-figtree cursor-pointer transition-shadow hover:shadow-md"
    >
      {/* 1. HEADER */}
      <div className="px-4 sm:px-6 py-3.5 border-b bg-gray-100 border-gray-50 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] sm:text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate flex-1 pr-2">
          {isActive ? `#product id : ${orderId}` : `#Order id : ${orderId}`}
        </div>

        {isActive ? (
          <div className="bg-[#E6FFEB] text-[#008526] dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase shrink-0">
            ACTIVE
          </div>
        ) : (
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Listed on : {placedOn}
          </div>
        )}
      </div>

      {/* 2. BODY */}
      <div className="p-4 sm:p-6 pb-4 sm:pb-5 flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <img
            className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] shrink-0 rounded-xl object-cover bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            src={imageUrl}
            alt={name || "product"}
          />
          <div className="flex flex-col justify-center flex-1">
            <h3 className="text-[15px] sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
              {name}
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {color} | {attr}
            </div>

            {/* Dynamic Status Row below title */}
            {isActive ? (
              <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-2 sm:mt-3 font-medium">
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <FiEye size={14} /> {viewsCount || 0}
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <FiHeart size={14} /> {wishlistedCount || 0}
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <FiMessageSquare size={14} /> 3
                </span>
              </div>
            ) : (
              <div className="mt-2 sm:mt-3">
                <span
                  className={`px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold ${
                    isDelivered
                      ? "bg-[#E6FFEB] text-[#008526] dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {isDelivered ? "Delivered" : "Unlisted"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NEW PRICE LAYOUT: 
          On mobile -> flex-row with split ends and a top border to separate it cleanly.
          On desktop -> stacks vertically aligned to the right. 
        */}
        <div className="flex sm:block flex-row items-center justify-between w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-800/50">
          <div className="text-left sm:text-right">
            <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">
              Total Price
            </div>
            {isActive && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 block sm:hidden mt-0.5">
                1 week ago
              </div>
            )}
          </div>

          <div className="text-right sm:text-right">
            <div className="text-[17px] sm:text-lg font-bold text-gray-900 dark:text-white">
              ₹{price}
            </div>
            {isActive && (
              <div className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block mt-1">
                1 week ago
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. FOOTER ACTIONS */}
      <div
        className={`px-4 sm:px-6 py-4 bg-gray-50/30 dark:bg-[#1A1D20]/30 border-t border-gray-50 dark:border-gray-800/50 flex flex-col sm:flex-row items-center gap-3 ${
          isActive || isDelivered ? "sm:justify-between" : "sm:justify-end"
        }`}
      >
        {isActive && (
          <>
            {/* Boost button full width on mobile, normal on desktop */}
            <button className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#3838EC] text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 flex justify-center items-center gap-2 shrink-0">
              <IoRocketOutline size={16} />
              <span>Boost Visibility</span>
            </button>

            {/* Secondary actions span evenly on mobile, group right on desktop */}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex-1 sm:flex-none justify-center px-2 sm:px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors flex items-center gap-1.5 sm:gap-2"
              >
                <FiEdit2 size={14} />
                <span className="sm:hidden text-xs">Edit</span>
                <span className="hidden sm:inline">Edit Details</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUnlistModalOpen(true);
                }}
                disabled={isUnlisting}
                className="flex-1 sm:flex-none justify-center px-2 sm:px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
              >
                <FiEyeOff size={14} />
                <span className="text-xs sm:text-[13px]">
                  {isUnlisting ? "..." : "Unlist"}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModalOpen(true);
                }}
                disabled={isDeleting}
                className="flex-1 sm:flex-none justify-center px-2 sm:px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-red-500 rounded-lg text-[13px] font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
              >
                <FiTrash2 size={14} />
                <span className="text-xs sm:text-[13px]">Delete</span>
              </button>
            </div>
          </>
        )}

        {isUnlisted && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRelistModalOpen(true);
              }}
              disabled={isRelisting}
              className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-[#364EF2] dark:text-blue-400 rounded-lg text-[13px] font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiRefreshCw size={14} />
              {isRelisting ? "..." : "Relist Product"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModalOpen(true);
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto justify-center py-2.5 sm:p-2.5 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiTrash2 size={16} />
              <span className="sm:hidden text-[13px]">Delete</span>
            </button>
          </div>
        )}

        {isDelivered && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:justify-between">
            <div className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 italic text-center sm:text-left w-full sm:w-auto">
              This order is completed. Actions are limited.
            </div>
            <button className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 text-[#364EF2] dark:text-blue-400 rounded-lg text-[13px] font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center gap-2">
              View Delivery Details
            </button>
          </div>
        )}
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

export default OrderCard;
