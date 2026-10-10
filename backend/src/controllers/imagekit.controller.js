import ImageKit from "imagekit";

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
    // below and enforced client-side). Server-side enforcement lives in the
    // ImageKit dashboard: restrict the upload auth key to the
    // `unideals/*` folder prefix so a leaked signature cannot write
    // outside the user's own folder.
    const expire = Math.floor(Date.now() / 1000) + 5 * 60;
    const result = imagekit.getAuthenticationParameters(undefined, expire);
    const userId = String(req.userId || req.user?._id || "anonymous");
    res.json({ ...result, folder: `unideals/${userId}` });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Image service unavailable",
    });
  }
};

// DELETE /api/imagekit/:fileId and DELETE /api/imagekit/file { fileId }.
// Best-effort orphan cleanup for publish/edit flows (frontend deleteImage).
// Auth required; fileId shape-validated to prevent arbitrary deletion.
export const deleteFile = async (req, res) => {
  try {
    const rawId = req.params.fileId ?? req.body?.fileId;
    const fileId = typeof rawId === "string" ? decodeURIComponent(rawId) : "";
    if (
      !fileId ||
      fileId.length > 256 ||
      !/^[A-Za-z0-9_\-/]+$/.test(fileId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid file ID is required",
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
