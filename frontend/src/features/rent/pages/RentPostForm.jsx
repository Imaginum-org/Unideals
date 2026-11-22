import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, Check, CheckCircle2, Eye, FileText, IndianRupee, Layers, MapPin, Pencil, Rocket, Save } from "lucide-react";
import { CARD, ChoiceChips, Counter, FLUSH_ON_PHONE, Field, FormSection, StepFooter, inputClass } from "../../product/components/listing/ListingKit.jsx";
import MobileAppBar, { useAppScreen } from "../../../components/layout/MobileAppBar.jsx";
import Seo from "../../../components/Seo.jsx";
import Select from "../../../components/ui/Select.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { toast } from "../../../components/ui/toast.js";
import { useUser } from "../../../context/useUserContext.jsx";
import { uploadImage, deleteImage } from "../../../utils/imageUpload.js";
import { cn } from "../../../utils/cn.js";
import RentGate from "../components/RentGate.jsx";
import { Sheet } from "../components/RentKit.jsx";
import {
  CONDITION_OPTIONS,
  HANDOVER_TIMES,
  LISTING_TYPES,
  PICKUP_SPOTS,
  RENT_CATEGORIES,
  RETURN_POLICY_PRESETS,
  formatPrice,
  toDateInput,
  toLocalInput,
} from "../constants/rentOptions.js";
import { createRentPost, getRentPost, rentErrorMessage, updateRentPost } from "../api/rentApi.js";
import {
  DAY,
  HOUR,
  LIMITS,
  STEPS,
  availableDateBounds,
  blankForm,
  buildBody,
  computeErrors,
  firstErrorField,
  firstStepWithErrors,
  formFromPost,
  hasTimingPart,
  isOffer,
  modeOf,
  priceOf,
  showsCondition,
  showsReturnPolicy,
  summarize,
  toggleTimingPart,
  togglePolicyLine,
  visibleErrors,
} from "../components/form/listingForm.js";
import { clearDraft, formFromDraft, readDraft, writeDraft } from "../components/form/rentDraft.js";
import { MoneyInput, QuantityStepper, QuickChips, RentStepper, RentTipsCard, StepBars } from "../components/form/FormParts.jsx";
import PhotoDropzone from "../components/form/PhotoDropzone.jsx";
import { PreviewCard, ReviewPanel } from "../components/form/ListingPreview.jsx";

/*
 * Post on Rent & Borrow. The same four-step flow as Sell (Details, Photos,
 * Price & handover, Review) with the same shell: stepper, one step per
 * screen, live preview + tips on the right, docked actions on phones.
 */

const RENT_UNIT_OPTIONS = [
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "use", label: "Per use" },
];
const UNIT_SUFFIX = { hour: "/ hour", day: "/ day", use: "/ use" };

const TITLE_PLACEHOLDERS = {
  offer: { rent: "e.g. Yonex badminton racket", lend: "e.g. Philips steam iron", give: "e.g. Maggi masala, 5 packets" },
  request: { rent: "e.g. Cycle for the weekend", lend: "e.g. Iron for 30 minutes", give: "e.g. 2 packets of Maggi" },
};

const neededByPresets = () => {
  const now = new Date();
  const out = [
    ["In 1 hour", new Date(now.getTime() + HOUR)],
    ["In 3 hours", new Date(now.getTime() + 3 * HOUR)],
  ];
  const tonight = new Date(now);
  tonight.setHours(23, 0, 0, 0);
  if (tonight.getTime() - now.getTime() > 45 * 60 * 1000) out.push(["Tonight, 11 PM", tonight]);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  out.push(["Tomorrow, 9 AM", tomorrow]);
  return Object.fromEntries(out.map(([label, at]) => [label, toLocalInput(at)]));
};

const scrollToField = (field) => {
  const el = document.querySelector(`[data-field="${field}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  el?.querySelector("input, textarea, button")?.focus({ preventScroll: true });
};

const isPristine = (form) =>
  !form.title.trim() && !form.description.trim() && !form.amount && !form.spot.trim() && !form.timing.trim() && !form.notes.trim() && form.images.length === 0;

/* ── Step 1: what + about ── */
function DetailsStep({ form, set, errs, isEdit, lockedMode }) {
  const offer = isOffer(form);
  const allTypes = LISTING_TYPES[form.intent];
  const types = isEdit && lockedMode ? allTypes.filter((t) => modeOf(t.value) === lockedMode) : allTypes;
  const current = allTypes.find((t) => t.value === form.type);
  return (
    <div className="space-y-4 max-sm:space-y-2">
      <FormSection icon={Layers} title="What are you posting?">
        <div className="space-y-5">
          <Field label="I want to">
            <ChoiceChips
              options={[
                { value: "offer", label: "Offer something" },
                { value: "request", label: "Ask for something" },
              ]}
              value={form.intent}
              onChange={(intent) => set({ intent })}
              ariaLabel="I want to"
              columns="grid-cols-2"
              disabled={isEdit}
            />
          </Field>
          <Field label="How" hint={current?.description}>
            <ChoiceChips
              options={types.map((t) => ({ value: t.value, label: t.label }))}
              value={form.type}
              onChange={(type) => set({ type })}
              ariaLabel="How"
              columns={types.length === 3 ? "grid-cols-3" : types.length === 2 ? "grid-cols-2" : "grid-cols-1"}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={FileText} title={offer ? "About the item" : "What do you need?"}>
        <div className="space-y-5">
          <Field
            label="Title"
            htmlFor="rent-title"
            required
            field="title"
            error={errs.title}
            hint={!errs.title ? "Brand + model + one key detail works best." : undefined}
            counter={<Counter value={form.title.length} max={LIMITS.title} />}
          >
            <input
              id="rent-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value.slice(0, LIMITS.title) })}
              placeholder={TITLE_PLACEHOLDERS[form.intent][form.type]}
              aria-invalid={Boolean(errs.title) || undefined}
              className={cn(inputClass(errs.title), "h-11")}
            />
          </Field>

          <Field label="Category" required field="category" error={errs.category}>
            <Select
              value={form.category}
              onChange={(category) => set({ category })}
              options={RENT_CATEGORIES.map(({ value, label }) => ({ value, label }))}
              placeholder="Select a category"
              ariaLabel="Category"
              invalid={Boolean(errs.category)}
            />
          </Field>

          {showsCondition(form) && (
            <Field label="Condition" optional>
              <ChoiceChips
                options={CONDITION_OPTIONS.map(({ value, label }) => ({ value, label }))}
                value={form.condition}
                onChange={(condition) => set({ condition: condition === form.condition ? "" : condition })}
                ariaLabel="Condition"
                columns="grid-cols-2 sm:grid-cols-4"
              />
            </Field>
          )}

          <Field
            label="Description"
            htmlFor="rent-desc"
            optional
            field="description"
            error={errs.description}
            hint={offer ? "What's included, how it's been used, any quirks." : "What you need it for and for how long."}
            counter={<Counter value={form.description.length} max={LIMITS.description} />}
          >
            <textarea
              id="rent-desc"
              rows={5}
              value={form.description}
              onChange={(e) => set({ description: e.target.value.slice(0, LIMITS.description) })}
              placeholder={offer ? "e.g. Light racket, fresh grip. Shuttles not included." : "e.g. Need it to iron a shirt before my viva tomorrow."}
              aria-invalid={Boolean(errs.description) || undefined}
              className={cn(inputClass(errs.description), "resize-y py-3 leading-relaxed")}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}

/* ── Step 3: price + handover ── */
function PriceStep({ form, set, errs, blocks }) {
  const offer = isOffer(form);
  const presets = neededByPresets();
  const bounds = availableDateBounds();
  const blocksRequired = blocks.length > 0;
  const amountHint = Number(form.amount) > 0 ? `Shows as ${formatPrice(priceOf(form))} on the board.` : undefined;

  return (
    <div className="space-y-4 max-sm:space-y-2">
      <FormSection
        icon={IndianRupee}
        title={offer ? "Price" : "What you'll pay"}
        description={offer ? "Paid to you directly by UPI or cash. The app never handles money." : "Settled directly between you two, by UPI or cash."}
      >
        <div className="space-y-5">
          {form.type === "rent" && (
            <>
              <Field label={offer ? "Rental price" : "Your budget"} htmlFor="rent-amount" required field="amount" error={errs.amount} hint={amountHint}>
                <MoneyInput
                  id="rent-amount"
                  value={form.amount}
                  onChange={(amount) => set({ amount })}
                  placeholder="30"
                  suffix={UNIT_SUFFIX[form.rentUnit]}
                  invalid={Boolean(errs.amount)}
                  className="sm:max-w-xs"
                />
              </Field>
              <Field label="Charged">
                <ChoiceChips options={RENT_UNIT_OPTIONS} value={form.rentUnit} onChange={(rentUnit) => set({ rentUnit })} ariaLabel="Charged" columns="grid-cols-3" />
              </Field>
            </>
          )}

          {form.type === "lend" && (
            <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3.5 py-3 text-[13.5px] text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
              {offer ? "Free to borrow. You can still ask for a refundable deposit below." : "Asking as a favour, no payment. Return it on time and you'll build a good rating."}
            </p>
          )}

          {form.type === "give" && (
            <>
              <Field label="Price">
                <ChoiceChips
                  options={[
                    { value: "free", label: "Free" },
                    { value: "paid", label: "Ask per item" },
                  ]}
                  value={form.givePaid ? "paid" : "free"}
                  onChange={(v) => set({ givePaid: v === "paid" })}
                  ariaLabel="Price"
                  columns="grid-cols-2"
                />
              </Field>
              {form.givePaid && (
                <Field label={offer ? "Price per item" : "You'll pay per item"} htmlFor="rent-amount" required field="amount" error={errs.amount} hint={amountHint}>
                  <MoneyInput
                    id="rent-amount"
                    value={form.amount}
                    onChange={(amount) => set({ amount })}
                    placeholder="15"
                    suffix="each"
                    invalid={Boolean(errs.amount)}
                    className="sm:max-w-xs"
                  />
                </Field>
              )}
              <Field label={offer ? "How many can you give?" : "How many do you need?"} htmlFor="rent-qty">
                <QuantityStepper id="rent-qty" value={form.quantity} onChange={(quantity) => set({ quantity })} max={LIMITS.quantity} label="Quantity" />
              </Field>
            </>
          )}

          {offer && form.type !== "give" && (
            <Field
              label="Refundable deposit"
              htmlFor="rent-deposit"
              optional
              field="deposit"
              error={errs.deposit}
              hint="Collected at handover, returned when the item comes back."
            >
              <MoneyInput
                id="rent-deposit"
                value={form.deposit}
                onChange={(deposit) => set({ deposit })}
                maxDigits={5}
                placeholder="0"
                invalid={Boolean(errs.deposit)}
                className="sm:max-w-xs"
              />
            </Field>
          )}

          {offer ? (
            <Field
              label="Available"
              field="availableUntil"
              error={errs.availableUntil}
              hint={form.hasEndDate ? "The listing closes on its own after this day." : "Stays up until you pause or remove it."}
            >
              <ChoiceChips
                options={[
                  { value: "open", label: "No end date" },
                  { value: "until", label: "Until a date" },
                ]}
                value={form.hasEndDate ? "until" : "open"}
                onChange={(v) =>
                  set({
                    hasEndDate: v === "until",
                    ...(v === "until" && !form.availableUntil ? { availableUntil: toDateInput(Date.now() + 7 * DAY) } : {}),
                  })
                }
                ariaLabel="Available"
                columns="grid-cols-2"
              />
              {form.hasEndDate && (
                <input
                  type="date"
                  aria-label="Last day it's available"
                  min={bounds.min}
                  max={bounds.max}
                  value={form.availableUntil}
                  onChange={(e) => set({ availableUntil: e.target.value })}
                  aria-invalid={Boolean(errs.availableUntil) || undefined}
                  className={cn(inputClass(errs.availableUntil), "mt-3 h-11 sm:max-w-xs")}
                />
              )}
            </Field>
          ) : (
            <Field label="Needed by" htmlFor="rent-needed" required field="neededBy" error={errs.neededBy} hint="Your request closes after this. Up to 48 hours.">
              <input
                id="rent-needed"
                type="datetime-local"
                value={form.neededBy}
                min={toLocalInput(new Date(Date.now() + 15 * 60 * 1000))}
                max={toLocalInput(new Date(Date.now() + LIMITS.requestHours * HOUR))}
                onChange={(e) => set({ neededBy: e.target.value })}
                aria-invalid={Boolean(errs.neededBy) || undefined}
                className={cn(inputClass(errs.neededBy), "h-11 sm:max-w-xs")}
              />
              <QuickChips
                options={Object.keys(presets)}
                isActive={(label) => form.neededBy === presets[label]}
                onPick={(label) => set({ neededBy: presets[label] })}
                label="Quick picks"
              />
            </Field>
          )}
        </div>
      </FormSection>

      <FormSection icon={MapPin} title="Handover" description="Shown on your post. Room numbers stay private; share them in the chat.">
        <div className="space-y-5">
          <Field
            label="Your block"
            htmlFor="rent-block"
            required={blocksRequired}
            optional={!blocksRequired}
            field="block"
            error={errs.block}
            hint={offer ? "Students in your block see it first." : "Students in this block get a ping."}
            className="sm:max-w-sm"
          >
            {blocksRequired ? (
              <Select
                value={form.block}
                onChange={(block) => set({ block })}
                options={blocks.map((b) => ({ value: b, label: b }))}
                placeholder="Pick your block"
                ariaLabel="Your block"
                invalid={Boolean(errs.block)}
              />
            ) : (
              <input id="rent-block" value={form.block} onChange={(e) => set({ block: e.target.value.slice(0, 40) })} placeholder="e.g. Block C" className={cn(inputClass(false), "h-11")} />
            )}
          </Field>

          <Field label={offer ? "Pickup spot" : "Where to meet"} htmlFor="rent-spot" optional field="spot" error={errs.spot} counter={<Counter value={form.spot.length} max={LIMITS.spot} />}>
            <input
              id="rent-spot"
              value={form.spot}
              onChange={(e) => set({ spot: e.target.value.slice(0, LIMITS.spot) })}
              placeholder={`e.g. ${form.block || "Block C"} lobby, near the lift`}
              aria-invalid={Boolean(errs.spot) || undefined}
              className={cn(inputClass(errs.spot), "h-11")}
            />
            <QuickChips options={PICKUP_SPOTS} isActive={(o) => form.spot === o} onPick={(o) => set({ spot: form.spot === o ? "" : o })} label="Common spots" />
          </Field>

          {/* Requests already say when ("Needed by"), so only offers ask for a time. */}
          {offer && (
            <Field label="Best time" htmlFor="rent-timing" optional field="timing" error={errs.timing} counter={<Counter value={form.timing.length} max={LIMITS.timing} />}>
              <input
                id="rent-timing"
                value={form.timing}
                onChange={(e) => set({ timing: e.target.value.slice(0, LIMITS.timing) })}
                placeholder="e.g. After 9 PM on weekdays"
                aria-invalid={Boolean(errs.timing) || undefined}
                className={cn(inputClass(errs.timing), "h-11")}
              />
              <QuickChips options={HANDOVER_TIMES} isActive={(o) => hasTimingPart(form.timing, o)} onPick={(o) => set({ timing: toggleTimingPart(form.timing, o) })} label="Times" />
            </Field>
          )}

          {showsReturnPolicy(form) && (
            <Field
              label="Return policy"
              htmlFor="rent-policy"
              optional
              field="returnPolicy"
              error={errs.returnPolicy}
              counter={<Counter value={form.returnPolicy.length} max={LIMITS.returnPolicy} />}
            >
              <textarea
                id="rent-policy"
                rows={2}
                value={form.returnPolicy}
                onChange={(e) => set({ returnPolicy: e.target.value.slice(0, LIMITS.returnPolicy) })}
                placeholder="How should it come back?"
                aria-invalid={Boolean(errs.returnPolicy) || undefined}
                className={cn(inputClass(errs.returnPolicy), "resize-none py-2.5 leading-relaxed")}
              />
              <QuickChips
                options={RETURN_POLICY_PRESETS}
                labelOf={(o) => o.replace(/\.$/, "")}
                isActive={(o) => form.returnPolicy.includes(o)}
                onPick={(o) => set({ returnPolicy: togglePolicyLine(form.returnPolicy, o) })}
                label="Common rules"
              />
            </Field>
          )}

          <Field label="Anything else?" htmlFor="rent-notes" optional field="notes" error={errs.notes} counter={<Counter value={form.notes.length} max={LIMITS.notes} />}>
            <textarea
              id="rent-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value.slice(0, LIMITS.notes) })}
              placeholder={offer ? "e.g. Ping me in the chat 10 minutes before you come down." : "e.g. Only need it for 30 minutes; I'll bring it straight back."}
              aria-invalid={Boolean(errs.notes) || undefined}
              className={cn(inputClass(errs.notes), "resize-none py-2.5 leading-relaxed")}
            />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}

/* ── Step 4: review ── */
function ReviewStep({ form, isEdit, busyLabel, onPublish, onEditStep, onBack, publishLabel }) {
  const offer = isOffer(form);
  const s = summarize(form);
  const typeLabel = LISTING_TYPES[form.intent].find((t) => t.value === form.type)?.label;
  const checklist = [
    { step: 1, label: "Details", detail: [typeLabel, form.title.trim(), s.category].filter(Boolean).join(" · ") },
    { step: 2, label: "Photos", detail: form.images.length ? `${form.images.length} photo${form.images.length === 1 ? "" : "s"}` : "No photos" },
    { step: 3, label: "Price & handover", detail: [s.price, form.block].filter(Boolean).join(" · ") },
  ];
  const busy = Boolean(busyLabel);
  const PublishIcon = isEdit ? Save : Rocket;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      <ReviewPanel form={form} />

      <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)]">
        <section className={cn(CARD, FLUSH_ON_PHONE, "p-4 sm:p-5")}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{isEdit ? "Ready to save" : "Ready to publish"}</p>
              <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">Check each step, then {isEdit ? "save" : "publish"}.</p>
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
                  onClick={() => onEditStep(item.step)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline disabled:opacity-50"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 hidden flex-col gap-2 sm:flex">
            <button
              type="button"
              onClick={onPublish}
              disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {busy ? (
                <>
                  <BrandLoader size="sm" tone="white" />
                  <span>{busyLabel}</span>
                </>
              ) : (
                <>
                  <PublishIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {publishLabel}
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-[12px] text-slate-400 dark:text-zinc-500">
            {isEdit
              ? "Students see the changes right after you save."
              : offer
                ? "You can edit, pause or remove it any time."
                : `Students in ${form.block || "your block"} get a ping as soon as you post.`}
          </p>
        </section>
      </aside>

      {/* Phones: docked publish bar */}
      <div className="sm:hidden">
        <StepFooter onBack={onBack} onNext={onPublish} nextLabel={publishLabel} nextIcon={PublishIcon} loading={busy} loadingLabel={busyLabel} />
      </div>
    </div>
  );
}

function Flow({ rent }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { userDetails } = useUser();
  const userId = userDetails?._id || null;
  const isEdit = Boolean(id);
  const kindParam = params.get("kind");
  useAppScreen();

  const [form, setForm] = useState(() => blankForm(kindParam === "request" ? "request" : "offer", rent.profile));
  const [lockedMode, setLockedMode] = useState(null); // edit: kind + mode are fixed by the API
  const [loading, setLoading] = useState(isEdit);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(isEdit ? 4 : 1);
  const [attempted, setAttempted] = useState(() => new Set());
  const [busyLabel, setBusyLabel] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const draftReady = useRef(isEdit);
  const imagesRef = useRef([]);

  const set = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);

  // Edit: load the post.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    getRentPost(id, { fresh: true })
      .then((post) => {
        if (cancelled) return;
        if (!post.isMine) {
          navigate(`/rent/${id}`, { replace: true });
          return;
        }
        setForm(formFromPost(post));
        setLockedMode(post.mode);
      })
      .catch((err) => {
        toast.error(rentErrorMessage(err, "Couldn't open this listing"));
        navigate("/rentals?tab=posts", { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  // New: pick up the draft saved on this device (like Sell), unless the
  // entry point asked for the other kind of post.
  useEffect(() => {
    if (isEdit || !userId || draftReady.current) return;
    draftReady.current = true;
    const draft = readDraft(userId);
    if (draft && (!kindParam || draft.form.intent === kindParam)) setForm(formFromDraft(draft, rent.profile));
  }, [isEdit, userId, kindParam, rent.profile]);

  // ...and keep it saved as they type.
  useEffect(() => {
    if (isEdit || !userId || !draftReady.current) return undefined;
    const t = setTimeout(() => writeDraft(userId, form), 500);
    return () => clearTimeout(t);
  }, [form, isEdit, userId]);

  // Free local photo previews when leaving the page.
  useEffect(() => {
    imagesRef.current = form.images;
  }, [form.images]);
  useEffect(() => () => imagesRef.current.forEach((img) => img.preview && URL.revokeObjectURL(img.preview)), []);

  const errors = useMemo(() => computeErrors(form, { blocksRequired: rent.blocks.length > 0 }), [form, rent.blocks.length]);
  const errs = visibleErrors(errors, attempted);

  const goTo = (n) => {
    setStep(n);
    setPreviewOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const canJump = (n) => isEdit || n <= maxStep;
  const next = () => {
    setAttempted((prev) => new Set(prev).add(step));
    const field = firstErrorField(errors, step);
    if (field) {
      scrollToField(field);
      return;
    }
    setMaxStep((m) => Math.max(m, step + 1));
    goTo(step + 1);
  };
  const goBack = () => {
    if (step > 1) return goTo(step - 1);
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(isEdit ? `/rent/${id}` : "/rent");
  };

  const startOver = () => {
    clearDraft(userId);
    form.images.forEach((img) => img.preview && URL.revokeObjectURL(img.preview));
    setForm(blankForm(form.intent, rent.profile));
    setAttempted(new Set());
    setMaxStep(1);
    goTo(1);
  };

  const offer = isOffer(form);
  const publishLabel = isEdit ? "Save changes" : offer ? "Publish listing" : "Post request";

  const publish = async () => {
    setAttempted(new Set([1, 2, 3]));
    const badStep = firstStepWithErrors(errors);
    if (badStep) {
      goTo(badStep);
      setTimeout(() => {
        const field = firstErrorField(errors, badStep);
        if (field) scrollToField(field);
      }, 80);
      toast.error("A few details need a fix before publishing");
      return;
    }

    const uploaded = [];
    try {
      const fresh = form.images.filter((img) => img.file).length;
      const images = [];
      for (const img of form.images) {
        if (img.file) {
          setBusyLabel(fresh > 1 ? `Uploading photo ${uploaded.length + 1} of ${fresh}…` : "Uploading photo…");
          const saved = await uploadImage(img.file, "Rent");
          uploaded.push(saved);
          images.push({ url: saved.url, fileId: saved.fileId || null });
        } else {
          images.push({ url: img.url, fileId: img.fileId || null });
        }
      }
      setBusyLabel(isEdit ? "Saving…" : "Publishing…");
      const body = buildBody(form, { blocks: rent.blocks, images });
      const post = isEdit ? await updateRentPost(id, body) : await createRentPost({ ...body, kind: form.intent, mode: modeOf(form.type) });
      if (!isEdit) clearDraft(userId);
      toast.success(isEdit ? "Changes saved" : offer ? "Your listing is live" : "Request posted. Your block has been pinged.");
      navigate(`/rent/${post.id}`, { replace: true });
    } catch (err) {
      uploaded.forEach((img) => deleteImage(img.fileId));
      toast.error(rentErrorMessage(err, err?.message || "Couldn't save. Try again."));
    } finally {
      setBusyLabel(null);
    }
  };

  if (loading) return <BrandLoader size="full" />;

  const heading = isEdit ? "Edit listing" : offer ? "Post an item" : "Ask for something";
  const subheading = isEdit
    ? "Changes go live as soon as you save them."
    : offer
      ? "Rent it out, lend it or give it away. Students on your campus see it right away."
      : "Say what you need and by when. Students in your block get a ping.";
  const current = STEPS[step - 1];
  const isReview = step === 4;

  const view =
    step === 1 ? (
      <>
        <DetailsStep form={form} set={set} errs={errs} isEdit={isEdit} lockedMode={lockedMode} />
        <div className="mt-4">
          <StepFooter onNext={next} nextLabel="Continue to photos" />
        </div>
      </>
    ) : step === 2 ? (
      <>
        <FormSection
          icon={Camera}
          title="Photos"
          description={offer ? "Add up to 3. The first one is the cover." : "Optional. A reference photo helps people know exactly what you mean."}
        >
          <PhotoDropzone images={form.images} onChange={(images) => set({ images })} />
        </FormSection>
        <div className="mt-4">
          <StepFooter onBack={() => goTo(1)} onNext={next} nextLabel={form.images.length ? "Continue to price" : "Skip photos"} />
        </div>
      </>
    ) : step === 3 ? (
      <>
        <PriceStep form={form} set={set} errs={errs} blocks={rent.blocks} />
        <div className="mt-4">
          <StepFooter onBack={() => goTo(2)} onNext={next} nextLabel="Continue to review" />
        </div>
      </>
    ) : (
      <ReviewStep
        form={form}
        isEdit={isEdit}
        busyLabel={busyLabel}
        onPublish={publish}
        onEditStep={goTo}
        onBack={() => goTo(3)}
        publishLabel={publishLabel}
      />
    );

  return (
    <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <Seo title={`${heading} | Rent & Borrow | Unideals`} robots="noindex,nofollow" />

      {/* Phones: app bar with step progress */}
      <MobileAppBar
        title={heading}
        subtitle={`Step ${step} of ${STEPS.length} · ${current.label}`}
        onBack={goBack}
        closeIcon={step === 1}
        action={
          !isReview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold text-[var(--accent-text)] active:bg-[var(--accent-soft)]"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </button>
          ) : null
        }
      >
        <StepBars step={step} />
      </MobileAppBar>

      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        <div className="hidden items-start justify-between gap-4 sm:flex">
          <div className="min-w-0">
            <button
              type="button"
              onClick={goBack}
              className="-ml-1.5 inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {step > 1 ? "Previous step" : "Back"}
            </button>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{heading}</h1>
            <p className="mt-0.5 text-[13.5px] text-slate-500 dark:text-zinc-400">{subheading}</p>
          </div>
          {!isEdit && (
            <p className="mt-9 flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-slate-400 dark:text-zinc-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              Draft saved on this device
              {!isPristine(form) && (
                <>
                  <span aria-hidden="true">·</span>
                  <button type="button" onClick={startOver} className="font-semibold text-slate-500 hover:text-slate-800 hover:underline dark:text-zinc-400 dark:hover:text-white">
                    Start over
                  </button>
                </>
              )}
            </p>
          )}
        </div>
        <div className="mt-7 hidden sm:block">
          <RentStepper step={step} canJump={canJump} onJump={goTo} />
        </div>

        <div className={cn("grid grid-cols-1 items-start gap-6 sm:mt-7", !isReview && "lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]")}>
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {view}
              </motion.div>
            </AnimatePresence>
          </div>

          {!isReview && (
            <aside className="hidden flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)] lg:flex">
              <PreviewCard form={form} />
              <RentTipsCard step={step} />
            </aside>
          )}
        </div>

        {!isEdit && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-slate-400 sm:hidden dark:text-zinc-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            Draft saved on this device
          </p>
        )}
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen} title="Preview" description="How other students will see your post.">
        <PreviewCard form={form} className="border-0 p-0 shadow-none" />
      </Sheet>
    </div>
  );
}

export default function RentPostForm() {
  return <RentGate>{(rent) => <Flow rent={rent} />}</RentGate>;
}
