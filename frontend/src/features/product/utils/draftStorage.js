const DRAFT_KEY = "unideals-product-draft";

export const saveDraftToLocal = (data) => {
  try {
    const draftData = {
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      usageDuration: data.usageDuration,
      brand: data.brand,
      color: data.color,
      purchaseDate: data.purchaseDate,
      sellingPrice: data.sellingPrice,
      originalPrice: data.originalPrice,
      negotiable: data.negotiable,
      paymentMethod: data.paymentMethod,
      meetupLocation: data.meetupLocation,
      termsAccepted: data.termsAccepted,
      images: [],
      imagePreviews: [],
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  } catch (error) {
    console.error("Failed to save draft:", error);
  }
};

export const getDraftFromLocal = () => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);

    return draft ? JSON.parse(draft) : null;
  } catch (error) {
    console.error("Failed to load draft:", error);

    return null;
  }
};

export const removeDraftFromLocal = () => {
  localStorage.removeItem(DRAFT_KEY);
};
