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
    const result = imagekit.getAuthenticationParameters();
    res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Image service unavailable",
    });
  }
};
