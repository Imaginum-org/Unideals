import { upload } from "@imagekit/javascript";
import instance from "../services/axiosInstance";
import { compressImage } from "../features/product/utils/imageCompression.js";

export const uploadImage = async (file, folder = "Products") => {
  const { data } = await instance.get("/api/imagekit/auth");

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!(file instanceof Blob)) {
        reject(
          new Error(
            `Invalid file provided. Expected Blob/File but received ${typeof file}`,
          ),
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result.split(",")[1]);

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  
  const compressedFile =
      folder === "Avatars"
        ? await compressImage(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 512,
            initialQuality: 0.85,
          })
        : await compressImage(file);

  const base64 = await toBase64(compressedFile);

  const result = await upload({
    file: base64,
    fileName: `${Date.now()}_${compressedFile.name}`,
    folder, // <-- Use the parameter instead of hardcoding
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  });

  return {
    url: result.url,
    fileId: result.fileId,
  };
};
