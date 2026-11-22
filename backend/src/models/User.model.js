import mongoose, { Schema } from "mongoose";
import { clearUserCache, invalidateUser } from "../utils/userCache.js";
import { subscriptionFromUpdate, syncSellerTier } from "../utils/sellerTierSync.js";
import { USER_ROLES, USER_STATUS, USER_TIER } from "../config/constants.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      trim: true,
      // unique already builds the index; index:true duplicated it
      // (Mongoose "Duplicate schema index" warning).
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.[A-Za-z]{2,})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Please provide your password"],
      select: false, // never return password
      minlength: [8, "Password must be at least 8 characters"],
    },

    // false = the account only has the random password made at Google
    // sign-up, so the user can't sign in with email + password (or confirm
    // account deletion) until they set one. true once they sign up with a
    // password, reset it, or sign in with it. Missing on older accounts =
    // unknown (they predate this flag).
    password_set: {
      type: Boolean,
    },

    avatar: {
      _id: false,
      url: {
        type: String,
      },
      fileId: {
        type: String,
        default: null,
      },
    },

    mobile: {
      type: String,
      default: null,
      trim: true,
      match: [/^\d{10}$/, "Mobile must be 10 digits"],
    },

    gender: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["male", "female", "other"],
      default: null,
    },

    // Girls Corner 🌸 — set once (from the Google account when it shares one,
    // otherwise self-declared), then locked: changes need an ID-card request
    // approved by staff.
    genderSource: {
      type: String,
      enum: ["self", "google", "admin"],
      default: "self",
    },
    genderUpdatedAt: {
      type: Date,
      default: null,
    },
    // Gender change requests needing admin approval. Single pending subdoc
    // keeps it atomic + scalable (one indexed user write, no extra collection).
    genderChangeRequest: {
      _id: false,
      requestedGender: {
        type: String,
        enum: ["male", "female", "other"],
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: null,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      // Shown to the user when a request is rejected (e.g. "ID photo unreadable").
      reviewNote: {
        type: String,
        trim: true,
        maxlength: 300,
        default: null,
      },
    },

    // Campus marketplace: every user belongs to exactly one campus.
    // Null only for legacy accounts until they pass the onboarding gate.
    // Indexed via { campus_id, gamification.total_xp } (prefix serves
    // campus-only lookups too).
    campus_id: {
      type: Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
    },

    subscription: {
      type: String,
      enum: Object.values(USER_TIER),
      default: USER_TIER.BASE_USER,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },

    is_email_verified: {
      type: Boolean,
      default: false,
    },

    // College email verification (verified tick). People sign in with a personal
    // Gmail; in Settings they can prove they're a student by confirming a
    // college address with an emailed OTP. Only the boolean is public, and
    // the address itself is never shown to anyone else.
    is_college_verified: {
      type: Boolean,
      default: false,
    },
    college_email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },
    college_verified_at: {
      type: Date,
      default: null,
    },
    // Pending OTP: sha256 hash only, expires in 10 minutes, 5 tries max.
    college_email_otp: {
      type: {
        email: { type: String, default: null },
        hash: { type: String, default: null },
        expires_at: { type: Date, default: null },
        sent_at: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
      },
      select: false,
      default: null,
    },

    // First time any of their listings went live. Never cleared: a first
    // listing that later sells (deals soft-delete it) or is deleted still
    // counts for onboarding ("List your first item") and the first-listing
    // badge. Backfilled on profile fetch for older accounts.
    first_listed_at: {
      type: Date,
      default: null,
    },

    verifyTokenEmail: {
      type: String,
      select: false,
      default: "",
    },

    verifyTokenEmailExpiry: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    reset_password_token: {
      type: String,
      select: false,
      default: "",
    },

    reset_password_expiry: {
      type: Date,
      default: null,
    },

    oauth_login_token: {
      type: String,
      select: false,
      default: "",
    },

    oauth_login_expiry: {
      type: Date,
      default: null,
    },

    // Native app sign-in: sha256(verifier) the app sent when it started
    // Google login. The app polls with the verifier (PKCE-style), so no
    // code ever has to travel back through a browser redirect.
    oauth_login_challenge: {
      type: String,
      select: false,
      default: "",
    },

    last_login_date: {
      type: Date,
      default: null,
    },

    // "You have unread notifications" email (services/emailAlerts.service.js).
    // Opt-out via the signed link in the email; sent_at drives the cooldown
    // and the shared daily cap that protects the Resend free quota.
    email_digest_enabled: { type: Boolean, default: true },
    email_digest_sent_at: { type: Date, default: null },
    // Staff only: last "admin queue needs attention" email.
    staff_alert_sent_at: { type: Date, default: null },

    subscription_details: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // Chat preferences (wallpaper, read receipts, typing indicators).
    // Defaults keep classic behaviour; clients merge over these.
    // Admin console saved list filters (staff only, small capped array).
    admin_saved_views: {
      type: [
        {
          _id: false,
          id: { type: String, required: true },
          page: { type: String, required: true },
          name: { type: String, required: true, maxlength: 60 },
          query: { type: String, default: "", maxlength: 1000 },
          created_at: { type: Date, default: Date.now },
        },
      ],
      default: undefined,
      select: false,
    },

    chat_settings: {
      _id: false,
      wallpaper: {
        type: String,
        trim: true,
        maxlength: 40,
        default: "default",
      },
      read_receipts: {
        type: Boolean,
        default: true,
      },
      typing_indicators: {
        type: Boolean,
        default: true,
      },
    },

    refresh_token: {
      type: String,
      select: false,
    },

    // Previous refresh token kept briefly after rotation so parallel
    // refresh calls (two tabs, retry storms) converge instead of nuking
    // the session. Never accepted after refresh_token_prev_expires_at.
    refresh_token_prev: {
      type: String,
      select: false,
      default: null,
    },

    refresh_token_prev_expires_at: {
      type: Date,
      default: null,
    },

    forgot_password_otp: {
      type: String,
      select: false,
    },

    forgot_password_expiry: {
      type: Date,
      default: null,
    },

    current_lat: {
      type: Number,
      default: null,
    },

    current_long: {
      type: Number,
      default: null,
    },

    location_updated_at: {
      type: Date,
      default: null,
    },

    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Buyer ratings (denormalised from Review; see review.service).
    rating: {
      _id: false,
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    gamification: {
      _id: false,
      total_xp: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 1,
      },
      rank_title: {
        type: String,
        default: "Seedling",
      },
      last_computed_at: {
        type: Date,
        default: null,
      },
      badges: [
        {
          _id: false,
          badge_id: { type: String, required: true },
          category: {
            type: String,
            enum: ["seller", "buyer", "communication", "trust", "milestone"],
          },
          tier: {
            type: String,
            enum: ["bronze", "silver", "gold", "special"],
            default: "bronze",
          },
          earned_at: { type: Date, default: Date.now },
          xp_granted: { type: Number, default: 0 },
        },
      ],

      // Progress towards badges not earned yet (written on every recompute).
      locked_badges: [
        {
          _id: false,
          badge_id: { type: String, required: true },
          current: { type: Number, default: 0 },
          required: { type: Number, default: 1 },
        },
      ],

      // ── Reward system fields ──────────────────────────────────────────
      // Running balance of boost credits the user currently holds.
      boost_credits: { type: Number, default: 0 },

      // Audit log: every reward event ever granted to this user.
      rewards_claimed: [
        {
          _id: false,
          reward_id:   { type: String, required: true }, // e.g. "level_10_gift"
          reward_type: { type: String, required: true }, // "boost_credit" | "subscription" | "badge" | "frame" | "tag"
          value:       { type: Schema.Types.Mixed },     // credits count or sub tier string
          claimed_at:  { type: Date, default: Date.now },
        },
      ],

      // Active decorative frame key shown on profile. null = default.
      profile_frame: { type: String, default: null },

      // Special text tags on the profile (e.g. "hall_of_fame", "og_member").
      special_tags: [{ type: String }],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ status: 1 });
// Admin user list (newest first) and sign-up counts by date.
userSchema.index({ role: 1, createdAt: -1 });
// Hourly attention count of pending gender requests: only pending rows.
userSchema.index(
  { "genderChangeRequest.status": 1 },
  { partialFilterExpression: { "genderChangeRequest.status": "pending" } },
);
// Daily digest budget: users emailed recently (null = never, not indexed).
userSchema.index({ email_digest_sent_at: 1 }, { partialFilterExpression: { email_digest_sent_at: { $type: "date" } } });
// Campus leaderboard: top XP on one campus, sorted by the index.
userSchema.index({ campus_id: 1, "gamification.total_xp": -1 });

// One verified account per college address.
userSchema.index(
  { college_email: 1 },
  { unique: true, partialFilterExpression: { is_college_verified: true } },
);

userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // 86400 seconds = 24 hours
    partialFilterExpression: { is_email_verified: false }
  }
);

// ── Auth cache invalidation ──
// Any write to a user evicts its cached auth document (utils/userCache.js),
// so session revocation / status / plan changes are visible immediately.
const evictFromQuery = function () {
  const filter = this.getFilter?.() || {};
  const id = filter._id;
  if (id && (typeof id !== "object" || id._bsontype === "ObjectId" || id instanceof mongoose.Types.ObjectId)) {
    invalidateUser(id);
  } else {
    clearUserCache();
  }
};
userSchema.post("save", (doc) => invalidateUser(doc?._id));
userSchema.post(
  ["updateOne", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "deleteOne", "findOneAndDelete"],
  { document: false, query: true },
  evictFromQuery,
);
userSchema.post("updateOne", { document: true, query: false }, function () {
  invalidateUser(this._id);
});
userSchema.post("deleteOne", { document: true, query: false }, function () {
  invalidateUser(this._id);
});
userSchema.post(["updateMany", "deleteMany"], () => clearUserCache());
userSchema.post("bulkWrite", () => clearUserCache());

// ── Plan changes → listing rank (search ranking perk) ──
// Any write that sets `subscription` re-stamps the seller's listings.
userSchema.pre(["findOneAndUpdate", "updateOne"], { document: false, query: true }, function () {
  // Promoting someone to admin also gives them Pro Plus.
  const upd = this.getUpdate();
  const newRole = upd?.$set?.role ?? upd?.role;
  if (newRole === "admin") this.setUpdate({ ...upd, $set: { ...(upd.$set || {}), subscription: "pro_plus" } });
  const tier = subscriptionFromUpdate(this.getUpdate());
  if (tier !== undefined) this._planSync = { id: this.getFilter()?._id, tier };
});
userSchema.post(["findOneAndUpdate", "updateOne"], { document: false, query: true }, async function () {
  if (this._planSync?.id) await syncSellerTier(this._planSync.id, this._planSync.tier);
});
userSchema.pre("save", function () {
  // Admins always have Pro Plus (staff perk, no payment row).
  if (this.role === "admin" && this.subscription !== "pro_plus") this.subscription = "pro_plus";
  this._planChanged = !this.isNew && this.isModified("subscription");
});
userSchema.post("save", async function (doc) {
  if (doc._planChanged) await syncSellerTier(doc._id, doc.subscription);
});

const User = mongoose.model("User", userSchema);

export default User;
