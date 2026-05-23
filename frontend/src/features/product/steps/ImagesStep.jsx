import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { HiOutlineTrash } from "react-icons/hi";
import useProductListing from "../hooks/useProductListing";
import { RiCameraAiLine } from "react-icons/ri";
import { IoArrowForward } from "react-icons/io5";
import { IoArrowBack } from "react-icons/io5";
import { fileToBase64 } from "../utils/imageHelpers";

const MAX_IMAGES = 3;

const ImagesStep = () => {
  const fileInputRef = useRef(null);

  const { formData, updateField, nextStep, prevStep } = useProductListing();

  const [isDragging, setIsDragging] = useState(false);

  // VALIDATION
  const isValid = useMemo(() => {
    return formData.images.length > 0;
  }, [formData.images]);


  // PROCESS FILES
const processFiles = async (files) => {
  const fileArray = Array.from(files);

  const remainingSlots = MAX_IMAGES - formData.images.length;

  if (remainingSlots <= 0) {
    toast.error(`Maximum ${MAX_IMAGES} images allowed`);

    return;
  }

  const selectedFiles = fileArray.slice(0, remainingSlots);

  const validFiles = [];

  const previewItems = [];

  for (const file of selectedFiles) {
    if (
      !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Only PNG, JPG & WEBP images are allowed");

      continue;
    }

    try {
      const base64 = await fileToBase64(file);

      validFiles.push(file);

      previewItems.push({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,

        preview: base64,
      });
    } catch (error) {
      console.error(error);

      toast.error("Failed to process image");
    }
  }

  if (validFiles.length === 0) return;

  updateField("images", [...formData.images, ...validFiles]);

  updateField("imagePreviews", [...formData.imagePreviews, ...previewItems]);
};

  // INPUT CHANGE
  const handleInputChange = (e) => {
    processFiles(e.target.files);

    e.target.value = null;
  };

  // REMOVE IMAGE
  const handleRemoveImage = (index) => {
    const updatedImages = [...formData.images];

    const updatedPreviews = [...formData.imagePreviews];

    updatedImages.splice(index, 1);

    updatedPreviews.splice(index, 1);

    updateField("images", updatedImages);

    updateField("imagePreviews", updatedPreviews);
  };

  const handleSetCover = (index) => {
    if (index === 0) return;

    const updatedPreviews = [...formData.imagePreviews];

    const selectedPreview = updatedPreviews[index];

    updatedPreviews.splice(index, 1);

    updatedPreviews.unshift(selectedPreview);

    const updatedImages = [...formData.images];

    const selectedImage = updatedImages[index];

    updatedImages.splice(index, 1);

    updatedImages.unshift(selectedImage);

    updateField("imagePreviews", updatedPreviews);

    updateField("images", updatedImages);
  };

  // DRAG EVENTS
  const handleDragOver = (e) => {
    e.preventDefault();

    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();

    setIsDragging(false);

    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full rounded-[28px] border border-[#ECECEC] bg-white shadow-sm p-5 sm:p-7 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl xl:text-2xl font-bold text-[#0F172A] dark:text-white leading-tight">
          Product Images
        </h1>

        <p className="mt-2 xl:mt-1 text-[#475569] dark:text-[#A1A1AA] text-sm md:text-base">
          Upload 1-3 high-quality photos to give buyers a complete view.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className={`mt-4 rounded-[28px] border-2 bg-[#F8FAFC] border-dashed p-8 md:p-10 transition-all duration-200 cursor-pointer
        
        ${isDragging ? "border-[#4F46E5] bg-[#F8FAFC]" : "border-[#D1D5DB]"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-3xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
            <RiCameraAiLine size={25} />
          </div>

          {/* Heading */}
          <h3 className="mt-2 text-base xl:text-lg font-bold text-[#181C1F]">
            Drag & drop or click to browse
          </h3>

          {/* Description */}
          <p className="mt-1 max-w-md text-sm md:text-base text-[#6B7280] leading-7">
            Supports JPG, PNG and WEBP up to 10MB
          </p>

          {/* Info */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-semibold text-[#4F46E5]">
              Max {MAX_IMAGES} images
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Images */}
      {formData.imagePreviews.length > 0 && (
        <div className="mt-5">
          {/* Top */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#111827]">
              Uploaded Images
            </h3>

            <p className="text-sm text-[#6B7280]">
              {formData.imagePreviews.length}/{MAX_IMAGES}
            </p>
          </div>

          {/* Grid */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            {formData.imagePreviews.map((imageItem, index) => (
              <div
                key={imageItem.id}
                className="group relative rounded-[24px] overflow-hidden border border-[#ECECEC] cursor-pointer"
              >
                {/* Cover Badge */}
                {index === 0 && (
                  <div className="absolute top-3 left-3 z-20 rounded-full bg-[#4F46E5] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Cover
                  </div>
                )}

                {/* Hover Badge */}
                {index !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      handleSetCover(index);
                    }}
                    className="absolute top-3 left-3 z-20 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    Set as cover
                  </button>
                )}

                {/* Image */}
                <img
                  src={imageItem.preview}
                  alt={`Preview ${index}`}
                  loading="lazy"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = "/images/placeholder-image.png";
                  }}
                  className="w-full aspect-square object-cover select-none"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();

                      handleRemoveImage(index);
                    }}
                    className="w-12 h-12 rounded-full bg-white text-red-500 flex items-center justify-center shadow-lg"
                  >
                    <HiOutlineTrash size={22} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Helper Text */}
          <p className="mt-3 text-sm text-[#6B7280]">
            Tap or hover on an image to make it the cover photo.
          </p>
        </div>
      )}

      {/* Warning Card */}
      <div className="mt-7 rounded-[24px] border border-[#FDE68A] bg-[#FEFCE8] p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#92400E]">
          Important
        </h3>

        <p className="mt-3 text-sm leading-7 text-[#78350F]">
          Upload atleast 1 clear and authentic product photos. Listings with
          high-quality images receive significantly better engagement and buyer
          trust.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center justify-between">
        {/* Pagination */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#9CA3AF]">Step 2 of 4</span>

          <div className="flex gap-1">
            <div className="w-3 h-[4px] rounded-full bg-[#16A34A]" />

            <div className="w-7 h-[4px] rounded-full bg-[#4F46E5]" />

            <div className="w-3 h-[4px] rounded-full bg-[#D1D5DB]" />

            <div className="w-3 h-[4px] rounded-full bg-[#D1D5DB]" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Back */}
          <button
            onClick={prevStep}
            className="h-[54px] px-4 lg:px-8 rounded-xl border flex justify-center items-center border-[#D1D5DB] text-[#111827] font-semibold hover:bg-[#F9FAFB] transition-all duration-200 gap-2"
          >
            <IoArrowBack className="size-5" /> <span>Back</span>
          </button>

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
            <span>Continue</span>
            <IoArrowForward className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagesStep;
