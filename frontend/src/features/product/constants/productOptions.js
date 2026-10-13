export const PRODUCT_CATEGORY_OPTIONS = [
  {
    value: "electronics",
    label: "Electronics",
    description: "Laptops, tablets, calculators, headphones",
  },

  {
    value: "study_material",
    label: "Study Material",
    description: "Textbooks, notes, guides, question banks",
  },

  {
    value: "hostel_essentials",
    label: "Hostel Essentials",
    description: "Mattresses, buckets, lamps, room supplies",
  },

  {
    value: "clothing",
    label: "Clothing",
    description: "T-shirts, hoodies, jackets, ethnic wear",
  },

  {
    value: "accessories",
    label: "Accessories",
    description: "Watches, bags, wallets, earphones",
  },

  {
    value: "lab_equipment",
    label: "Lab Equipment",
    description: "Lab coats, kits, instruments, records",
  },

  {
    value: "sports",
    label: "Sports",
    description: "Cricket bats, footballs, rackets, gear",
  },

  {
    value: "fitness",
    label: "Fitness",
    description: "Dumbbells, resistance bands, gym equipment",
  },

  {
    value: "vehicles",
    label: "Vehicles",
    description: "Bicycles, scooters, bike accessories",
  },

  {
    value: "event_passes",
    label: "Event Passes",
    description: "Concerts, fests, workshops, competitions",
  },

  {
    value: "others",
    label: "Others",
    description: "Anything that doesn't fit above categories",
  },

  // Girls Corner 🌸 — shown ONLY in Girls Mode (female + admin/support).
  // Picking one auto-enables Girl-only: hidden from everyone else everywhere.
  {
    value: "beauty_personal_care",
    label: "Beauty & Personal Care",
    description: "Makeup, skincare, haircare, grooming essentials",
    girlsOnly: true,
  },

  {
    value: "womens_fashion",
    label: "Women's Fashion",
    description: "Dresses, kurtis, tops, ethnic and western wear",
    girlsOnly: true,
  },

  {
    value: "jewellery_hair_accessories",
    label: "Jewellery & Hair Accessories",
    description: "Earrings, necklaces, clips, bands, scrunchies",
    girlsOnly: true,
  },

  {
    value: "footwear_handbags",
    label: "Footwear & Handbags",
    description: "Heels, flats, sneakers, handbags, backpacks",
    girlsOnly: true,
  },

  {
    value: "room_decor",
    label: "Room & Hostel Decor",
    description: "Fairy lights, wall art, organizers, bedding, frames",
    girlsOnly: true,
  },
];

// Values hidden outside Girls Mode — keep in sync with backend GIRLS_ONLY_CATEGORIES.
export const GIRLS_ONLY_CATEGORIES = Object.freeze([
  "beauty_personal_care",
  "womens_fashion",
  "jewellery_hair_accessories",
  "footwear_handbags",
  "room_decor",
]);

// Girls Mode curation: the classic majors college girls actually browse +
// the 5 exclusives, ordered most → least suitable. Lab equipment, vehicles
// and fitness stay out of the Girls Mode rail (still listable via upload).
// Shop by Category + all category dropdowns share this order.
export const GIRLS_MODE_CATEGORY_ORDER = Object.freeze([
  "womens_fashion",
  "beauty_personal_care",
  "jewellery_hair_accessories",
  "footwear_handbags",
  "clothing",
  "accessories",
  "room_decor",
  "hostel_essentials",
  "study_material",
  "electronics",
  "event_passes",
  "sports",
  "others",
]);

// Sort any category option list girls-first by the curated order.
// Options outside the order (e.g. lab_equipment in upload) sink to the end.
export const orderCategoriesForGirls = (options) =>
  [...options].sort((a, b) => {
    const ia = GIRLS_MODE_CATEGORY_ORDER.indexOf(a.value);
    const ib = GIRLS_MODE_CATEGORY_ORDER.indexOf(b.value);
    const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    return ra - rb;
  });

export const PRODUCT_CONDITION_OPTIONS = [
  { value: "brand_new", label: "Brand New" },

  { value: "like_new", label: "Like New" },

  { value: "gently_used", label: "Gently Used" },

  { value: "well_used", label: "Well Used" },

  {
    value: "for_parts_or_not_working",
    label: "For Parts or Not Working",
  },
];

export const PRODUCT_USAGE_OPTIONS = [
  {
    value: "less_than_1_month",
    label: "Less than 1 month",
  },

  {
    value: "one_to_three_months",
    label: "1 - 3 months",
  },

  {
    value: "three_to_six_months",
    label: "3 - 6 months",
  },

  {
    value: "six_to_twelve_months",
    label: "6 - 12 months",
  },

  {
    value: "one_to_two_years",
    label: "1 - 2 years",
  },

  {
    value: "more_than_two_years",
    label: "More than 2 years",
  },
];

export const PRODUCT_PAYMENT_OPTIONS = [
  {
    value: "cash",
    label: "Cash",
  },

  {
    value: "upi",
    label: "UPI",
  },

  {
    value: "both",
    label: "Cash or UPI",
  },
];
