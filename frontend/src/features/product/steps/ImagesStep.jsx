import { useRef, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { HiOutlineTrash } from "react-icons/hi";
import useProductListing from "../hooks/useProductListing";
import PhoneHandoffCard from "../../handoff/components/PhoneHandoffCard.jsx";
import { RiCameraAiLine } from "react-icons/ri";
import { IoArrowForward } from "react-icons/io5";
import { validateImages } from "../validations";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

const ImagesStep = () => {
  const fileInputRef = useRef(null);

  const { formData, updateField, nextStep, errors, validateAndProceed } =
    useProductListing();

  const [isDragging, setIsDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);
  // Tracks phone-delivered fileIds so repeat polls never re-add them.
  const phoneFileIds = useRef(new Set());
  // Live mirror of blob URLs for reliable revoke-on-unmount (avoids stale closure).
  const blobUrlsRef = useRef(new Set());
  const previewsRef = useRef([]);
  previewsRef.current = formData.imagePreviews || [];
  const trackBlob = (url) => {
    if (url?.startsWith("blob:")) blobUrlsRef.current.add(url);
  };
  const untrackBlob = (url) => {
    if (url?.startsWith("blob:")) {
      blobUrlsRef.current.delete(url);
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  // PROCESS FILES
  // Builds a combined [existing..., new...] array, validates, then splits back
  // into images[] (File blobs) + imagePreviews[] (UI). Duplicate detection via
  // size+name Set; total payload capped at 30MB across all new files.
  const processFiles = async (files) => {    const fileArray = Array.from(files);
    setFileErrors([]);

    const remainingSlots = MAX_IMAGES - (formData.imagePreviews?.length || 0);

    if (remainingSlots <= 0) {
      const msg = `Maximum ${MAX_IMAGES} images allowed`;
      setFileErrors([msg]);
      toast.error(msg);

      return;
    }

    const selectedFiles = fileArray.slice(0, remainingSlots);

    const validFiles = [];

    const previewItems = [];
    const issues = [];

    // Dedup keys for already-attached blobs (name+size is enough for UX dupes).
    const seen = new Set(
      (formData.images || []).map((f) => `${f?.name || ""}__${f?.size || 0}`),
    );
    const currentTotal = (formData.images || []).reduce(
      (sum, f) => sum + (Number(f?.size) || 0),
      0,
    );
    let pendingTotal = currentTotal;

    for (const file of selectedFiles) {
      // File Validation
      if (!(file instanceof File)) {
        continue;
      }

      // Duplicate-byte heuristic: same name + same byte size as an attached file.
      const dupeKey = `${file.name || ""}__${file.size || 0}`;
      if (seen.has(dupeKey)) {
        issues.push(`${file.name}: duplicate image already added`);
        continue;
      }

      // File Type Validation - MIME + extension double-check (prevents spoofing)
      // Note: image/svg+xml deliberately excluded to prevent stored XSS
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      const allowedExts = ["png", "jpg", "jpeg", "webp"];
      const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
      if (!allowedTypes.includes(file.type) || !allowedExts.includes(ext)) {
        issues.push(`${file.name}: not a supported image format`);
        toast.error(`${file.name} is not a supported image format`);
        continue;
      }

      // File Size Validation (per-file 10MB, total 30MB across new files)
      if (file.size > MAX_FILE_SIZE) {
        issues.push(`${file.name}: exceeds 10MB limit`);
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      if (pendingTotal + file.size > MAX_TOTAL_SIZE) {
        issues.push(`${file.name}: total images exceed 30MB cap`);
        toast.error(`${file.name} would exceed the 30MB total cap`);
        continue;
      }

      seen.add(dupeKey);
      pendingTotal += file.size;
      validFiles.push(file);

      const previewUrl = URL.createObjectURL(file);
      trackBlob(previewUrl);
      previewItems.push({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,

        preview: previewUrl,
      });
    }

    if (issues.length > 0) setFileErrors(issues);
    if (validFiles.length === 0) return;

    updateField("images", [...formData.images, ...validFiles]);

    updateField("imagePreviews", [...formData.imagePreviews, ...previewItems]);
  };

  // INPUT CHANGE
  const handleInputChange = (e) => {
    processFiles(e.target.files);

    e.target.value = null;
  };

  // PHONE HANDOFF: convert freshly uploaded ImageKit URLs back into File
  // objects so the rest of the flow (validation, previews, compression,
  // publish upload) treats them exactly like laptop-picked files.
  // Stable ref pattern: polls fire seconds after render, so the handler
  // must always see the LATEST formData, never a stale closure.
  const processFilesRef = useRef(null);
  processFilesRef.current = (files) => processFiles(files);
  // Live mirror of attached-preview count for the same reason.
  const previewsCountRef = useRef(0);
  previewsCountRef.current = formData.imagePreviews?.length || 0;

  const handlePhonePhotos = useCallback(async (images) => {
    const fresh = (images || []).filter((img) => {
      if (!img?.url || phoneFileIds.current.has(img.fileId)) return false;
      phoneFileIds.current.add(img.fileId);
      return true;
    });
    if (fresh.length === 0) return;

    // Enforce hybrid slots at attach time too: laptop picks made after the
    // QR was generated can otherwise overflow the 3-photo cap silently.
    const room = MAX_IMAGES - previewsCountRef.current;
    if (room <= 0) {
      toast.error("All 3 photo slots are full. Remove one first.");
      return;
    }
    if (fresh.length > room) {
      toast(`Only ${room} more fit — attaching the first ${room}.`);
      fresh.splice(room);
    }

    try {
      const files = await Promise.all(
        fresh.map(async (img, index) => {
          const res = await fetch(img.url);
          if (!res.ok) throw new Error(`Download failed (${res.status})`);
          const blob = await res.blob();
          const ext = (blob.type.split("/")[1] || "jpg").replace(/[^a-z]/g, "");
          return new File([blob], `phone-photo-${Date.now()}-${index}.${ext}`, {
            type: blob.type || "image/jpeg",
          });
        }),
      );
      processFilesRef.current(files);
    } catch {
      toast.error("Could not attach phone photos. Please try again.");
    }
  }, []);

  // REMOVE IMAGE — operate on the combined [preview+file] array (existing
  // and new interleaved by cover order), then split back into images[] +
  // imagePreviews[]. This keeps blob indexes correct after cover reorders.
  const splitCombined = (combined) => ({
    previews: combined.map((c) => c.preview),
    files: combined.filter((c) => !c.preview?.isExisting).map((c) => c.file),
  });

  const buildCombined = () => {
    let cursor = 0;
    return (formData.imagePreviews || []).map((p) => {
      if (p?.isExisting) return { preview: p, file: null };
      const file = formData.images?.[cursor] || null;
      cursor += 1;
      return { preview: p, file };
    });
  };

  const handleRemoveImage = (index) => {
    const combined = buildCombined();
    const [removed] = combined.splice(index, 1);
    if (!removed) return;
    // Revoke blob URL for locally-picked files.
    if (!removed.preview?.isExisting && removed.preview?.preview) {
      untrackBlob(removed.preview.preview);
    }
    const { previews, files } = splitCombined(combined);
    updateField("imagePreviews", previews);
    updateField("images", files);
  };

  const handleSetCover = (index) => {
    if (index === 0) return;
    const combined = buildCombined();
    const [selected] = combined.splice(index, 1);
    if (!selected) return;
    combined.unshift(selected);
    const { previews, files } = splitCombined(combined);
    updateField("imagePreviews", previews);
    updateField("images", files);
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
    <div className="w-full rounded-[28px] border border-[#ECECEC] bg-[#F7F8FA] shadow-sm p-5 sm:p-7 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl xl:text-2xl font-bold text-[#0F172A] dark:text-white leading-tight">
          Product Images
        </h1>

        <p className="mt-2 xl:mt-1 text-[#475569] dark:text-[#A1A1AA] text-sm md:text-base">
          Upload 1-3 high-quality photos to give buyers a complete view.
        </p>
      </div>

      <div data-field="images">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 rounded-[28px] border-2 bg-[#F8FAFC] border-dashed p-8 md:p-10 transition-all duration-200 cursor-pointer
        
        ${
          errors.images
            ? "border-red-500"
            : isDragging
              ? "border-[#4F46E5]"
              : "border-[#D1D5DB]"
        }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
              Supports JPG, PNG and WEBP up to 10MB each · 30MB total
            </p>

            {/* Info */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full bg-[#EEF2FF] px-4 py-2 text-xs font-semibold text-[#4F46E5]">
                Max {MAX_IMAGES} images
              </div>
            </div>
          </div>
        </div>

        {errors.images && (
          <p className="mt-3 text-sm text-red-500">{errors.images}</p>
        )}
        {fileErrors.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-xl border border-red-200 bg-red-50 p-3">
            {fileErrors.map((msg, i) => (
              <li key={i} className="text-xs font-medium leading-5 text-red-600">
                • {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phone handoff: QR -> gallery/camera -> auto-attach. Slots stay in
          sync with laptop picks (max 3 combined). */}
      <PhoneHandoffCard
        onPhotos={handlePhonePhotos}
        attachedCount={formData.imagePreviews?.length || 0}
        remainingSlots={MAX_IMAGES - (formData.imagePreviews?.length || 0)}
      />

      {/* Uploaded Images */}
      {formData.imagePreviews?.length > 0 && (
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
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/logo.svg";
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
                    className="w-12 h-12 rounded-full bg-[#F7F8FA] text-red-500 flex items-center justify-center shadow-lg"
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
          {/* Continue */}
          <button
            onClick={() => validateAndProceed(validateImages, nextStep)}
            className="h-[50px] lg:h-[54px] px-6 lg:px-8 rounded-xl flex justify-center items-center gap-2 font-semibold transition-all duration-200 text-base lg:text-lg bg-[#3838EC] hover:bg-[#4338CA] text-white shadow-lg shadow-indigo-200"
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
