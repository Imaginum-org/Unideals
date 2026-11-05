const DRAFT_KEY = "unideals-product-draft";
const DRAFT_VERSION = 1;

export const saveDraftToLocal = (data) => {
  try {
    const draftData = {
      v: DRAFT_VERSION,
      savedAt: Date.now(),
      title: String(data.title || "").slice(0, 120),
      description: String(data.description || "").slice(0, 2000),
      category: data.category,
      condition: data.condition,
      usageDuration: data.usageDuration,
      brand: String(data.brand || "").slice(0, 100),
      color: String(data.color || "").slice(0, 50),
      purchaseDate: data.purchaseDate,
      sellingPrice: data.sellingPrice,
      originalPrice: data.originalPrice,
      negotiable: data.negotiable,
      paymentMethod: data.paymentMethod,
      meetupLocation: data.meetupLocation,
      termsAccepted: data.termsAccepted,
      termsVersion: data.termsVersion || "v1",
      termsAcceptedAt: data.termsAcceptedAt || null,
      // Persist pickup spot + edit identity so refresh resumes correctly.
      // Images are never persisted (File blobs can't survive reload).
      address: data.address
        ? {
            _id: data.address._id,
            name: String(data.address.name || data.address.address_line || "").slice(0, 200),
            detail: String(data.address.detail || data.address.city || "").slice(0, 500),
            address_line: String(data.address.address_line || data.address.name || "").slice(0, 200),
            city: String(data.address.city || data.address.detail || "").slice(0, 200),
            isPrimary: Boolean(data.address.isPrimary),
          }
        : null,
      editProductId: data.editProductId || null,
      images: [],
      imagePreviews: [],
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  } catch {
    // Quota exceeded or unavailable - ignore to avoid breaking listing flow
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }
};

export const getDraftFromLocal = () => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);

    if (!draft) return null;
    const parsed = JSON.parse(draft);
    // Expire drafts after 7 days to avoid stale resurrection
    if (
      parsed?.savedAt &&
      Date.now() - Number(parsed.savedAt) > 7 * 24 * 60 * 60 * 1000
    ) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }

    return null;
  }
};

export const removeDraftFromLocal = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
};
