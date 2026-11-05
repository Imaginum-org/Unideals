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
