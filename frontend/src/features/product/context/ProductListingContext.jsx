import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { saveDraftToLocal, getDraftFromLocal } from "../utils/draftStorage";

const ProductListingContext = createContext();

const initialFormData = {
  // Basic Info
  title: "",
  description: "",
  category: "",
  condition: "",
  usageDuration: "",
  brand: "",
  color: "",
  purchaseDate: "",

  // Images
  images: [],
  imagePreviews: [],

  // Pricing
  sellingPrice: "",
  originalPrice: "",
  negotiable: false,
  paymentMethod: "",

  // Address
  address: null,
  meetupLocation: "Foodys",

  // Terms
  termsAccepted: false,
};

export const ProductListingProvider = ({ children }) => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(initialFormData);

  // Edit mode: when editing an existing product, store its id here.
  const [editProductId, setEditProductId] = useState(null);
  const isEditMode = Boolean(editProductId);

  // Guard: don't load draft when edit mode has already seeded the form.
  const editInitialized = useRef(false);

  // LOAD DRAFT (only for new listings)
  useEffect(() => {
    if (editInitialized.current) return; // skip if edit mode seeded the form
    const savedDraft = getDraftFromLocal();

    if (savedDraft) {
      savedDraft.images = [];
      savedDraft.imagePreviews = [];

      setFormData(savedDraft);
    }
  }, []);

  // INIT EDIT MODE — call this with the raw product object from the API.
  // Maps backend fields → formData fields and marks this session as edit-mode.
  const initEditMode = useCallback((product) => {
    if (!product?._id) return;
    editInitialized.current = true;
    setEditProductId(product._id);

    // Map existing images to the "imagePreviews" format used by the UI.
    // In edit mode, existing images are stored as { url, fileId } objects
    // (already uploaded) rather than File blobs. PreviewStep distinguishes
    // them by checking instanceof File.
    const existingImages = (product.images || []).map((img) => ({
      id: img.fileId || img._id || crypto.randomUUID?.() || Date.now(),
      preview: img.url,
      url: img.url,
      fileId: img.fileId,
      isExisting: true, // flag so publish skips re-upload for these
    }));

    setFormData({
      title: product.title || "",
      description: product.description || "",
      category: product.category || "",
      condition: product.condition || "",
      usageDuration: product.attributes?.usage_duration || "",
      brand: product.attributes?.brand || "",
      color: product.attributes?.color || "",
      purchaseDate: product.attributes?.purchase_date
        ? product.attributes.purchase_date.slice(0, 10)
        : "",
      // Images: no File blobs — existing images are tracked in imagePreviews
      images: [],
      imagePreviews: existingImages,
      sellingPrice: product.selling_price != null ? String(product.selling_price) : "",
      originalPrice: product.original_price != null ? String(product.original_price) : "",
      negotiable: Boolean(product.is_negotiable),
      paymentMethod: product.payment_preference || "",
      address: product.pickup_address_snapshot
        ? {
            name: product.pickup_address_snapshot.address_line,
            detail: product.pickup_address_snapshot.city,
            address_line: product.pickup_address_snapshot.address_line,
            city: product.pickup_address_snapshot.city,
          }
        : null,
      meetupLocation: product.meetup_location || "Foodys",
      termsAccepted: true, // already accepted when originally listed
    });

    setStep(1);
    setErrors({});
  }, []);

  // STEP NAVIGATION
  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => prev - 1);
  }, []);

  const goToStep = useCallback((stepNumber) => {
    setStep(stepNumber);
  }, []);

  const clearFieldError = useCallback((field) => {
    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  }, []);

  // UPDATE FIELD
  const updateField = useCallback(
    (field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      clearFieldError(field);
    },
    [clearFieldError],
  );

  // UPDATE MULTIPLE FIELDS
  const updateFormData = useCallback((values) => {
    setFormData((prev) => ({
      ...prev,
      ...values,
    }));
  }, []);

  const validateAndProceed = useCallback(
    (validator, callback) => {
      const validationErrors = validator(formData);

      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        const firstField = Object.keys(validationErrors)[0];

        const element = document.querySelector(`[data-field="${firstField}"]`);

        element?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        return;
      }

      callback();
    },
    [formData],
  );

  // RESET
  const resetForm = useCallback(() => {
    setFormData(initialFormData);

    setStep(1);
  }, []);

  // AUTO SAVE DRAFT (skip in edit mode — we don't want to overwrite the draft)
  useEffect(() => {
    if (isEditMode) return;
    const timer = setTimeout(() => {
      saveDraftToLocal(formData);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, isEditMode]);

  // CONTEXT VALUE
  const value = useMemo(
    () => ({
      step,
      setStep,

      loading,
      setLoading,

      formData,
      setFormData,

      errors,
      setErrors,

      validateAndProceed,

      nextStep,
      prevStep,
      goToStep,

      updateField,
      updateFormData,

      resetForm,

      // Edit mode
      editProductId,
      isEditMode,
      initEditMode,
    }),
    [
      step,
      loading,
      formData,

      errors,

      validateAndProceed,

      nextStep,
      prevStep,
      goToStep,

      updateField,
      updateFormData,

      resetForm,

      editProductId,
      isEditMode,
      initEditMode,
    ],
  );

  return (
    <ProductListingContext.Provider value={value}>
      {children}
    </ProductListingContext.Provider>
  );
};

export const useProductListingContext = () => {
  const context = useContext(ProductListingContext);

  if (!context) {
    throw new Error(
      "useProductListingContext must be used inside ProductListingProvider",
    );
  }

  return context;
};
