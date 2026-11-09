import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronDown, Eye, Lightbulb, X } from "lucide-react";
import useProductListing from "../../hooks/useProductListing";
import BasicInfoStep from "../../steps/BasicInfoStep";
import ImagesStep from "../../steps/ImagesStep";
import PricingStep from "../../steps/PricingStep";
import PreviewStep from "../../steps/PreviewStep";
import Stepper from "../stepper/Stepper";
import { STEPPER_STEPS } from "../stepper/stepperData";
import TipsCard from "../shared/TipsCard";
import LivePreview from "./LivePreview.jsx";
import MobileAppBar, { useAppScreen } from "../../../../components/layout/MobileAppBar.jsx";
import { cn } from "../../../../utils/cn.js";

/*
 * Sell / Edit listing shell.
 * Desktop: form column + sticky aside (live buyer preview + tips); the
 * Review step uses the full width.
 * Phones: a full-screen flow like native apps: app bar (close/back, step
 * title, progress, Preview), flush sections, docked action bar per step,
 * tips folded at the end, buyer preview in a bottom sheet.
 */
const STEPS = { 1: BasicInfoStep, 2: ImagesStep, 3: PricingStep, 4: PreviewStep };

const ListingLayout = () => {
  const { step, prevStep, isEditMode } = useProductListing();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const StepView = STEPS[step] || BasicInfoStep;
  const isReview = step === 4;
  const total = STEPPER_STEPS.length;
  const current = STEPPER_STEPS[step - 1];
  useAppScreen();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setPreviewOpen(false);
  }, [step]);

  const goBack = () => {
    if (step > 1) return prevStep();
    // Opened directly (no in-app history): fall back to home.
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      {/* Phones: app bar with step progress */}
      <MobileAppBar
        title={isEditMode ? "Edit listing" : "Sell an item"}
        subtitle={`Step ${step} of ${total} · ${current?.label || ""}`}
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
        <div className="flex gap-1 px-4 pb-2" aria-hidden="true">
          {STEPPER_STEPS.map((s) => (
            <span
              key={s.id}
              className={cn("h-1 flex-1 rounded-full transition-colors duration-300", s.id <= step ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700")}
            />
          ))}
        </div>
      </MobileAppBar>

      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        {/* sm+: page header + stepper (phones use the app bar above) */}
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
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{isEditMode ? "Edit listing" : "Sell an item"}</h1>
            <p className="mt-0.5 text-[13.5px] text-slate-500 dark:text-zinc-400">
              {isEditMode
                ? "Changes go live as soon as you save them."
                : "List it in a few minutes. Buyers on your campus see it right away."}
            </p>
          </div>
          {!isEditMode && (
            <p className="mt-9 flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-slate-400 dark:text-zinc-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              Draft saved on this device
            </p>
          )}
        </div>
        <div className="mt-7 hidden sm:block">
          <Stepper />
        </div>

        <div
          className={cn(
            "grid grid-cols-1 items-start gap-6 sm:mt-7",
            !isReview && "lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]",
          )}
        >
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <StepView />
              </motion.div>
            </AnimatePresence>

            {/* Below lg: tips fold away at the end of the step */}
            {!isReview && <MobileTips step={step} />}
          </div>

          {!isReview && (
            <aside className="hidden flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)] lg:flex">
              <LivePreview />
              <TipsCard step={step} />
            </aside>
          )}
        </div>

        {!isEditMode && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-slate-400 sm:hidden dark:text-zinc-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            Draft saved on this device
          </p>
        )}
      </div>

      <PreviewSheet open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
};

function MobileTips({ step }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3 text-left max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:rounded-none max-sm:border-x-0 dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800 dark:text-zinc-100">
          <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Tips for this step
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <TipsCard step={step} className="mt-2 max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Phones: the desktop live preview, in a bottom sheet. */
function PreviewSheet({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label="Buyer preview">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 100 && onClose()}
            className="relative w-full max-w-md rounded-t-3xl bg-[#F7F9FD] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 dark:bg-[#131313]"
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">How buyers see it</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 active:bg-neutral-200 dark:text-zinc-400 dark:active:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <LivePreview className="mx-auto max-w-[280px]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ListingLayout;
