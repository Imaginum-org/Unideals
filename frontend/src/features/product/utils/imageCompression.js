import imageCompression from "browser-image-compression";

export const compressImage = async (
  file,
  { maxSizeMB = 0.8, maxWidthOrHeight = 1600, initialQuality = 0.8 } = {},
) => {
  //   const options = {
  //     maxSizeMB: 1,
  //     maxWidthOrHeight: 1920,
  //     useWebWorker: true,
  //     initialQuality: 0.8,
  //   };

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality,
  };
  try {
    const compressedFile = await imageCompression(file, options);

    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);

    return file;
  }
};
