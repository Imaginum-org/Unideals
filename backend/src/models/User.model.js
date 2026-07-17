import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
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
      index: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Please provide your password"],
      select: false, // never return password
      minlength: [6, "Password must be at least 6 characters"],
    },

    avatar: {
      url: {
        type: String,
        default: "https://ik.imagekit.io/mspoxwn8v/avatar-default.svg",
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

    verifyTokenEmail: {
      type: String,
      select: false,
      default: "",
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

    last_login_date: {
      type: Date,
      default: null,
    },

    address_details: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],

    subscription_details: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },

    refresh_token: {
      type: String,
      select: false,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ status: 1 });

userSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400, // 86400 seconds = 24 hours
    partialFilterExpression: { is_email_verified: false }
  }
);

const User = mongoose.model("User", userSchema);

export default User;
