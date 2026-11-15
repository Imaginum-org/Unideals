import mongoose from "mongoose";
import User from "../models/User.model.js";
import GenderIdCard, { ID_CARD_MAX_BYTES } from "../models/GenderIdCard.model.js";
import { AppError } from "../utils/appError.js";

/**
 * Gender-change requests (Girls Corner safety).
 *
 * Gender is set once. To change it the user sends the gender they want plus
 * a photo of their college ID card; staff look at the photo and approve or
 * reject. The photo lives only in GenderIdCard and is deleted as soon as the
 * request is decided or cancelled (see GenderIdCard.model.js).
 */

const { ObjectId } = mongoose.Types;
export const GENDERS = ["male", "female", "other"];

// Trust the bytes, not the client's Content-Type.
const sniffImageType = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
};

export const validateIdCardFile = (file) => {
  if (!file?.buffer?.length) throw new AppError("Please add a photo of your college ID card.", 400);
  if (file.buffer.length > ID_CARD_MAX_BYTES) throw new AppError("ID photo must be under 5 MB.", 400);
  const mimetype = sniffImageType(file.buffer);
  if (!mimetype) throw new AppError("ID photo must be a JPG, PNG or WEBP image.", 400);
  return { data: file.buffer, mimetype, size: file.buffer.length };
};

const toClientRequest = (request, idCardOnFile) => {
  if (!request?.status) return null;
  return {
    requestedGender: request.requestedGender || null,
    status: request.status,
    requestedAt: request.requestedAt || null,
    reviewedAt: request.reviewedAt || null,
    reviewNote: request.status === "rejected" ? request.reviewNote || null : null,
    // false on a pending request means the photo expired before review:
    // the UI asks the user to send it again.
    idCardOnFile: request.status === "pending" ? Boolean(idCardOnFile) : false,
  };
};

export const getGenderRequestStatus = async (userId) => {
  const user = await User.findById(userId).select("gender genderSource genderChangeRequest").lean();
  if (!user) throw new AppError("User not found", 404);
  const pending = user.genderChangeRequest?.status === "pending";
  const idCardOnFile = pending ? Boolean(await GenderIdCard.exists({ user_id: user._id })) : false;
  return {
    gender: user.gender ?? null,
    genderSource: user.genderSource || "self",
    genderChangeRequest: toClientRequest(user.genderChangeRequest, idCardOnFile),
  };
};

/**
 * File (or replace) the user's request. Sending again while pending replaces
 * both the requested gender and the photo; the old photo is overwritten.
 */
export const submitGenderRequest = async ({ userId, requestedGender, file }) => {
  if (!ObjectId.isValid(userId)) throw new AppError("Invalid user", 400);
  if (!GENDERS.includes(requestedGender)) throw new AppError("Invalid gender value", 400);

  const user = await User.findById(userId).select("gender").lean();
  if (!user) throw new AppError("User not found", 404);
  if (!user.gender) throw new AppError("Set your gender in your profile first.", 400);
  if (user.gender === requestedGender) throw new AppError("This is already your gender.", 400);

  const card = validateIdCardFile(file);

  // Photo first: a request is never pending without its evidence.
  await GenderIdCard.findOneAndUpdate(
    { user_id: user._id },
    { $set: { ...card, created_at: new Date() } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const updated = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        genderChangeRequest: {
          requestedGender,
          status: "pending",
          requestedAt: new Date(),
          reviewedAt: null,
          reviewNote: null,
        },
      },
    },
    { returnDocument: "after" },
  )
    .select("genderChangeRequest")
    .lean();

  return toClientRequest(updated?.genderChangeRequest, true);
};

/** Withdraw a pending request and erase its ID photo. */
export const cancelGenderRequest = async (userId) => {
  if (!ObjectId.isValid(userId)) throw new AppError("Invalid user", 400);
  const updated = await User.findOneAndUpdate(
    { _id: userId, "genderChangeRequest.status": "pending" },
    { $set: { "genderChangeRequest.status": "cancelled", "genderChangeRequest.reviewedAt": new Date() } },
    { returnDocument: "after" },
  )
    .select("genderChangeRequest")
    .lean();
  // Delete regardless: a stray photo with no pending request must not linger.
  await GenderIdCard.deleteOne({ user_id: userId });
  if (!updated) throw new AppError("You don't have a pending request.", 409);
  return toClientRequest(updated.genderChangeRequest, false);
};

/** Staff only (route-guarded): the ID photo for a pending request. */
export const getIdCardForReview = async (userId) => {
  if (!ObjectId.isValid(userId)) throw new AppError("Invalid user id", 400);
  const user = await User.findById(userId).select("genderChangeRequest").lean();
  if (!user) throw new AppError("User not found", 404);
  if (user.genderChangeRequest?.status !== "pending") throw new AppError("No pending gender change request", 409);
  const card = await GenderIdCard.findOne({ user_id: userId }).select("data mimetype size").lean();
  if (!card) throw new AppError("The ID photo has expired. Reject the request so the user can send a new one.", 404);
  return card;
};

export const deleteIdCard = (userId) => GenderIdCard.deleteOne({ user_id: userId });

/**
 * Gender from the Google account (People API), only when the person has
 * set one and shared it with us. Anything other than male/female is
 * ignored and the user picks in the app as before. Never throws.
 */
export const fetchGoogleGender = async (accessToken, { timeoutMs = 3000 } = {}) => {
  if (!accessToken) return null;
  try {
    const res = await fetch("https://people.googleapis.com/v1/people/me?personFields=genders", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const genders = Array.isArray(body?.genders) ? body.genders : [];
    const primary = genders.find((g) => g?.metadata?.primary) || genders[0];
    const value = String(primary?.value || "").toLowerCase();
    return value === "male" || value === "female" ? value : null;
  } catch {
    return null;
  }
};
