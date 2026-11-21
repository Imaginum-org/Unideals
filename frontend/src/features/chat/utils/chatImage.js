import { compressImage } from "../../product/utils/imageCompression.js";
import { getImageSignature } from "../services/chatApi.js";

// What the picker accepts (HEIC/HEIF straight from iPhones too).
export const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const CAN_COMPRESS = new Set(["image/jpeg", "image/png", "image/webp"]);

export const isChatImageFile = (file) =>
  file instanceof Blob && /^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(file.type || "");

/** Natural size, used only for a stable bubble aspect ratio. */
export const readImageSize = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });

/**
 * Shrink on the device before upload (≤1600px, ~0.8 MB): faster on campus
 * Wi-Fi and fewer Cloudinary credits. HEIC can't be decoded in most
 * browsers, so it goes up as-is (Cloudinary converts on delivery).
 */
export const prepareChatImage = async (file) => {
  if (!isChatImageFile(file)) throw new Error("Only photos can be shared (JPG, PNG, WEBP or HEIC).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large (max 15 MB).");
  if (!CAN_COMPRESS.has(file.type)) return file;
  try {
    return await compressImage(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, initialQuality: 0.82 });
  } catch {
    return file;
  }
};

/**
 * Direct, signed upload to Cloudinary (never through our API), with real
 * progress. Resolves { publicId, version, signature } for the send call.
 */
export const uploadChatImage = async (file, { onProgress, signal } = {}) => {
  const sig = await getImageSignature();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("public_id", sig.public_id);
  form.append("tags", sig.tags);
  form.append("allowed_formats", sig.allowed_formats);
  form.append("transformation", sig.transformation);
  form.append("overwrite", sig.overwrite);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.timeout = 90000;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.public_id && body?.signature) {
        resolve({ publicId: body.public_id, version: body.version, signature: body.signature });
      } else {
        reject(new Error(body?.error?.message || "Photo upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Photo upload failed. Check your connection."));
    xhr.ontimeout = () => reject(new Error("Photo upload timed out. Please try again."));
    signal?.addEventListener("abort", () => {
      xhr.abort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    });
    xhr.send(form);
  });
};

/** Sized variant of a stored delivery URL (…/upload/f_auto,q_auto/v…). */
export const chatImageVariant = (url, transform) =>
  typeof url === "string" ? url.replace("/upload/f_auto,q_auto/", `/upload/f_auto,q_auto,${transform}/`) : url;
