import jwt from "jsonwebtoken";

// `sid`: the device session this token belongs to, so signing out one
// device ends its access token too (checked in auth middleware, cached).
const generatedAccessToken = async (userId, tokenVersion = 0, sid = null) => {
  const token = jwt.sign(
    { id: userId, v: tokenVersion, ...(sid ? { sid: String(sid) } : {}) },
    process.env.SECRET_KEY_ACCESS_TOKEN,
    { expiresIn: "15m" },
  );
  return token;
};

export default generatedAccessToken;
