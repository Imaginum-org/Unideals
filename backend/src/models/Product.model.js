import mongoose, { Schema } from "mongoose";
import slugify from "slugify";
import { nanoid } from "nanoid";
import { normalizeMultiline } from "../utils/text.js";
import {
  BOOSTED_RAIL_FIELDS,
  clearBoostedCache,
  clearFeedCache,
  updateTouchesBoostedRail,
  updateTouchesFeed,
} from "../utils/boostedCache.js";

import {
  PRODUCT_STATUS,
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITION,
  PRODUCT_PAYMENT,
  PRODUCT_USAGE_DURATION,
} from "../config/constants.js";

const productSchema = new Schema(
  {
    seller_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Campus marketplace: denormalized from the seller at creation so
    // every feed/search stays a single-collection indexed query.
    // Never client-controlled — the service stamps it from req.user.
    campus_id: {
      type: Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
    },

    title: {
      type: String,
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
      trim: true,
      maxlength: 120,
    },
    // SEO-friendly URL. Sparse: listings without a slug yet (e.g. a draft
    // saved before it has a title) are left out of the unique index;
    // otherwise every such listing counts as slug:null and the second one
    // fails with a duplicate-key error.
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
      trim: true,
      maxlength: 2000,
      // Last line of defence for every write path (admin edits, scripts):
      // stored descriptions never carry padding or blank-line walls.
      set: normalizeMultiline,
    },

    category: {
      type: String,
      enum: Object.values(PRODUCT_CATEGORIES),
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
    },

    condition: {
      type: String,
      enum: Object.values(PRODUCT_CONDITION),
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
    },

    attributes: {
      brand: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      color: {
        type: String,
        trim: true,
        maxlength: 50,
      },
      usage_duration: {
        type: String,
        enum: Object.values(PRODUCT_USAGE_DURATION),
        trim: true,
      },
      purchase_date: {
        type: Date,
      },
    },

    images: {
      type: [
        {
          url: {
            type: String,
            required: true,
            validate: {
              validator: (url) => /^https?:\/\/.+/.test(url),
              message: "Invalid image URL",
            },
          },

          fileId: {
            type: String,
            required: true,
          },
        },
      ],

      default: [],

      validate: [
        {
          validator: function (arr) {
            if (this.status === PRODUCT_STATUS.DRAFT) {
              return true;
            }

            return arr.length > 0;
          },

          message: "At least one image is required",
        },

        {
          validator: (arr) => arr.length <= 3,

          message: "Maximum 3 images allowed",
        },
      ],
    },

    original_price: {
      type: Number,
      min: 0,
    },

    selling_price: {
      type: Number,
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
      min: 0,
    },

    // Stock count for single-seller chat sales. Exposed to buyers;
    // decrement is intentionally manual (chat-negotiated, one seller).
    quantity: {
      type: Number,
      default: 1,
      min: 1,
      max: 99,
    },

    is_negotiable: {
      type: Boolean,
      default: true,
    },

    payment_preference: {
      type: String,
      enum: Object.values(PRODUCT_PAYMENT),
      required: function () {
        return this.status !== PRODUCT_STATUS.DRAFT;
      },
    },

    // Campus marketplace: buyer and seller are on the same campus, so the
    // snapshot only carries the pickup spot (spot name -> address_line,
    // spot detail -> city). State/pincode are legacy optional fields kept
    // for old listings, never required for new ones.
    pickup_address_snapshot: {
      address_line: {
        type: String,
        trim: true,
        required: function () {
          return this.status !== PRODUCT_STATUS.DRAFT;
        },
      },
      city: {
        type: String,
        trim: true,
        required: function () {
          return this.status !== PRODUCT_STATUS.DRAFT;
        },
      },
      state: {
        type: String,
        trim: true,
      },
      pincode: {
        type: String,
        trim: true,
        match: [/^\d{6}$/, "Invalid pincode"],
      },
      mobile: {
        type: String,
        trim: true,
        match: [/^[6-9]\d{9}$/, "Invalid mobile number"],
      },
      additional_info: { type: String, trim: true },
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function (val) {
            // Allow undefined OR valid array of 2 numbers
            return (
              val === undefined || (Array.isArray(val) && val.length === 2)
            );
          },
          message: "Coordinates must be [lng, lat]",
        },
      },
    },

    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.LISTED,
    },

    is_boosted: {
      type: Boolean,
      default: false,
    },

    boost_expires_at: {
      type: Date,
    },

    boost_tier: {
      type: String,
    },

    // Unique viewers (one per person per 24h, owner and bots excluded).
    // Only POST /api/product/:id/view increments it, never a detail GET,
    // so hover prefetch / owner edits / order screens never inflate it.
    views_count: {
      type: Number,
      default: 0,
    },

    // "Hot deal" tag: set once when a young listing pulls enough unique
    // viewers (config/hotDeals.js); the tag shows while hot_until > now.
    hot_until: {
      type: Date,
      default: undefined,
    },

    // Seller's plan rank (0 Free, 1 Pro, 2 Pro+), denormalised so feed and
    // search can rank by it without a $lookup before $sort. Kept in sync by
    // User model hooks (utils/sellerTierSync.js).
    seller_tier: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    // Set when the listing was auto-unlisted for hitting the report
    // threshold. While set, the seller cannot relist; staff clear it by
    // reviewing (any admin status change or resolving/dismissing reports).
    auto_hidden_at: {
      type: Date,
      default: null,
      index: true,
    },
    auto_hidden_report_count: {
      type: Number,
      default: 0,
    },

    // Girls Corner 🌸 — seller opt-in. true = invisible + uncontactable
    // to non-females (enforced in product/conversation services).
    isGirlsOnly: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Snapshot proving seller was female at creation; prevents flip loophole.
    sellerGenderSnapshot: {
      type: String,
      enum: ["female"],
      default: undefined,
    },

    // Legal consent tracking (optional; old listings simply lack it).
    terms_version: {
      type: String,
      trim: true,
      maxlength: 20,
      default: undefined,
    },
    terms_accepted_at: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index(
  { title: "text", description: "text", category: "text" },
  {
    weights: {
      title: 5, // highest priority
      category: 3, // medium priority
      description: 1, // lowest priority
    },
  },
);
productSchema.index({
  category: 1,
  selling_price: 1,
  createdAt: -1,
});
// Seller's listings (My listings, plan caps, badges, orphan sweep). Also
// serves seller_id-only lookups, so seller_id has no single-field index.
productSchema.index({
  seller_id: 1,
  createdAt: -1,
});
productSchema.index({
  is_deleted: 1,
  status: 1,
});

// Campus-first compounds: every feed/search match starts with campus_id,
// keeping queries selective as the directory grows to 100s of campuses.
productSchema.index({
  campus_id: 1,
  status: 1,
  is_deleted: 1,
  createdAt: -1,
});
// Girls Corner feed: campus + audience + status, avoids collection scans.
productSchema.index({
  campus_id: 1,
  isGirlsOnly: 1,
  status: 1,
  createdAt: -1,
});
productSchema.index({
  campus_id: 1,
  category: 1,
  selling_price: 1,
});

productSchema.index({ is_boosted: 1, boost_expires_at: -1, boost_tier: 1 });
// Trending rail: campus live listings by views, no in-memory sort.
productSchema.index({ campus_id: 1, status: 1, is_deleted: 1, views_count: -1 });
// Nightly purge of soft-deleted listings ({ is_deleted, updatedAt < … }).
productSchema.index({ is_deleted: 1, updatedAt: 1 });
// Nightly purge of stale drafts + staff filters by status.
productSchema.index({ status: 1, updatedAt: 1 });
// Per-campus hot-deal cap check.
productSchema.index({ campus_id: 1, hot_until: 1 });
// Duplicate-listing check (same seller, title, price). No options: the
// old explicit { unique: false } made index sync drop + rebuild it for
// nothing, since the live index has no "unique" key at all.
productSchema.index({ seller_id: 1, title: 1, selling_price: 1 });
/*
For Nearby products and Nearby products
$near can be accessed
*/
productSchema.index({
  location: "2dsphere",
});

productSchema.pre("save", async function () {
  try {
    // Generate slug - skip for drafts without title
    if (!this.slug && this.title) {
      const baseSlug = slugify(this.title, {
        lower: true,
        strict: true,
      });

      this.slug = `${baseSlug || "product"}-${nanoid(6)}`;
    }

    // Price validation
    if (this.original_price && this.selling_price > this.original_price) {
      throw new Error("Selling price cannot be greater than original price");
    }
  } catch (error) {
    throw error;
  }
});

// Keep the Home "Boosted" rail truthful: any write that can change whether a
// listing belongs there (sold, unlisted, deleted, boost started/ended…) clears
// its cache. View-count bumps and other edits don't, so caching still works.
productSchema.pre("save", function () {
  this.$locals.touchesBoostedRail =
    this.isNew || BOOSTED_RAIL_FIELDS.some((f) => this.isModified(f));
  this.$locals.touchesFeed =
    this.isNew || this.modifiedPaths().some((f) => !["views_count", "hot_until", "updatedAt"].includes(f.split(".")[0]));
});
productSchema.post("save", function () {
  if (this.$locals.touchesBoostedRail) clearBoostedCache();
  if (this.$locals.touchesFeed) clearFeedCache();
});

// Onboarding: remember the first time this seller had a listing go live
// (new listing, or a draft published). One conditional update, only when
// the status actually becomes "listed".
productSchema.pre("save", function () {
  this.$locals.becameListed =
    this.status === PRODUCT_STATUS.LISTED && (this.isNew || this.isModified("status"));
});
productSchema.post("save", function () {
  if (!this.$locals.becameListed || !this.seller_id) return;
  const User = mongoose.models.User;
  if (!User) return;
  User.updateOne(
    { _id: this.seller_id, first_listed_at: null },
    { $set: { first_listed_at: this.createdAt || new Date() } },
  ).catch(() => {});
});
productSchema.post(
  ["findOneAndUpdate", "updateOne", "updateMany", "findOneAndReplace", "replaceOne"],
  { document: false, query: true },
  function () {
    const update = this.getUpdate();
    if (updateTouchesBoostedRail(update)) clearBoostedCache();
    if (updateTouchesFeed(update)) clearFeedCache();
  },
);
const clearListingCaches = () => {
  clearBoostedCache();
  clearFeedCache();
};
productSchema.post(["deleteOne", "deleteMany", "findOneAndDelete"], { document: false, query: true }, clearListingCaches);
productSchema.post("deleteOne", { document: true, query: false }, clearListingCaches);
productSchema.post("bulkWrite", clearListingCaches);

// Increment views
productSchema.statics.getProductAndIncrementViews = function (productId) {
  return this.findByIdAndUpdate(
    productId,
    { $inc: { views_count: 1 } },
    { new: true },
  );
};

// Get active products
productSchema.statics.findActiveProducts = function (filter = {}) {
  return this.find({
    ...filter,
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  });
};

const Product = mongoose.model("Product", productSchema);

export default Product;
