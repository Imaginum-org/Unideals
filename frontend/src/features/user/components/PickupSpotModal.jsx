import { useState, useEffect } from "react";
import { X, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

import {
  createPickupSpot,
  updatePickupSpot,
} from "../../../features/user/api/userApi.js";

const PickupSpotModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  pickupSpotId,
  mode = "create",
}) => {
  const [formData, setFormData] = useState({
    name: "",
    detail: "",
    isPrimary: false,
  });

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Pickup spot name is required";
    if (!formData.detail.trim()) return "Pickup spot detail is required";

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) return toast.error(error);

    if (onSave) {
      setIsSubmitting(true);
      try {
        await onSave(formData);
        onClose();
      } catch {
        // onSave surfaces its own errors (toast); keep modal open for retry.
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      let res;

      if (mode === "create") {
        res = await createPickupSpot(formData);
      } else {
        res = await updatePickupSpot(pickupSpotId, formData);
      }

      if (res.data.success) {
        toast.success(
          res.data.message ||
            `Pickup spot ${mode === "create" ? "added" : "updated"}`,
        );

        onClose();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save pickup spot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`,
          );

          const data = await res.json();

          setFormData((prev) => ({
            ...prev,
            name: data.locality || data.city || "Current location",
            detail: [
              data.locality || data.city,
              data.principalSubdivision,
              data.postcode,
            ]
              .filter(Boolean)
              .join(", "),
          }));
        } catch {
          toast.error("Unable to fetch location");
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        toast.error("Location permission denied");
        setLoadingLocation(false);
      },
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm dark:bg-black/70">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-[90vw] rounded-[20px] border border-white/80 bg-white p-6 font-figtree text-[#111827] shadow-2xl shadow-slate-900/20 dark:border-[#2A2E35] dark:bg-[#181A1F] dark:text-white md:w-[450px]"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold tracking-normal text-[#111827] dark:text-white lg:text-lg">
              {mode === "create" ? "Add Pickup Spot" : "Edit Pickup Spot"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#98A1B2] transition hover:bg-slate-100 hover:text-[#4F46FF] dark:hover:bg-[#242832] dark:hover:text-white"
              aria-label="Close pickup spot modal"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={loadingLocation}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8DDEA] bg-white py-3 text-sm font-semibold text-[#334155] transition-colors hover:border-[#B8B6FF] hover:bg-[#F7F7FF] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#303641] dark:bg-[#20242B] dark:text-[#D7DEE8] dark:hover:border-[#4F46FF]/60 dark:hover:bg-[#252A35] lg:text-[15px]"
            >
              <MapPin size={18} />
              {loadingLocation ? "Locating..." : "Select Current Location"}
            </button>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Pickup spot name"
              className="w-full rounded-xl border border-[#D8DDEA] bg-[#F8FAFC] p-3 text-[12px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A1B2] focus:border-[#4F46FF] focus:bg-white focus:ring-4 focus:ring-[#4F46FF]/10 dark:border-[#303641] dark:bg-[#20242B] dark:text-white dark:placeholder:text-[#7F8A9B] dark:focus:border-[#6D66FF] dark:focus:bg-[#222732] dark:focus:ring-[#6D66FF]/15 lg:text-[13px]"
            />

            <input
              type="text"
              name="detail"
              value={formData.detail}
              onChange={handleChange}
              placeholder="Short detail, e.g. Ground floor near entrance"
              className="w-full rounded-xl border border-[#D8DDEA] bg-[#F8FAFC] p-3 text-[12px] font-medium text-[#111827] outline-none transition placeholder:text-[#98A1B2] focus:border-[#4F46FF] focus:bg-white focus:ring-4 focus:ring-[#4F46FF]/10 dark:border-[#303641] dark:bg-[#20242B] dark:text-white dark:placeholder:text-[#7F8A9B] dark:focus:border-[#6D66FF] dark:focus:bg-[#222732] dark:focus:ring-[#6D66FF]/15 lg:text-[13px]"
            />

            <div className="flex items-center gap-3 rounded-xl bg-[#F0F2FF] p-3 ring-1 ring-[#E4E6FF] dark:bg-[#22263A] dark:ring-[#343A5A]">
              <input
                type="checkbox"
                id="isPrimary"
                name="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPrimary: e.target.checked,
                  }))
                }
                className="h-4 w-4 cursor-pointer rounded accent-[#4F46FF]"
              />
              <label
                htmlFor="isPrimary"
                className="cursor-pointer text-sm font-semibold text-[#475569] dark:text-[#D7DEE8] lg:text-[13px]"
              >
                Set as primary pickup spot
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#E5E7EB] py-3 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#DDE1E8] dark:bg-[#262B34] dark:text-[#D7DEE8] dark:hover:bg-[#303642]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#4d4ef2] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-[#3b3be0] disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-blue-950/30"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PickupSpotModal;
