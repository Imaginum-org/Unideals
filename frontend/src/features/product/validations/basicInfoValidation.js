export const validateBasicInfo = (formData) => {
  const errors = {};

  const title = String(formData.title ?? "").trim();
  if (!title) {
    errors.title = "Product title is required";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  } else if (title.length > 120) {
    errors.title = "Title must be under 120 characters";
  }

  const brand = String(formData.brand ?? "").trim();
  if (brand.length > 100) {
    errors.brand = "Brand must be under 100 characters";
  }

  const color = String(formData.color ?? "").trim();
  if (color.length > 50) {
    errors.color = "Color must be under 50 characters";
  }

  if (!formData.category) {
    errors.category = "Please select a category";
  }

  if (!formData.description?.trim()) {
    errors.description = "Description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  }

  if (!formData.condition) {
    errors.condition = "Please select product condition";
  }

  if (!formData.usageDuration) {
    errors.usageDuration = "Please select usage duration";
  }

  if (!formData.purchaseDate) {
    errors.purchaseDate = "Purchase date is required";
  } else {
    const purchase = new Date(formData.purchaseDate);
    const now = new Date();
    const earliest = new Date("2000-01-01");
    if (Number.isNaN(purchase.getTime())) {
      errors.purchaseDate = "Enter a valid purchase date";
    } else if (purchase > now) {
      errors.purchaseDate = "Purchase date cannot be in the future";
    } else if (purchase < earliest) {
      errors.purchaseDate = "Purchase date cannot be before year 2000";
    }
  }

  return errors;
};
