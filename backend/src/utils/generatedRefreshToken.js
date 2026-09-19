import jwt from "jsonwebtoken";
import userModel from "../models/User.model.js";

const generatedRefreshToken = async (userId, tokenVersion = 0) => {
  const token = jwt.sign(
    { id: userId, v: tokenVersion },
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { expiresIn: "7d" },
  );

  await userModel.updateOne(
    { _id: userId },
    { refresh_token: token },
  );

  return token;
};

export default generatedRefreshToken;
