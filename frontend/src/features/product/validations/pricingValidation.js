export const validatePricing = (formData) => {
  const errors = {};

  if (!formData.sellingPrice) {
    errors.sellingPrice = "Selling price is required";
  }

  if (!formData.originalPrice) {
    errors.originalPrice = "Original price is required";
  }

  if (
    formData.originalPrice &&
    formData.sellingPrice &&
    Number(formData.sellingPrice) > Number(formData.originalPrice)
  ) {
    errors.sellingPrice = "Selling price cannot exceed original price";
  }

  if (!formData.paymentMethod) {
    errors.paymentMethod = "Select a payment method";
  }

  if (!formData.address) {
    errors.address = "Please add a pickup address";
  }

  if (!formData.termsAccepted) {
    errors.termsAccepted = "Please accept the terms";
  }

  return errors;
};
