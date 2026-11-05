export const validateImages = (formData) => {
  const errors = {};

  // Total = existing (already-uploaded, from edit mode) + newly added File blobs.
  const existingCount = (formData.imagePreviews || []).filter(
    (p) => p.isExisting,
  ).length;
  const totalImages = existingCount + (formData.images?.length || 0);

  if (totalImages < 1) {
    errors.images = "At least one image is required";
  }

  if (totalImages > 3) {
    errors.images = "Maximum 3 images allowed";
  }

  return errors;
};
