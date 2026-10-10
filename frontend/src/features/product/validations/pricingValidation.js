const MAX_PRICE = 10000000;
const MIN_PRICE = 10;

export const validatePricing = (formData) => {
  const errors = {};

  const selling = Number(formData.sellingPrice);
  const original = Number(formData.originalPrice);

  if (!formData.sellingPrice && formData.sellingPrice !== 0) {
    errors.sellingPrice = "Selling price is required";
  } else if (!Number.isFinite(selling) || selling < MIN_PRICE) {
    errors.sellingPrice = `Enter a valid selling price of at least ₹${MIN_PRICE}`;
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
    selling >= MIN_PRICE &&
    original > 0 &&
    selling > original
  ) {
    errors.sellingPrice = "Selling price cannot exceed original price";
  }

  // Mirror backend: discount capped at 90% (selling >= 10% of original).
  if (
    Number.isFinite(selling) &&
    Number.isFinite(original) &&
    selling >= MIN_PRICE &&
    original > 0 &&
    !errors.sellingPrice &&
    selling < original * 0.1
  ) {
    errors.sellingPrice = "Discount cannot exceed 90% of original price";
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
