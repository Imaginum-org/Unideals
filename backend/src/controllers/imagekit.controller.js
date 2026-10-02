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
    const expire = Math.floor(Date.now() / 1000) + 5 * 60;
    const result = imagekit.getAuthenticationParameters(undefined, expire);
    res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Image service unavailable",
    });
  }
};
