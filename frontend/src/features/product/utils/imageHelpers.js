export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(
        new Error(
          `Invalid file provided. Expected Blob/File but received ${typeof file}`,
        ),
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
};
