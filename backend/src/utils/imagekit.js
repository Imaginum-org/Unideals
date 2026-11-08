import ImageKit from "imagekit";

const FILE_ID_RE = /^[A-Za-z0-9_\-/]+$/;

export const isValidFileId = (fileId) =>
  typeof fileId === "string" &&
  fileId.length > 0 &&
  fileId.length <= 256 &&
  FILE_ID_RE.test(fileId);

const getImagekit = () => {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } =
    process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error("ImageKit is not configured");
  }
  return new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
};

// Raw delete. Internal use only — callers that act on user-supplied or
// user-referenced fileIds must go through deleteImageSafely so one user can
// never purge another user's images.
export const deleteImage = async (fileId) => {
  if (!fileId || typeof fileId !== "string") return;
  try {
    const imagekit = getImagekit();
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.error("Image delete failed:", error.message);
  }
};

export const getFileDetails = async (fileId) => {
  const imagekit = getImagekit();
  return imagekit.getFileDetails(fileId);
};

// Per-user upload folder. Client uploads are signed into this folder
// (imagekit.controller getAuthParams) and server-side uploads (phone
// handoff) use it too, so the folder path is the ownership proof.
export const userUploadFolder = (userId) => `unideals/${String(userId)}`;

const USER_FOLDER_RE = /^\/?unideals\/([a-f0-9]{24})\//i;

/**
 * Resolve who owns a file from its ImageKit path.
 * Returns { exists, ownerId } — ownerId is null for legacy uploads that
 * predate per-user folders (e.g. "/Products/...").
 */
export const getFileOwnership = async (fileId) => {
  if (!isValidFileId(fileId)) return { exists: false, ownerId: null };
  try {
    const details = await getFileDetails(fileId);
    const filePath = String(details?.filePath || "");
    const match = filePath.match(USER_FOLDER_RE);
    return {
      exists: true,
      ownerId: match ? match[1].toLowerCase() : null,
      url: details?.url || null,
    };
  } catch {
    return { exists: false, ownerId: null };
  }
};

/** True only when the file lives in this user's own upload folder. */
export const isFileOwnedBy = async (fileId, userId) => {
  if (!userId) return false;
  const { exists, ownerId } = await getFileOwnership(fileId);
  return exists && ownerId === String(userId).toLowerCase();
};

/**
 * True when a live product or a user avatar (other than the excluded ones)
 * still points at this file. Deleting it would break someone else's
 * listing/avatar, so callers must skip it.
 */
export const isFileReferencedElsewhere = async (
  fileId,
  { excludeProductId = null, excludeUserId = null } = {},
) => {
  const [{ default: Product }, { default: User }] = await Promise.all([
    import("../models/Product.model.js"),
    import("../models/User.model.js"),
  ]);
  const productFilter = { "images.fileId": fileId, is_deleted: false };
  if (excludeProductId) productFilter._id = { $ne: excludeProductId };
  const userFilter = { "avatar.fileId": fileId };
  if (excludeUserId) userFilter._id = { $ne: excludeUserId };
  const [inProduct, inAvatar] = await Promise.all([
    Product.exists(productFilter),
    User.exists(userFilter),
  ]);
  return Boolean(inProduct || inAvatar);
};

/**
 * Delete a file only when it is safe to do so:
 *  - never when another live product/avatar still references it, and
 *  - when ownerId is given, never when the file sits in a DIFFERENT user's
 *    upload folder (legacy shared-folder files are allowed once unreferenced).
 * Best-effort: never throws. Returns true when a delete was issued.
 */
export const deleteImageSafely = async (
  fileId,
  { ownerId = null, excludeProductId = null, excludeUserId = null } = {},
) => {
  if (!isValidFileId(fileId)) return false;
  try {
    if (
      await isFileReferencedElsewhere(fileId, { excludeProductId, excludeUserId })
    ) {
      return false;
    }
    if (ownerId) {
      const { exists, ownerId: actualOwner } = await getFileOwnership(fileId);
      if (!exists) return false;
      if (actualOwner && actualOwner !== String(ownerId).toLowerCase()) {
        return false;
      }
    }
    await deleteImage(fileId);
    return true;
  } catch (error) {
    console.error("Safe image delete failed:", error.message);
    return false;
  }
};

// Server-side upload (used by phone-handoff photos). Caller validates
// type/size; ImageKit re-validates content on receipt.
export const uploadImageBuffer = async (buffer, fileName, folder = "Products") => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid file data");
  }
  const imagekit = getImagekit();
  const result = await imagekit.upload({
    file: buffer,
    fileName: String(fileName || `upload_${Date.now()}.jpg`).slice(0, 100),
    folder,
  });
  if (!result?.url || !result?.fileId) {
    throw new Error("Image upload failed");
  }
  return { url: result.url, fileId: result.fileId };
};
