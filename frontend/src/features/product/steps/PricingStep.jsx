import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BadgePercent, Building2, CheckCircle2, IndianRupee, MapPin, Plus, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Select from "../../../components/ui/Select.jsx";
import PriceInsights from "../components/PriceInsights.jsx";
import { toast } from "../../../components/ui/toast.js";
import axios from "../../../services/axiosInstance";
import useProductListing from "../hooks/useProductListing";
import { PRODUCT_PAYMENT_OPTIONS } from "../constants/productOptions";
import { validatePricing } from "../validations";
import LegalAgreementModal from "../../auth/components/LegalAgreementModal";
import PickupSpotModal from "../../user/components/PickupSpotModal.jsx";
import { createPickupSpot } from "../../user/api/userApi.js";
import { useCampus } from "../../../context/CampusContext.jsx";
import { CARD, ChoiceChips, FLUSH_ON_PHONE, Field, FormSection, StepFooter, Switch, inputClass } from "../components/listing/ListingKit.jsx";
import { readLastPayment, rememberPayment, suggestPrice } from "../utils/listingSmarts.js";

const MAX_SPOTS = 3;

const PricingStep = () => {
  const { formData, updateField, nextStep, prevStep, errors, validateAndProceed } =
    useProductListing();
  const { campus } = useCampus();
  const [legalTab, setLegalTab] = useState(null);
  const [loadingPickupSpot, setLoadingPickupSpot] = useState(false);
  const [pickupSpots, setPickupSpots] = useState([]);
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [isSavingSpot, setIsSavingSpot] = useState(false);

  // Payment: pre-select the seller's last choice on this device, else the
  // most flexible option. Still a normal, changeable choice.
  useEffect(() => {
    if (!formData.paymentMethod) updateField("paymentMethod", readLastPayment() || "both");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FETCH PICKUP SPOTS
  useEffect(() => {
    const fetchPickupSpot = async () => {
      try {
        setLoadingPickupSpot(true);

        const res = await axios.get("/api/pickup-spots");

        const spots = res.data?.pickupSpots || [];
        setPickupSpots(spots);

        const primaryPickupSpot =
          spots.find((spot) => spot.isPrimary) || spots[0];

        updateField("address", primaryPickupSpot || null);
      } catch {
        toast.error("Failed to fetch pickup spot");
      } finally {
        setLoadingPickupSpot(false);
      }
    };

    if (!formData.address) {
      fetchPickupSpot();
    } else {
      // Keep the dropdown in sync when returning to this step; fall back
      // to primary/first if the saved address is no longer in the list.
      axios
        .get("/api/pickup-spots")
        .then((res) => {
          const spots = res.data?.pickupSpots || [];
          setPickupSpots(spots);
          // Edits/drafts restore the pickup SNAPSHOT (name + detail, no _id):
          // match it back to the seller's spot instead of silently swapping
          // it for the primary one.
          const a = formData.address || {};
          const match =
            spots.find((s) => a._id && String(s._id) === String(a._id)) ||
            spots.find((s) => s.name === (a.name || a.address_line) && s.detail === (a.detail || a.city));
          if (match && !a._id) updateField("address", match);
          const stillThere = Boolean(match);
          if (!stillThere) {
            updateField(
              "address",
              spots.find((s) => s.isPrimary) || spots[0] || null,
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSelectSpot = (spotId) => {
    const spot = pickupSpots.find((s) => String(s._id) === String(spotId));
    if (spot) updateField("address", spot);
  };

  // Inline creation: same modal as Settings, saved without leaving the flow.
  const handleCreateSpot = async (spotData) => {
    if (pickupSpots.length >= MAX_SPOTS) {
      toast.error(`Maximum ${MAX_SPOTS} pickup spots allowed`);
      return;
    }
    setIsSavingSpot(true);
    try {
      const res = await createPickupSpot(spotData);
      const created =
        res.data?.pickupSpot || res.data?.data || { ...spotData };
      // Never trust a fake _id-less object: refetch the list so the new
      // spot has a real id for select + publish snapshot.
      if (!created?._id) {
        const refetch = await axios.get("/api/pickup-spots");
        const spots = refetch.data?.pickupSpots || [];
        setPickupSpots(spots);
        const newest =
          spots.find((s) => s.isPrimary) || spots[spots.length - 1] || spots[0];
        if (newest) updateField("address", newest);
        toast.success("Pickup spot added");
        return;
      }
      if (pickupSpots.length + 1 > MAX_SPOTS) {
        toast.error(`Maximum ${MAX_SPOTS} pickup spots allowed`);
        return;
      }
      setPickupSpots((prev) => [...prev, created]);
      updateField("address", created);
      toast.success("Pickup spot added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add pickup spot");
      // Swallow here (already toasted) so the modal stays open for retry.
      throw err;
    } finally {
      setIsSavingSpot(false);
    }
  };

  const handleTermsChange = (checked) => {
    updateField("termsAccepted", checked);
    if (checked) {
      updateField("termsVersion", "v1");
      updateField("termsAcceptedAt", new Date().toISOString());
    } else {
      updateField("termsAcceptedAt", null);
    }
  };

  const selling = Number(formData.sellingPrice || 0);
  const original = Number(formData.originalPrice || 0);
  const discount = original > selling && selling > 0 ? Math.round(((original - selling) / original) * 100) : 0;
  const onlyDigits = (v) => v.replace(/[^0-9]/g, "").slice(0, 8);
  const suggested = suggestPrice(formData);
  const showSuggestion = suggested && Number(formData.sellingPrice) !== suggested;

  const priceInput = (field, id, placeholder) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-[15px] font-semibold text-slate-400 dark:text-zinc-500">
        ₹
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formData[field]}
        onChange={(e) => updateField(field, onlyDigits(e.target.value))}
        placeholder={placeholder}
        className={`${inputClass(errors[field])} h-12 pl-9 text-[17px] font-semibold tabular-nums`}
      />
    </div>
  );

  return (
    <>
      {legalTab && (
        <LegalAgreementModal
          activeTab={legalTab}
          onTabChange={setLegalTab}
          onClose={() => setLegalTab(null)}
          onAccept={() => {
            // Accept ticks the consent box (recording version + timestamp)
            // when unticked; when already ticked it simply closes the popup.
            if (!formData.termsAccepted) handleTermsChange(true);
            setLegalTab(null);
          }}
        />
      )}

      <div className="flex flex-col gap-4 sm:gap-5">
        <FormSection icon={IndianRupee} title="Price" description="Set a fair price. You can change it later.">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Your price" htmlFor="listing-price" required field="sellingPrice" error={errors.sellingPrice}>
              {priceInput("sellingPrice", "listing-price", suggested ? `e.g. ${suggested}` : "e.g. 800")}
              {showSuggestion && (
                <button
                  type="button"
                  onClick={() => updateField("sellingPrice", String(suggested))}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-soft-strong)]"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Use suggested ₹{suggested.toLocaleString("en-IN")}
                </button>
              )}
            </Field>
            <Field
              label="Original price"
              htmlFor="listing-original"
              required
              field="originalPrice"
              error={errors.originalPrice}
              hint="What you paid when it was new."
            >
              {priceInput("originalPrice", "listing-original", "e.g. 1,200")}
            </Field>
          </div>

          {discount > 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <BadgePercent className="h-4 w-4 shrink-0" aria-hidden="true" />
              Buyers will see <span className="font-bold">{discount}% off</span>, saving ₹{(original - selling).toLocaleString("en-IN")}.
            </p>
          )}

          {/* Labs: smart price suggestion / demand meter (or locked teaser) */}
          <div className="mt-4">
            <PriceInsights
              category={formData.category}
              condition={formData.condition}
              onUsePrice={(value) => updateField("sellingPrice", String(value))}
            />
          </div>
        </FormSection>

        <FormSection icon={Wallet} title="Payment" description="How buyers can pay you at pickup.">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Open to offers</p>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">Let buyers send you a price in chat.</p>
            </div>
            <Switch checked={Boolean(formData.negotiable)} onChange={(v) => updateField("negotiable", v)} label="Open to offers" />
          </div>
          <div className="mt-2 min-h-[20px]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={formData.negotiable ? "on" : "off"}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className={`flex items-center gap-1.5 text-[12.5px] font-medium ${
                  formData.negotiable ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {formData.negotiable ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                {formData.negotiable
                  ? "Listings open to offers usually get more chats."
                  : "Fixed price: fewer buyers reach out, but no haggling."}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-5 border-t border-neutral-100 pt-5 dark:border-neutral-800">
            <Field label="Accepted payment" required field="paymentMethod" error={errors.paymentMethod}>
              <ChoiceChips
                ariaLabel="Accepted payment"
                options={PRODUCT_PAYMENT_OPTIONS}
                value={formData.paymentMethod}
                onChange={(v) => {
                  updateField("paymentMethod", v);
                  rememberPayment(v);
                }}
                invalid={Boolean(errors.paymentMethod)}
                columns="grid-cols-3"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={MapPin} title="Pickup" description="Where you'll meet the buyer on campus.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-white/[0.02]">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                Campus
              </p>
              <p className="mt-1.5 text-[14.5px] font-semibold text-slate-900 dark:text-white">{campus?.name || "Your campus"}</p>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Listings go live on your campus marketplace.</p>
            </div>

            <Field label="Pickup spot" required field="address" error={errors.address}>
              {loadingPickupSpot ? (
                <div className="h-11 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
              ) : pickupSpots.length > 0 ? (
                <Select
                  value={formData.address?._id || ""}
                  onChange={handleSelectSpot}
                  placeholder="Choose a pickup spot"
                  ariaLabel="Choose pickup spot"
                  invalid={Boolean(errors.address)}
                  options={pickupSpots.map((spot) => ({
                    value: spot._id,
                    label: `${spot.name}${spot.isPrimary ? " (Primary)" : ""}`,
                  }))}
                />
              ) : (
                <p className="rounded-lg border border-dashed border-neutral-300 px-3.5 py-3 text-[13px] text-slate-500 dark:border-neutral-700 dark:text-zinc-400">
                  No pickup spots yet. Add one to continue.
                </p>
              )}
              {formData.address?.detail && (
                <p className="mt-1.5 text-[12.5px] text-slate-500 dark:text-zinc-400">{formData.address.detail}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button
                  type="button"
                  onClick={() => setShowSpotModal(true)}
                  disabled={isSavingSpot || pickupSpots.length >= MAX_SPOTS}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {pickupSpots.length === 0 ? "Add pickup spot" : "Add another"}
                </button>
                <Link to="/settings" className="text-[13px] font-medium text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                  Manage spots
                </Link>
              </div>
            </Field>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            For safety, pick a busy, public spot inside campus.
          </p>
        </FormSection>

        <div
          data-field="termsAccepted"
          className={`${CARD} ${FLUSH_ON_PHONE} p-4 sm:p-5 ${errors.termsAccepted ? "border-red-300 dark:border-red-500/60" : ""}`}
        >
          <label className="flex cursor-pointer select-none items-start gap-3">
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) => handleTermsChange(e.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-[var(--accent)]"
            />
            <span className="text-[13.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
              I agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalTab("terms");
                }}
                className="font-semibold text-[var(--accent-text)] hover:underline"
              >
                Terms &amp; Conditions
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setLegalTab("privacy");
                }}
                className="font-semibold text-[var(--accent-text)] hover:underline"
              >
                Privacy Policy
              </button>
              , and confirm this item is mine to sell.
            </span>
          </label>
          {errors.termsAccepted && (
            <p role="alert" className="mt-2 pl-[30px] text-[12.5px] font-medium text-red-600 dark:text-red-400">
              {errors.termsAccepted}
            </p>
          )}
        </div>

        <StepFooter
          onBack={prevStep}
          onNext={() => validateAndProceed(validatePricing, nextStep)}
          nextLabel="Review listing"
        />
      </div>

      {/* Inline add-spot modal: same popup as Settings, no page switch */}
      <PickupSpotModal
        isOpen={showSpotModal}
        onClose={() => setShowSpotModal(false)}
        onSave={handleCreateSpot}
        mode="create"
      />
    </>
  );
};

export default PricingStep;
