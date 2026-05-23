import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker, HiOutlineCash } from "react-icons/hi";
import { FaRupeeSign } from "react-icons/fa";
import axios from "../../../services/axiosInstance";
import useProductListing from "../hooks/useProductListing";
import { PRODUCT_PAYMENT_OPTIONS } from "../constants/productOptions";
import { IoArrowForward } from "react-icons/io5";
import RequiredAsterisk from "../components/shared/RequiredLabel.jsx";

const PricingStep = () => {
  const { formData, updateField, nextStep } = useProductListing();

  const [loadingAddress, setLoadingAddress] = useState(false);

  // FETCH ADDRESS
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        setLoadingAddress(true);

        const res = await axios.get("/api/address");

        const addresses = res.data?.addresses || [];

        const defaultAddress =
          addresses.find((addr) => addr.isDefault) || addresses[0];

        updateField("address", defaultAddress || null);
      } catch (error) {
        toast.error("Failed to fetch address");
        console.log(error.message);
      } finally {
        setLoadingAddress(false);
      }
    };

    if (!formData.address) {
      fetchAddress();
    }
  }, []);

  // VALIDATION
  const isValid = useMemo(() => {
    return (
      formData.sellingPrice &&
      Number(formData.sellingPrice) > 0 &&
      formData.originalPrice &&
      Number(formData.originalPrice) >= Number(formData.sellingPrice) &&
      formData.paymentMethod &&
      formData.address &&
      formData.termsAccepted
    );
  }, [formData]);

  return (
    <div className="w-full rounded-[28px] border border-[#ECECEC] bg-white shadow-sm p-5 sm:p-7 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl xl:text-2xl font-bold text-[#0F172A] dark:text-white leading-tight">
          Pricing & Pickup
        </h1>

        <p className="mt-2 xl:mt-1 text-[#475569] dark:text-[#A1A1AA] text-sm md:text-base">
          Set your fair pricing and pickup preferences.
        </p>
      </div>

      {/* Main Content */}
      <div className="mt-7 flex flex-col gap-6">
        {/* Price Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Selling Price */}
          <div className="">
            <label className="text-sm font-bold uppercase tracking-wide text-[#111827]">
              Set Your Price
              <RequiredAsterisk />
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-[#E5E7EB] overflow-hidden h-[64px]">
              <div className="w-14 h-full bg-[#F9FAFB] flex items-center justify-center">
                <FaRupeeSign className="text-[#181C1F] size-5" />
              </div>

              <input
                type="text"
                value={formData.sellingPrice}
                onChange={(e) =>
                  updateField(
                    "sellingPrice",
                    e.target.value.replace(/[^0-9]/g, ""),
                  )
                }
                placeholder="999"
                className="flex-1 -ml-2 h-full outline-none text-lg xl:text-xl font-semibold"
              />
            </div>
          </div>

          {/* Original Price */}
          <div className="">
            <label className="text-sm font-bold uppercase tracking-wide text-[#111827]">
              Original Price
              <RequiredAsterisk />
            </label>

            <div className="mt-2 flex items-center rounded-2xl border border-[#E5E7EB] overflow-hidden h-[64px]">
              <div className="w-14 h-full bg-[#F9FAFB] flex items-center justify-center">
                <FaRupeeSign className="text-[#181C1F] size-5" />
              </div>

              <input
                type="text"
                value={formData.originalPrice}
                onChange={(e) =>
                  updateField(
                    "originalPrice",
                    e.target.value.replace(/[^0-9]/g, ""),
                  )
                }
                placeholder="1499"
                className="flex-1 h-full -ml-2 outline-none text-lg xl:text-xl font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Negotiation */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#111827]">
              Allow Negotiation <RequiredAsterisk />
            </h3>

            <p className="mt-1 text-sm text-[#6B7280]">
              Let buyers negotiate your price.
            </p>
          </div>

          <button
            onClick={() => updateField("negotiable", !formData.negotiable)}
            className={`relative w-[56px] h-[32px] rounded-full transition-all duration-300
      
      ${formData.negotiable ? "bg-[#2E3FDC]" : "bg-[#D1D5DB]"}`}
          >
            <div
              className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300
          
          ${formData.negotiable ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>

        {/* Payment Method */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <HiOutlineCash size={22} className="text-[#4F46E5]" />

            <h3 className="font-bold text-[#111827]">
              Preferred Payment Method
              <RequiredAsterisk />
            </h3>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {PRODUCT_PAYMENT_OPTIONS.map((option) => {
              const isActive = formData.paymentMethod === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => updateField("paymentMethod", option.value)}
                  className={`h-[45px] min-w-[120px] px-8 rounded-2xl border text-sm font-semibold transition-all duration-200
                
                ${
                  isActive
                    ? "border-[#2E3FDC] bg-[#EEF2FF] text-[#2E3FDC]"
                    : "border-[#E5E7EB] hover:border-[#4F46E5]"
                }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pickup Section */}
        <div className="rounded-xl border bg-[#F8FAFC] p-5 md:p-6">
          {/* Top */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <HiOutlineLocationMarker size={22} className="text-[#4F46E5]" />
              </div>

              <div>
                <h3 className="font-bold text-[#111827]">Pickup Information</h3>

                <p className="mt-1 text-sm text-[#6B7280]">
                  Transparency helps build trust in the community.
                </p>
              </div>
            </div>

            <p className="text-xs font-medium text-[#2E3FDC]">
              Your default pickup details are pre-filled
            </p>
          </div>

          {/* Fields */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Campus Area */}
            <div>
              <label className="text-sm font-semibold text-[#374151]">
                Campus / Area
                <RequiredAsterisk />
              </label>

              <div className="mt-2 min-h-[110px] rounded-xl border bg-white p-4 flex flex-col justify-between">
                <div>
                  <p className="font-medium text-[#111827]">VIT Vellore</p>

                  <p className="mt-2 text-sm text-[#6B7280] leading-6">
                    Main campus location for product pickup and meetup.
                  </p>
                </div>

                <button className="mt-4 text-sm font-semibold text-[#4F46E5] self-start">
                  Change
                </button>
              </div>
            </div>

            {/* Pickup Address */}
            <div>
              <label className="text-sm font-semibold text-[#374151]">
                Pickup Address
                <RequiredAsterisk />
              </label>

              <div className="mt-2 min-h-[110px] rounded-xl border bg-white p-4 flex flex-col justify-between">
                <div>
                  {loadingAddress ? (
                    <p className="text-sm text-[#6B7280]">Loading address...</p>
                  ) : formData.address ? (
                    <>
                      <p className="font-medium text-[#111827] leading-6">
                        {formData.address.address_line ||
                          formData.address.line1}
                      </p>

                      <p className="mt-2 text-sm text-[#6B7280] leading-6">
                        {formData.address.city}, {formData.address.state}
                      </p>

                      <p className="text-sm text-[#6B7280]">
                        {formData.address.pincode}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-red-500">No address found</p>
                  )}
                </div>

                <button className="mt-4 text-sm font-semibold text-[#4F46E5] self-start">
                  <a href="/profile">Change</a>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Warning */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-[#4F46E5]">
            <span>🛡️</span>

            <span>For safety, choose a public place inside campus.</span>
          </div>
        </div>

        {/* Terms */}
        <div className="rounded-xl border bg-[#F9FAFB] p-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) => updateField("termsAccepted", e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#2E3FDC] cursor-pointer"
            />

            <p className="text-sm leading-7 text-[#6B7280]">
              I acknowledge and agree to the{" "}
              <a
                href="/termscondition"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-[#2E3FDC] hover:underline"
              >
                Terms & Conditions
              </a>
              .
              <RequiredAsterisk />
            </p>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center justify-between">
        {/* Pagination */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#9CA3AF]">Step 3 of 4</span>

          <div className="flex gap-1">
            <div className="w-3 h-[4px] rounded-full bg-[#16A34A]" />

            <div className="w-3 h-[4px] rounded-full bg-[#16A34A]" />

            <div className="w-7 h-[4px] rounded-full bg-[#4F46E5]" />

            <div className="w-3 h-[4px] rounded-full bg-[#D1D5DB]" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Continue */}
          <button
            onClick={nextStep}
            disabled={!isValid}
            className={`h-[50px] lg:h-[54px] px-4 lg:px-8 rounded-xl flex justify-center items-center gap-2 font-semibold transition-all duration-200 text-base lg:text-lg
          
          ${
            isValid
              ? "bg-[#3838EC] hover:bg-[#4338CA] text-white shadow-lg shadow-indigo-200"
              : "bg-[#3838EC] text-[#9CA3AF] cursor-not-allowed"
          }`}
          >
            <span>Preview</span>
            <IoArrowForward className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;
