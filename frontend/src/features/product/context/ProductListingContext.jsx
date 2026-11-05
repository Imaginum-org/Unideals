import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
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

  // LOAD DRAFT
  useEffect(() => {
    const savedDraft = getDraftFromLocal();

    if (savedDraft) {
      savedDraft.images = [];
      savedDraft.imagePreviews = [];

      setFormData(savedDraft);
    }
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

  // AUTO SAVE DRAFT
useEffect(() => {
  const timer = setTimeout(() => {
    saveDraftToLocal(formData);
  }, 1000);

  return () => clearTimeout(timer);
}, [formData]);

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
