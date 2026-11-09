import { useRef, useState, useCallback } from "react";
import { CircleAlert, ImagePlus, Monitor, Smartphone, Star, Trash2, Upload } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import useProductListing from "../hooks/useProductListing";
import PhoneHandoffCard from "../../handoff/components/PhoneHandoffCard.jsx";
import { validateImages } from "../validations";
import { FormSection, StepFooter } from "../components/listing/ListingKit.jsx";
import { cn } from "../../../utils/cn.js";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;

const ImagesStep = () => {
  const fileInputRef = useRef(null);

  const { formData, updateField, nextStep, prevStep, errors, validateAndProceed } =
    useProductListing();

  const [isDragging, setIsDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);
  // Tabbed upload source: "pc" | "mobile". Single dashed box below swaps
  // its inner content based on this (per final UI).
  const [uploadSource, setUploadSource] = useState("pc");
  // Tracks phone-delivered fileIds so repeat polls never re-add them.
  const phoneFileIds = useRef(new Set());
  // Live mirror of blob URLs so removing a photo frees its memory.
  // NOTE: never revoke on unmount — the Preview step renders these same
  // blob URLs after this step unmounts. Revoke-all happens once after a
  // successful publish/save (see PreviewStep).
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
      toast(`Only ${room} more fit, attaching the first ${room}.`);
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

  // DRAG EVENTS (PC tab only — mobile tab owns its own clicks for QR)
  const handleDragOver = (e) => {
    e.preventDefault();
    if (uploadSource !== "pc") return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadSource !== "pc") return;
    processFiles(e.dataTransfer.files);
  };

  const handleBoxClick = () => {
    if (uploadSource !== "pc") return;
    fileInputRef.current?.click();
  };

  const previews = formData.imagePreviews || [];
  const emptySlots = Math.max(0, MAX_IMAGES - previews.length);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <FormSection
        icon={ImagePlus}
        title="Photos"
        description="Add 1 to 3 clear photos. The first one is your cover."
        aside={
          <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-slate-600 dark:bg-white/5 dark:text-zinc-300">
            {previews.length}/{MAX_IMAGES}
          </span>
        }
      >
        <div data-field="images">
          {/* Upload source: segmented control */}
          <div
            role="tablist"
            aria-label="Choose how to upload photos"
            className="inline-flex w-full rounded-lg bg-neutral-100 p-1 sm:w-auto dark:bg-white/5"
          >
            {[
              { id: "pc", label: "Upload files", icon: Monitor },
              { id: "mobile", label: "Use your phone", icon: Smartphone },
            ].map(({ id, label, icon: Icon }) => {
              const active = uploadSource === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setUploadSource(id)}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md px-4 text-[13.5px] font-semibold transition-colors sm:flex-none",
                    active
                      ? "bg-white text-slate-900 shadow-sm dark:bg-[#1A1D20] dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={handleInputChange}
          />

          {/* Upload files: drop zone (hidden once all slots are full) */}
          {uploadSource === "pc" && emptySlots > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleBoxClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBoxClick();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                isDragging
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : errors.images
                    ? "border-red-300 bg-red-50/40 dark:border-red-500/50 dark:bg-red-950/10"
                    : "border-neutral-300 bg-neutral-50 hover:border-[var(--accent-ring)] hover:bg-[var(--accent-soft)] dark:border-neutral-700 dark:bg-white/[0.02]",
              )}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--accent-text)] shadow-sm dark:bg-[#1A1D20]">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[14.5px] font-semibold text-slate-900 dark:text-white">
                {isDragging ? (
                  "Drop to add"
                ) : (
                  <>
                    <span className="text-[var(--accent-text)]">Click to upload</span>
                    <span className="max-sm:hidden"> or drag and drop</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
                JPG, PNG or WEBP · up to 10 MB each · {emptySlots} slot{emptySlots === 1 ? "" : "s"} left
              </p>
            </div>
          )}

          {/* Use your phone: QR handoff. Always mounted so the session and
              polling survive tab switches; hidden with display:none. */}
          <div className={uploadSource === "mobile" ? "mt-4 block" : "hidden"}>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6 dark:border-neutral-800 dark:bg-white/[0.02]">
              <PhoneHandoffCard
                bare
                onPhotos={handlePhonePhotos}
                attachedCount={previews.length}
                remainingSlots={MAX_IMAGES - previews.length}
              />
            </div>
          </div>

          {errors.images && (
            <p role="alert" className="mt-3 text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {errors.images}
            </p>
          )}
          {fileErrors.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/20">
              {fileErrors.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] font-medium leading-5 text-red-700 dark:text-red-300">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Slots: filled photos + empty placeholders. Actions are always
            visible (hover-only controls were unreachable on touch screens). */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {previews.map((imageItem, index) => (
            <div
              key={imageItem.id || index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border bg-neutral-100 dark:bg-white/5",
                index === 0 ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft-strong)]" : "border-neutral-200 dark:border-neutral-700",
              )}
            >
              {imageItem?.preview ? (
                <img
                  src={imageItem.preview}
                  alt={`Photo ${index + 1}`}
                  loading="lazy"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/logo.svg";
                  }}
                  className="h-full w-full select-none object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-slate-400">No preview</div>
              )}

              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white sm:left-2 sm:top-2">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetCover(index)}
                  className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/75 sm:left-2 sm:top-2"
                  aria-label={`Make photo ${index + 1} the cover`}
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  <span className="max-sm:hidden">Make cover</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-red-600 shadow-sm backdrop-blur-sm transition hover:bg-white sm:right-2 sm:top-2"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => (uploadSource === "pc" ? handleBoxClick() : setUploadSource("pc"))}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-slate-400 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] dark:border-neutral-700 dark:text-zinc-500"
              aria-label="Add a photo"
            >
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
              <span className="text-[11.5px] font-medium">{previews.length === 0 && i === 0 ? "Cover" : "Add"}</span>
            </button>
          ))}
        </div>
        {previews.length > 1 && (
          <p className="mt-2.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Use “Make cover” on any photo to show it first.</p>
        )}
      </FormSection>

      <StepFooter
        onBack={prevStep}
        onNext={() => validateAndProceed(validateImages, nextStep)}
        nextLabel="Continue to pricing"
      />
    </div>
  );
};

export default ImagesStep;
