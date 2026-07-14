import { upload } from "@imagekit/javascript";
import instance from "../services/axiosInstance";

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

  const base64 = await toBase64(file);

  const result = await upload({
    file: base64,
    fileName: `${Date.now()}_${file.name}`,
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
