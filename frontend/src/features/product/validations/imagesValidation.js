export const validateImages = (formData) => {
  const errors = {};

  if (!formData.images || formData.images.length < 1) {
    errors.images = "At least one image is required";
  }

  if (formData.images && formData.images.length > 3) {
    errors.images = "Maximum 3 images allowed";
  }

  return errors;
};
