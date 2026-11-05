export const validateBasicInfo = (formData) => {
  const errors = {};

  if (!formData.title?.trim()) {
    errors.title = "Product title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
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
  }

  return errors;
};
