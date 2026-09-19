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

    // Ensure compression actually respects limits; reject if still oversized
    if (compressedFile.size > 10 * 1024 * 1024) {
      throw new Error("Image too large even after compression");
    }

    return compressedFile;
  } catch (error) {
    // Do not silently return the original (could bypass size limits).
    // Let callers show a proper error instead of uploading 10MB+ files.
    throw new Error(
      error?.message === "Image too large even after compression"
        ? error.message
        : "Image compression failed. Please try a smaller image.",
    );
  }
};
