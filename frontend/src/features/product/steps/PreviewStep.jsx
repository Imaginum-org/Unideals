import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Eye, MapPin, Pencil, Rocket, Save } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import axios from "../../../services/axiosInstance";
import { uploadImage, deleteImage } from "../../../utils/imageUpload.js";
import { compressImage } from "../utils/imageCompression";
import useProductListing from "../hooks/useProductListing";
import { saveDraftProduct, updateProduct, getUserProducts } from "../api/productApi.js";
import { getBilling } from "../../payment/api/paymentApi.js";
import { removeDraftFromLocal } from "../utils/draftStorage";
import { validateBasicInfo, validateImages, validatePricing } from "../validations";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CONDITION_OPTIONS,
  PRODUCT_PAYMENT_OPTIONS,
  PRODUCT_USAGE_OPTIONS,
} from "../constants/productOptions";
import LimitModal from "../../../components/ui/LimitModal.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { normalizeMultiline } from "../../../utils/text.js";
import { CARD, FLUSH_ON_PHONE, StepFooter } from "../components/listing/ListingKit.jsx";
import { isSpecHidden } from "../utils/listingSmarts.js";

const labelOf = (opts, v) => opts.find((o) => o.value === v)?.label || "";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PreviewStep = () => {
  const navigate = useNavigate();
  const { campus } = useCampus();
  const { updateUserDetails } = useUser();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [publishStage, setPublishStage] = useState("");
  const [limitInfo, setLimitInfo] = useState(null);

  const { formData, goToStep, loading, setLoading, setErrors, resetForm, isEditMode, isDraft, editProductId } =
    useProductListing();

  // Warn on accidental tab close/refresh while a save/publish is in-flight.
  useEffect(() => {
    if (!loading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [loading]);

  // Pre-check plan cap BEFORE any upload bytes leave the device (new
  // listings and draft publishes; edits of live listings never add one).
  // Fail-open: the backend still enforces; this just saves wasted uploads.
  const precheckListingLimit = async () => {
    if (isEditMode && !isDraft) return true;
    try {
      const [billingRes, productsRes] = await Promise.allSettled([getBilling(), getUserProducts()]);
      const billing = billingRes.status === "fulfilled" ? billingRes.value?.data?.data : null;
      const products = productsRes.status === "fulfilled" ? productsRes.value?.data?.data || [] : null;
      const limit = billing?.limits?.activeListings ?? null; // null = unlimited/unknown
      if (limit == null || products == null) return true;
      const active = products.filter((p) => ["listed", "active"].includes((p.status || "").toLowerCase())).length;
      if (active >= limit) {
        setLimitInfo({ message: `You've reached your plan's listing limit (${limit} active). Upgrade to list more.` });
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  // Re-run all step validators before going live; jump to the first failing step.
  const revalidateAll = () => {
    const basic = validateBasicInfo(formData);
    if (Object.keys(basic).length > 0) {
      setErrors(basic);
      goToStep(1);
      toast.error("Please fix the highlighted details in Step 1");
      return false;
    }
    const images = validateImages(formData);
    if (Object.keys(images).length > 0) {
      setErrors(images);
      goToStep(2);
      toast.error("Please add at least one product image");
      return false;
    }
    const pricing = validatePricing(formData);
    if (Object.keys(pricing).length > 0) {
      setErrors(pricing);
      goToStep(3);
      toast.error("Please fix pricing and pickup details");
      return false;
    }
    return true;
  };

  // Free every local blob URL once photos are safely stored. Runs only on
  // success; failures keep previews alive for retry.
  const revokeAllPreviewBlobs = () => {
    (formData.imagePreviews || []).forEach((p) => {
      const url = p?.preview;
      if (typeof url === "string" && url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
    });
  };

  // Order uploads to match the cover-first preview order, so the selected
  // cover photo is always images[0] for mixed existing+new sets.
  const buildOrderedImages = (uploads) => {
    const queue = [...uploads];
    return (formData.imagePreviews || [])
      .map((item) => (item?.isExisting ? { url: item.url, fileId: item.fileId } : queue.shift() || null))
      .filter(Boolean);
  };

  /**
   * Compress + upload only the NEW photos (already-stored ones are reused
   * by URL, never re-uploaded). All-or-nothing: on any failure the
   * successful uploads are deleted again and null is returned.
   */
  const uploadNewImages = async () => {
    const files = formData.images || [];
    if (files.length === 0) return [];
    setPublishStage("Preparing photos…");
    const compressed = await Promise.all(files.map((file) => compressImage(file)));
    setPublishStage("Uploading photos…");
    const results = await Promise.allSettled(compressed.map((file) => uploadImage(file)));
    const uploads = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failed = results.length - uploads.length;
    if (failed > 0) {
      await Promise.allSettled(uploads.map((u) => (u?.fileId ? deleteImage(u.fileId) : Promise.resolve())));
      toast.error(`${failed} photo${failed > 1 ? "s" : ""} failed to upload. Nothing was saved, please retry.`);
      return null;
    }
    return uploads;
  };

  // One payload shape for create, edit, draft and publish.
  const buildPayload = (images) => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    category: formData.category,
    condition: formData.condition,
    selling_price: Number(formData.sellingPrice),
    original_price: Number(formData.originalPrice),
    isGirlsOnly: Boolean(formData.isGirlsOnly),
    is_negotiable: formData.negotiable,
    payment_preference: formData.paymentMethod,
    images,
    ...(formData.quantity != null && formData.quantity !== "" ? { quantity: Number(formData.quantity) } : {}),
    // Campus pickup-spot model: name -> address_line, detail -> city.
    ...(formData.address
      ? {
          pickup_address_snapshot: {
            address_line: formData.address?.name || formData.address?.address_line || formData.address?.line1,
            city: formData.address?.detail || formData.address?.city,
          },
        }
      : {}),
    terms_version: formData.termsVersion || "v1",
    terms_accepted_at: formData.termsAcceptedAt || null,
    attributes: {
      brand: String(formData.brand || "").trim().slice(0, 100),
      color: String(formData.color || "").trim().slice(0, 50),
      usage_duration: formData.usageDuration,
      purchase_date: formData.purchaseDate || null,
    },
  });

  const finishLocal = () => {
    revokeAllPreviewBlobs();
    removeDraftFromLocal();
  };

  const showError = (error, fallback) => {
    const code = error?.response?.data?.code;
    const message = error?.response?.data?.message || error?.message || fallback;
    if (code === "LISTING_LIMIT" || /listing limit/i.test(message)) setLimitInfo({ message });
    else toast.error(message);
  };

  /**
   * SAVE AS DRAFT: one request with everything, photos included, so the
   * draft reopens exactly as it was. New listing → create; editing a draft
   * → update the same document (never a second copy).
   */
  const handleSaveDraft = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const uploads = await uploadNewImages();
      if (uploads === null) return;
      setPublishStage("Saving draft…");
      const payload = buildPayload(buildOrderedImages(uploads));
      if (isEditMode) await updateProduct(editProductId, payload);
      else await saveDraftProduct(payload);
      finishLocal();
      resetForm();
      toast.success("Draft saved. Find it in My listings under Unlisted.");
      navigate("/productlisted?tab=unlisted");
    } catch (error) {
      showError(error, "Failed to save draft");
    } finally {
      setLoading(false);
      setPublishStage("");
    }
  };

  /**
   * SAVE CHANGES (live listing) or PUBLISH A DRAFT (publish = true:
   * draft → listed on the same document, server re-checks every gate).
   */
  const handleSaveChanges = async (publish = false) => {
    if (loading) return;
    if (!revalidateAll()) return;
    try {
      setLoading(true);
      if (publish && !(await precheckListingLimit())) return;
      const uploads = await uploadNewImages();
      if (uploads === null) return;
      setPublishStage(publish ? "Publishing listing…" : "Saving changes…");
      const response = await updateProduct(editProductId, {
        ...buildPayload(buildOrderedImages(uploads)),
        ...(publish ? { status: "listed" } : {}),
      });
      finishLocal();
      if (publish) {
        if (response?.data?.gamification) updateUserDetails({ gamification: response.data.gamification });
        resetForm();
        navigate("/", { state: { listingCreated: true, isFirstListing: false } });
      } else {
        toast.success("Listing updated");
        navigate("/productlisted");
      }
    } catch (error) {
      showError(error, publish ? "Failed to publish" : "Failed to save changes");
    } finally {
      setLoading(false);
      setPublishStage("");
    }
  };

  // PUBLISH (brand-new listing)
  const handlePublish = async () => {
    if (loading) return;
    if (!revalidateAll()) return;
    try {
      setLoading(true);
      if (!(await precheckListingLimit())) return;
      const uploads = await uploadNewImages();
      if (uploads === null) return;
      setPublishStage("Publishing listing…");
      const response = await axios.post("/api/product", buildPayload(buildOrderedImages(uploads)));
      const isFirstListing = Boolean(response?.data?.isFirstListing);
      if (response?.data?.gamification) updateUserDetails({ gamification: response.data.gamification });
      finishLocal();
      resetForm();
      setSelectedImageIndex(0);
      navigate("/", { state: { listingCreated: true, isFirstListing } });
    } catch (error) {
      showError(error, "Something went wrong");
    } finally {
      setLoading(false);
      setPublishStage("");
    }
  };

  const previews = formData.imagePreviews || [];
  const safeIndex = Math.min(selectedImageIndex, Math.max(0, previews.length - 1));
  const current = previews[safeIndex];
  const selling = Number(formData.sellingPrice || 0);
  const original = Number(formData.originalPrice || 0);
  const discount = original > selling && selling > 0 ? Math.round(((original - selling) / original) * 100) : 0;
  const categoryLabel = labelOf(PRODUCT_CATEGORY_OPTIONS, formData.category);
  const conditionLabel = labelOf(PRODUCT_CONDITION_OPTIONS, formData.condition);
  const usageLabel = labelOf(PRODUCT_USAGE_OPTIONS, formData.usageDuration);
  const paymentLabel = labelOf(PRODUCT_PAYMENT_OPTIONS, formData.paymentMethod);
  const pickupName = formData.address?.name || formData.address?.address_line || "";
  const pickupDetail = formData.address?.detail || formData.address?.city || "";
  const purchaseDate = formData.purchaseDate
    ? new Date(formData.purchaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const specs = [
    ["Condition", isSpecHidden(formData.category, "condition") ? "" : conditionLabel],
    ["Used for", isSpecHidden(formData.category, "usage") ? "" : usageLabel],
    ["Purchased", purchaseDate],
    ["Brand", formData.brand],
    ["Colour", isSpecHidden(formData.category, "color") ? "" : formData.color],
    ["Payment", paymentLabel],
  ].filter(([, v]) => v);

  const checklist = [
    { step: 1, label: "Details", detail: [categoryLabel, conditionLabel].filter(Boolean).join(" · ") },
    { step: 2, label: "Photos", detail: `${previews.length} photo${previews.length === 1 ? "" : "s"}` },
    { step: 3, label: "Price & pickup", detail: [selling ? inr(selling) : "", pickupName].filter(Boolean).join(" · ") },
  ];

  const primaryAction = isDraft ? () => handleSaveChanges(true) : isEditMode ? () => handleSaveChanges(false) : handlePublish;
  const primaryLabel = isEditMode && !isDraft ? "Save changes" : "Publish listing";
  const canSaveDraft = !isEditMode || isDraft;
  const liveEdit = isEditMode && !isDraft;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      {/* Buyer view */}
      <section className={`${CARD} ${FLUSH_ON_PHONE} overflow-hidden`} aria-label="Listing preview">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 text-[12.5px] font-medium text-slate-500 sm:px-6 dark:border-neutral-800 dark:text-zinc-400">
          <Eye className="h-4 w-4" aria-hidden="true" />
          This is how buyers will see your listing
        </div>
        <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-white/5">
              {current?.preview ? (
                <img src={current.preview} alt="Cover" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-slate-400">No photo</div>
              )}
            </div>
            {previews.length > 1 && (
              <div className="mt-3 flex gap-2">
                {previews.map((image, index) => (
                  <button
                    key={image.id || index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Show photo ${index + 1}`}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                      safeIndex === index ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={image.preview} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {categoryLabel && (
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent-text)]">{categoryLabel}</span>
              )}
              {formData.isGirlsOnly && (
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[12px] font-semibold text-pink-700 dark:bg-pink-950/40 dark:text-pink-200">🌸 Girls only</span>
              )}
            </div>
            <h2 className="mt-3 break-words text-[20px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[24px] dark:text-white">
              {formData.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{inr(selling)}</span>
              {discount > 0 && (
                <>
                  <span className="text-[15px] text-slate-400 line-through">{inr(original)}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {discount}% off
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
              {formData.negotiable ? "Open to offers" : "Fixed price"}
              {paymentLabel && <> · {paymentLabel}</>}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              {specs.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[12px] text-slate-500 dark:text-zinc-400">{k}</dt>
                  <dd className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100" title={v}>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-neutral-50 px-3.5 py-3 dark:bg-white/[0.03]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold text-slate-900 dark:text-white">{pickupName || "Pickup spot"}</p>
                <p className="text-slate-500 dark:text-zinc-400">
                  {[pickupDetail, campus?.name].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-4 py-5 sm:px-6 dark:border-neutral-800">
          <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">About this item</h3>
          <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-[1.75] text-slate-600 [overflow-wrap:anywhere] dark:text-zinc-300">
            {normalizeMultiline(formData.description || "")}
          </p>
        </div>
      </section>

      {/* Checklist + actions */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)]">
        <section className={`${CARD} ${FLUSH_ON_PHONE} p-4 sm:p-5`}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                {liveEdit ? "Ready to save" : "Ready to publish"}
              </p>
              <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">Check each section, then publish.</p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {checklist.map((item) => (
              <li key={item.step} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-800 dark:text-zinc-100">{item.label}</p>
                    {item.detail && <p className="truncate text-[12px] text-slate-500 dark:text-zinc-400">{item.detail}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep(item.step)}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline disabled:opacity-50"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop actions (phones use the docked bar) */}
          <div className="mt-4 hidden flex-col gap-2 sm:flex">
            <button
              type="button"
              onClick={primaryAction}
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {loading ? (
                <>
                  <BrandLoader size="sm" tone="white" />
                  <span>{publishStage || "Publishing…"}</span>
                </>
              ) : (
                <>
                  {liveEdit ? <Save className="h-[18px] w-[18px]" aria-hidden="true" /> : <Rocket className="h-[18px] w-[18px]" aria-hidden="true" />}
                  {primaryLabel}
                </>
              )}
            </button>
            {canSaveDraft && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white text-[14px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5"
              >
                Save as draft
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
            {liveEdit
              ? "Buyers see changes right after you save."
              : isDraft
                ? "Drafts are private. Only you can see this until you publish."
                : "You can edit or unlist it any time."}
          </p>
        </section>
      </aside>

      {/* Phones: docked publish bar */}
      <div className="sm:hidden">
        <StepFooter
          onBack={() => goToStep(3)}
          onNext={primaryAction}
          nextLabel={primaryLabel}
          nextIcon={liveEdit ? Save : Rocket}
          loading={loading}
          loadingLabel={publishStage || "Publishing…"}
          secondary={
            canSaveDraft ? (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="h-12 shrink-0 rounded-lg px-2 text-[13px] font-semibold text-slate-600 disabled:opacity-50 dark:text-zinc-300"
              >
                Draft
              </button>
            ) : null
          }
        />
      </div>

      {limitInfo && (
        <LimitModal title="You're out of listings" message={limitInfo.message} onClose={() => setLimitInfo(null)} />
      )}
    </div>
  );
};

export default PreviewStep;
