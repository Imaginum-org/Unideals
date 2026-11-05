import jwt from "jsonwebtoken";
import userModel from "../models/User.model.js";

const generatedRefreshToken = async (userId, tokenVersion = 0) => {
  const token = jwt.sign(
    { id: userId, v: tokenVersion },
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { expiresIn: "7d" },
  );

  // Rotate: keep the outgoing token valid for a short grace window so
  // in-flight / parallel refresh requests (multi-tab, retries) don't
  // trigger a false reuse-nuke. The grace token is cleared on logout,
  // password reset, suspend, and delete via the same paths that clear
  // refresh_token.
  const previous = await userModel
    .findById(userId)
    .select("+refresh_token")
    .lean();

  await userModel.updateOne(
    { _id: userId },
    {
      refresh_token: token,
      refresh_token_prev: previous?.refresh_token || null,
      refresh_token_prev_expires_at: previous?.refresh_token
        ? new Date(Date.now() + 60 * 1000)
        : null,
    },
  );

  return token;
};

export default generatedRefreshToken;
