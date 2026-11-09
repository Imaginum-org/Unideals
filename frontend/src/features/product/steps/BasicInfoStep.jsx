import { useEffect, useMemo, useState } from "react";
import { FileText, Lock, SlidersHorizontal, Sparkles } from "lucide-react";
import useProductListing from "../hooks/useProductListing";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CONDITION_OPTIONS,
  PRODUCT_USAGE_OPTIONS,
  GIRLS_ONLY_CATEGORIES,
  orderCategoriesForGirls,
} from "../constants/productOptions";
import { useUser } from "../../../context/useUserContext.jsx";
import { normalizeMultiline } from "../../../utils/text.js";
import { validateBasicInfo } from "../validations";
import Select from "../../../components/ui/Select.jsx";
import VisibilitySelector from "../components/VisibilitySelector.jsx";
import {
  AutoTag,
  ChoiceChips,
  Counter,
  Field,
  FormSection,
  StepFooter,
  inputClass,
} from "../components/listing/ListingKit.jsx";
import {
  allowedUsage,
  draftDescription,
  fixedValue,
  guessFromTitle,
  isFieldOff,
  purchaseDateShortcuts,
  rulesFor,
} from "../utils/listingSmarts.js";
import { cn } from "../../../utils/cn.js";

const TITLE_MAX = 120;
const DESC_MAX = 1000;
const today = () => new Date().toISOString().split("T")[0];

const BasicInfoStep = () => {
  const { formData, updateField, nextStep, errors, validateAndProceed } = useProductListing();
  const { userDetails, isLoggedIn } = useUser();
  // Which values the form filled in (shows an "Auto-filled" tag; any manual
  // edit clears it). Session-only UI state.
  const [auto, setAuto] = useState({});

  // Girls-only categories are offered only to eligible sellers; picking one
  // auto-enables Girl-only (backend enforces the same).
  const girlsEligible = isLoggedIn && (userDetails?.gender === "female" || userDetails?.role === "admin");
  const categoryOptions = girlsEligible
    ? orderCategoriesForGirls(PRODUCT_CATEGORY_OPTIONS)
    : PRODUCT_CATEGORY_OPTIONS.filter((o) => !o.girlsOnly);
  const allowedCategories = useMemo(() => categoryOptions.map((o) => o.value), [categoryOptions]);
  const selectedCategory = PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === formData.category);
  const isGirlsCategory = GIRLS_ONLY_CATEGORIES.includes(formData.category);
  const rules = rulesFor(formData.category);
  const colourOff = isFieldOff(formData.category, "color");
  const fixedCondition = fixedValue(formData.category, "condition");
  const fixedUsage = fixedValue(formData.category, "usage");

  // Manual edit: set the value and drop the auto tag.
  const setManual = (field, value) => {
    updateField(field, value);
    setAuto((a) => (a[field] ? { ...a, [field]: false } : a));
  };
  const setAutoValue = (field, value) => {
    updateField(field, value);
    setAuto((a) => ({ ...a, [field]: true }));
  };

  const handleCategoryChange = (value) => {
    setManual("category", value || "");
    if (GIRLS_ONLY_CATEGORIES.includes(value)) updateField("isGirlsOnly", true);
  };

  // Title → category / brand / colour, only into EMPTY fields (never
  // overwrites what the seller typed). Runs when they leave the title.
  const applyTitleSmarts = () => {
    const g = guessFromTitle(formData.title, { allowedCategories });
    if (g.category && !formData.category) {
      setAutoValue("category", g.category);
      if (GIRLS_ONLY_CATEGORIES.includes(g.category)) updateField("isGirlsOnly", true);
    }
    if (g.brand && !String(formData.brand || "").trim()) setAutoValue("brand", g.brand.slice(0, 100));
    const category = formData.category || g.category;
    if (g.color && !String(formData.color || "").trim() && !isFieldOff(category, "color")) {
      setAutoValue("color", g.color.slice(0, 50));
    }
  };

  // Category rules: fields that don't apply are cleared; single-value
  // fields are locked to that value (required checks still pass).
  useEffect(() => {
    if (colourOff && formData.color) updateField("color", "");
    if (fixedCondition && formData.condition !== fixedCondition) setAutoValue("condition", fixedCondition);
    if (fixedUsage && formData.usageDuration !== fixedUsage) setAutoValue("usageDuration", fixedUsage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  // Specifications are linked: usage can't exceed the time since purchase,
  // and a Brand New item hasn't been used. Fill usage from the purchase
  // date when it's empty, and pull it back when it becomes impossible.
  const usageAllowed = useMemo(
    () => allowedUsage({ purchaseDate: formData.purchaseDate, condition: formData.condition, category: formData.category }),
    [formData.purchaseDate, formData.condition, formData.category],
  );
  useEffect(() => {
    const longest = usageAllowed[usageAllowed.length - 1];
    const known = Boolean(formData.purchaseDate) || formData.condition === "brand_new" || Boolean(fixedUsage);
    if (!formData.usageDuration && known) setAutoValue("usageDuration", longest);
    else if (formData.usageDuration && !usageAllowed.includes(formData.usageDuration)) setAutoValue("usageDuration", longest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageAllowed]);

  const usageOptions = PRODUCT_USAGE_OPTIONS.map((o) => ({ ...o, disabled: !usageAllowed.includes(o.value) }));
  const usageLabel = PRODUCT_USAGE_OPTIONS.find((o) => o.value === formData.usageDuration)?.label || "";
  const descLength = normalizeMultiline(formData.description || "").length;
  const canDraftDescription = Boolean(String(formData.title || "").trim().length >= 3 && formData.condition);
  const shortcuts = useMemo(() => purchaseDateShortcuts(), []);

  const writeDescription = () => {
    const text = draftDescription(formData, usageLabel);
    if (text) setAutoValue("description", text.slice(0, DESC_MAX));
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <FormSection icon={FileText} title="About the item" description="Start with the title. We'll fill in what we can from it.">
        <div className="flex flex-col gap-5">
          <Field
            label="Title"
            htmlFor="listing-title"
            required
            field="title"
            error={errors.title}
            hint="Brand + model + key detail works best. Category, brand and colour fill in from it."
            counter={<Counter value={formData.title.length} max={TITLE_MAX} />}
          >
            <input
              id="listing-title"
              type="text"
              maxLength={TITLE_MAX}
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              onBlur={applyTitleSmarts}
              onKeyDown={(e) => e.key === "Enter" && applyTitleSmarts()}
              placeholder={rules.titlePlaceholder || "e.g. Casio fx-991ES Plus scientific calculator"}
              className={`${inputClass(errors.title)} h-11`}
              autoComplete="off"
              enterKeyHint="next"
            />
          </Field>

          <Field
            label="Category"
            required
            field="category"
            error={errors.category}
            hint={selectedCategory?.description || "Pick the closest match so buyers can find it."}
            counter={<AutoTag show={auto.category} label="From title" />}
          >
            <Select
              value={formData.category}
              onChange={handleCategoryChange}
              options={categoryOptions.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Select a category"
              ariaLabel="Category"
              invalid={Boolean(errors.category)}
            />
          </Field>
          {isGirlsCategory && (
            <p className="-mt-2 rounded-lg bg-pink-50 px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-pink-800 ring-1 ring-pink-200 dark:bg-pink-950/30 dark:text-pink-200 dark:ring-pink-900/50">
              🌸 Girls-only category: only girls on your campus can see this listing.
            </p>
          )}

          <Field
            label="Description"
            htmlFor="listing-description"
            required
            field="description"
            error={errors.description}
            hint="What's included, how it's been used, any flaws."
            counter={<Counter value={descLength} max={DESC_MAX} />}
          >
            <div className="relative">
              <textarea
                id="listing-description"
                rows={6}
                maxLength={DESC_MAX}
                value={formData.description}
                onChange={(e) => setManual("description", e.target.value)}
                // Tidy on blur (not per keystroke, so typing a space or a new
                // paragraph never fights the cursor). Server normalises too.
                onBlur={(e) => {
                  const clean = normalizeMultiline(e.target.value);
                  if (clean !== e.target.value) updateField("description", clean);
                }}
                placeholder="e.g. Bought in Aug 2024, used for one semester. Comes with the original cover and manual. Small scratch on the back."
                className={`${inputClass(errors.description)} min-h-[150px] resize-y py-3 pb-12 leading-relaxed`}
              />
              {!String(formData.description || "").trim() && (
                <button
                  type="button"
                  onClick={writeDescription}
                  disabled={!canDraftDescription}
                  title={canDraftDescription ? undefined : "Add a title and condition first"}
                  className="absolute bottom-3 left-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 text-[12.5px] font-semibold text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Write it for me
                </button>
              )}
            </div>
            {auto.description && (
              <p className="mt-1.5 text-[12.5px] text-[var(--accent-text)]">Drafted from your details. Edit anything that isn&apos;t right.</p>
            )}
          </Field>
        </div>
      </FormSection>

      <FormSection icon={SlidersHorizontal} title="Specifications" description="These are linked, so impossible combinations are ruled out for you.">
        <div className="flex flex-col gap-5">
          <Field
            label="Condition"
            required
            field="condition"
            error={errors.condition}
            hint={fixedCondition ? rules.condition?.why : undefined}
            counter={fixedCondition ? <LockedTag /> : null}
          >
            <ChoiceChips
              ariaLabel="Condition"
              options={PRODUCT_CONDITION_OPTIONS}
              value={formData.condition}
              onChange={(v) => setManual("condition", v)}
              invalid={Boolean(errors.condition)}
              disabled={Boolean(fixedCondition)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Purchase date"
              htmlFor="listing-purchase"
              required
              field="purchaseDate"
              error={errors.purchaseDate}
            >
              <input
                id="listing-purchase"
                type="date"
                min="2000-01-01"
                max={today()}
                value={formData.purchaseDate}
                onChange={(e) => setManual("purchaseDate", e.target.value)}
                className={`${inputClass(errors.purchaseDate)} h-11 [color-scheme:light] dark:[color-scheme:dark]`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick purchase dates">
                {shortcuts.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setManual("purchaseDate", s.value)}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                      formData.purchaseDate === s.value
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                        : "border-neutral-200 text-slate-600 hover:border-[var(--accent-ring)] dark:border-neutral-700 dark:text-zinc-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Used for"
              required
              field="usageDuration"
              error={errors.usageDuration}
              hint={
                fixedUsage
                  ? rules.usage?.why
                  : formData.condition === "brand_new"
                    ? "Brand New means unused."
                    : formData.purchaseDate
                      ? "Matched to your purchase date. Lower it if you used it for less."
                      : "Pick a purchase date and this fills in."
              }
              counter={fixedUsage ? <LockedTag /> : <AutoTag show={auto.usageDuration} />}
            >
              <Select
                value={formData.usageDuration}
                onChange={(v) => setManual("usageDuration", v || "")}
                options={usageOptions}
                placeholder="How long have you used it?"
                ariaLabel="Usage duration"
                invalid={Boolean(errors.usageDuration)}
                disabled={Boolean(fixedUsage) || formData.condition === "brand_new"}
              />
            </Field>

            <Field
              label="Brand / model"
              htmlFor="listing-brand"
              optional
              error={errors.brand}
              counter={<AutoTag show={auto.brand} label="From title" />}
            >
              <input
                id="listing-brand"
                type="text"
                maxLength={100}
                value={formData.brand}
                onChange={(e) => setManual("brand", e.target.value.slice(0, 100))}
                placeholder={rules.brandPlaceholder || "e.g. Casio"}
                className={`${inputClass(errors.brand)} h-11`}
              />
            </Field>

            <Field
              label="Colour"
              htmlFor="listing-color"
              optional={!colourOff}
              error={errors.color}
              hint={colourOff ? `Not needed for ${selectedCategory?.label || "this category"}.` : undefined}
              counter={<AutoTag show={auto.color && !colourOff} label="From title" />}
            >
              <input
                id="listing-color"
                type="text"
                maxLength={50}
                value={colourOff ? "" : formData.color}
                onChange={(e) => setManual("color", e.target.value.slice(0, 50))}
                placeholder={colourOff ? "Not applicable" : "e.g. Space grey"}
                disabled={colourOff}
                className={`${inputClass(errors.color)} h-11 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-slate-400 dark:disabled:bg-white/5`}
              />
            </Field>
          </div>
        </div>
      </FormSection>

      {/* Girls Corner visibility (renders only for eligible sellers) */}
      <VisibilitySelector />

      <StepFooter onNext={() => validateAndProceed(validateBasicInfo, nextStep)} nextLabel="Continue to photos" />
    </div>
  );
};

function LockedTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-400 dark:text-zinc-500">
      <Lock className="h-3 w-3" aria-hidden="true" />
      Set for this category
    </span>
  );
}

export default BasicInfoStep;
