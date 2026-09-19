const MAX_PRICE = 10000000;

export const validatePricing = (formData) => {
  const errors = {};

  const selling = Number(formData.sellingPrice);
  const original = Number(formData.originalPrice);

  if (!formData.sellingPrice && formData.sellingPrice !== 0) {
    errors.sellingPrice = "Selling price is required";
  } else if (!Number.isFinite(selling) || selling <= 0) {
    errors.sellingPrice = "Enter a valid selling price greater than 0";
  } else if (selling > MAX_PRICE) {
    errors.sellingPrice = "Selling price is too large";
  }

  if (!formData.originalPrice && formData.originalPrice !== 0) {
    errors.originalPrice = "Original price is required";
  } else if (!Number.isFinite(original) || original <= 0) {
    errors.originalPrice = "Enter a valid original price greater than 0";
  } else if (original > MAX_PRICE) {
    errors.originalPrice = "Original price is too large";
  }

  if (
    Number.isFinite(selling) &&
    Number.isFinite(original) &&
    selling > 0 &&
    original > 0 &&
    selling > original
  ) {
    errors.sellingPrice = "Selling price cannot exceed original price";
  }

  if (!formData.paymentMethod) {
    errors.paymentMethod = "Select a payment method";
  }

  if (!formData.address) {
    errors.address = "Please add a pickup spot";
  }

  if (!formData.termsAccepted) {
    errors.termsAccepted = "Please accept the terms";
  }

  return errors;
};
