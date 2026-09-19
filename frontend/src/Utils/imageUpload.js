import { upload } from "@imagekit/javascript";
import instance from "../services/axiosInstance";
import { compressImage } from "../features/product/utils/imageCompression.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadImage = async (file, folder = "Products") => {
  if (!(file instanceof Blob)) {
    throw new Error("Invalid file provided");
  }
  // Block SVG and other executable image types to prevent stored XSS
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported image format. Use JPG, PNG or WEBP.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image exceeds 10MB limit");
  }

  const { data } = await instance.get("/api/imagekit/auth");

  if (!data?.signature || !data?.token || !data?.expire) {
    throw new Error("Image service unavailable");
  }
  
  const compressedFile =
      folder === "Avatars"
        ? await compressImage(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 512,
            initialQuality: 0.85,
          })
        : await compressImage(file);

  // Re-validate after compression
  if (!ALLOWED_TYPES.includes(compressedFile.type || file.type)) {
    throw new Error("Unsupported image format after compression");
  }

  const safeName = String(compressedFile.name || file.name || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    // Upload File/Blob directly - avoids 33% base64 bloat and OOM
    const result = await upload({
      file: compressedFile,
      fileName: `${Date.now()}_${safeName}`,
      folder, // <-- Use the parameter instead of hardcoding
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
    });

    if (!result?.url || !result?.fileId) {
      throw new Error("Image upload failed");
    }

    return {
      url: result.url,
      fileId: result.fileId,
    };
  } finally {
    clearTimeout(timeout);
  }
};
