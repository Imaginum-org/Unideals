import ImageKit from "imagekit";
import {
  isFileOwnedBy,
  isFileReferencedElsewhere,
  isValidFileId,
  userUploadFolder,
} from "../utils/imagekit.js";

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

export const getAuthParams = (req, res) => {
  try {
    const imagekit = getImagekit();
    // Short-lived signatures (5 min from now, as a Unix timestamp —
    // the SDK signs token+expire, so a leaked auth blob dies fast).
    // Pair with the 20/min route limiter and dashboard-side folder rules.
    //
    // Folder binding: clients MUST upload into `unideals/{userId}` (returned
    // below and enforced client-side). The folder path is also what the
    // delete endpoint uses as proof of ownership.
    const expire = Math.floor(Date.now() / 1000) + 5 * 60;
    const result = imagekit.getAuthenticationParameters(undefined, expire);
    const userId = String(req.userId || req.user?._id || "anonymous");
    res.json({ ...result, folder: userUploadFolder(userId) });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Image service unavailable",
    });
  }
};

// DELETE /api/imagekit/:fileId and DELETE /api/imagekit/file { fileId }.
// Best-effort orphan cleanup for publish/edit flows (frontend deleteImage).
// Ownership enforced: only files inside the caller's own upload folder,
// and never one still referenced by another listing/avatar. (Previously any
// logged-in user could delete ANY ImageKit file by its ID.)
export const deleteFile = async (req, res) => {
  try {
    const rawId = req.params.fileId ?? req.body?.fileId;
    let fileId = "";
    try {
      fileId = typeof rawId === "string" ? decodeURIComponent(rawId) : "";
    } catch {
      fileId = "";
    }
    if (!isValidFileId(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Valid file ID is required",
      });
    }

    const owned = await isFileOwnedBy(fileId, req.userId);
    if (!owned) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own uploads",
      });
    }
    if (await isFileReferencedElsewhere(fileId, { excludeUserId: req.userId })) {
      return res.status(409).json({
        success: false,
        message: "File is still in use",
      });
    }

    const imagekit = getImagekit();
    await imagekit.deleteFile(fileId);
    return res.status(200).json({ success: true, message: "File deleted" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Image service unavailable",
    });
  }
};
