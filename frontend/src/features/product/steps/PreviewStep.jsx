import { useState } from "react";
import toast from "react-hot-toast";
import { HiOutlinePencil } from "react-icons/hi";
import { GoRocket } from "react-icons/go";
import { FaRupeeSign } from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "../../../services/axiosInstance";
import { uploadImage } from "../../../Utils/imageUpload.js";
import { compressImage } from "../utils/imageCompression";
import useProductListing from "../hooks/useProductListing";
import { saveDraftProduct } from "../api/productApi.js";
import { RiGraduationCapLine } from "react-icons/ri";
import { MdOutlineLocationOn } from "react-icons/md";

const PreviewStep = () => {
  const navigate = useNavigate();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [publishStage, setPublishStage] = useState("");

  const { formData, goToStep, loading, setLoading, resetForm } =
    useProductListing();

  // DISCOUNT
  // const discountPercentage = useMemo(() => {
  //   if (!formData.originalPrice || !formData.sellingPrice) return 0;

  //   const original = Number(formData.originalPrice);

  //   const selling = Number(formData.sellingPrice);

  //   return Math.round(((original - selling) / original) * 100);
  // }, [formData.originalPrice, formData.sellingPrice]);

  // SAVE DRAFT
  const handleSaveDraft = async () => {
    if (loading) return;
    try {
      setLoading(true);

      await saveDraftProduct({
        status: "draft",
        title: formData.title.trim(),

        description: formData.description.trim(),

        category: formData.category,

        condition: formData.condition,

        selling_price: Number(formData.sellingPrice),

        original_price: Number(formData.originalPrice),

        is_negotiable: formData.negotiable,

        payment_preference: formData.paymentMethod,

        meetup_location: formData.meetupLocation,

        attributes: {
          brand: formData.brand,

          color: formData.color,

          usage_duration: formData.usageDuration,
          purchase_date: formData.purchaseDate || null,
        },
      });

      toast.success("Draft saved successfully");
    } catch (error) {
      toast.error("Failed to save draft");
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  // SUBMIT
  const handlePublish = async () => {
    if (loading) return;

    try {
      setLoading(true);
      // Compress + Upload Images
      setPublishStage("Preparing Images...");

      const compressedImages = await Promise.all(
        formData.images.map(async (file) => {
          const compressedFile = await compressImage(file);
          return compressedFile;
        }),
      );

      setPublishStage("Uploading Images...");

      const uploads = await Promise.all(
        compressedImages.map((file) => uploadImage(file)),
      );

      const uploadedUrls = uploads.map((img) => img.url);

      const uploadedFileIds = uploads.map((img) => img.fileId);

      setPublishStage("Publishing Listing...");

      // Create Product
      const response = await axios.post("/api/product", {
        title: formData.title.trim(),

        description: formData.description.trim(),

        category: formData.category,

        condition: formData.condition,

        selling_price: Number(formData.sellingPrice),

        original_price: Number(formData.originalPrice),

        is_negotiable: formData.negotiable,

        payment_preference: formData.paymentMethod,

        images: uploads,

        pickup_address_snapshot: {
          address_line:
            formData.address?.address_line || formData.address?.line1,

          city: formData.address?.city,

          state: formData.address?.state,

          pincode: formData.address?.pincode,
        },

        meetup_location: formData.meetupLocation,

        attributes: {
          brand: formData.brand,

          color: formData.color,

          usage_duration: formData.usageDuration,
          purchase_date: formData.purchaseDate || null,
        },
      });

      console.log("FULL RESPONSE", response.data);

      console.log("IS FIRST LISTING", response.data.isFirstListing);

      const isFirstListing = Boolean(response?.data?.isFirstListing);

      setPublishStage("");
      resetForm();
      setSelectedImageIndex(0);

      navigate("/", {
        state: {
          listingCreated: true,
          isFirstListing,
        },
      });
    } catch (error) {
      setPublishStage("");
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong",
      );
    } finally {
      setLoading(false);
      setPublishStage("");
    }
  };

  const formattedPurchaseDate = formData.purchaseDate
    ? new Date(formData.purchaseDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="w-full min-w-0 shadow-sm font-figtree">
      {/* Success Banner */}
      <div className="rounded-xl bg-[#F0F9F4] border border-[#D7F0DE] px-4 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
          <MdVerified className="text-[#16A34A]" size={24} />
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#111827]">
            Your listing is ready!
          </h3>

          <p className="mt-1 text-sm text-[#475569]">
            Review your product details before publishing.
          </p>
        </div>
      </div>

      {/* Main Product Card */}
      <div className="mt-5 shadow-sm rounded-xl border bg-white p-4 md:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[520px_minmax(0,1fr)] gap-9">
          {/* LEFT */}
          <div>
            {/* Main Image */}
            <div className="overflow-hidden rounded-2xl border border-[#ECECEC]">
              {formData.imagePreviews?.[0] ? (
                <img
                  src={formData.imagePreviews?.[selectedImageIndex]?.preview}
                  alt="Product"
                  className="w-full aspect-square object-cover transition-all duration-300"
                />
              ) : (
                <div className="w-full aspect-square bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF]">
                  No Image
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="mt-5 flex items-center gap-4 overflow-x-auto overflow-y-hidden">
              {formData.imagePreviews?.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-[84px] h-[84px] rounded-2xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0

  ${
    selectedImageIndex === index
      ? "border-[#4F46E5] scale-105 shadow-lg shadow-indigo-100"
      : "border-[#ECECEC] hover:border-[#C7D2FE]"
  }`}
                >
                  <img
                    src={image.preview}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col min-w-0">
            {/* Category */}
            <div className="inline-flex self-start rounded-full bg-[#EEF2FF] px-4 py-1 text-xs font-bold uppercase tracking-wide text-[#4F46E5]">
              {formData.category?.replaceAll("_", " ")}
            </div>

            {/* Title */}
            <h1 className="mt-4 text-[2rem] md:text-4xl leading-tight font-extrabold text-[#181C1F] break-words overflow-hidden">
              {formData.title}
            </h1>

            {/* Price */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center text-[#2E3FDC]">
                <FaRupeeSign size={26} />

                <span className="text-3xl font-extrabold leading-none">
                  {formData.sellingPrice}
                </span>
              </div>

              {formData.originalPrice && (
                <div className="text-2xl flex items-center text-[#9CA3AF] line-through font-normal">
                  <FaRupeeSign size={22} />
                  {formData.originalPrice}
                </div>
              )}

              {formData.negotiable && (
                <div className="rounded-lg bg-[#EEF2FF] px-4 py-1 text-xs font-bold uppercase tracking-wide text-[#4F46E5] ml-7">
                  Negotiable
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mt-8 border-t border-[#ECECEC]" />

            {/* Meetup */}
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <RiGraduationCapLine size={20} className="text-[#2E3FDC]" />

                <p className="text-[15px] text-[#454655]">
                  Campus:{" "}
                  <span className="font-semibold text-[#111827]">
                    VIT Vellore
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <MdOutlineLocationOn size={20} className="text-[#2E3FDC]" />

                <p className="text-[15px] text-[#454655]">
                  Meetup:{" "}
                  <span className="font-semibold text-[#111827]">
                    {formData.meetupLocation}
                  </span>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-10">
              <h2 className="text-base font-bold text-[#454655]">
                About This Product
              </h2>

              <p className="mt-1 text-[15px] leading-8 text-[#454655] whitespace-pre-line break-words">
                {formData.description}
              </p>
            </div>

            {/* Details */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ">
              <div>
                <p className="text-sm font-semibold text-[#454655]">
                  Product Condition
                </p>

                <p className="mt-2 text-[15px] font-semibold text-[#16A34A] capitalize">
                  {formData.condition?.replaceAll("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#454655]">
                  Usage Duration
                </p>

                <p className="mt-2 text-[15px] text-[#6B7280] capitalize break-words">
                  {formData.usageDuration?.replaceAll("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#454655]">
                  Date of Purchase
                </p>

                <p className="mt-2 text-[15px] text-[#6B7280]">
                  {formattedPurchaseDate}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#454655]">
                  Mode of Payment
                </p>

                <p className="mt-2 text-[15px] text-[#6B7280] capitalize">
                  {formData.paymentMethod}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#454655]">Brand</p>

                <p className="mt-2 text-[15px] text-[#6B7280] capitalize">
                  {formData.brand || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#454655]">Color</p>

                <p className="mt-2 text-[15px] text-[#6B7280] capitalize">
                  {formData.color || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-14 flex flex-col items-center">
          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={loading}
            className={`w-full max-w-[360px] h-[62px] rounded-2xl font-bold text-lg transition-all duration-200
              
              ${
                loading
                  ? "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                  : "bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xl shadow-indigo-200"
              }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{publishStage}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <span>Publish Now</span>
                <GoRocket />
              </div>
            )}
          </button>

          {/* Bottom Links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm">
            <button
              onClick={() => goToStep(1)}
              className="flex items-center gap-2 text-[#4B5563] hover:text-[#111827]"
            >
              <HiOutlinePencil size={16} />
              Edit Listing
            </button>

            <div className="w-[4px] h-[4px] rounded-full bg-[#D1D5DB]" />

            <button
              disabled={loading}
              onClick={handleSaveDraft}
              className="text-[#4B5563] hover:text-[#111827]"
            >
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewStep;
