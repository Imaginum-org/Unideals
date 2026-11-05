import jwt from "jsonwebtoken";

const generatedAccessToken = async (userId, tokenVersion = 0) => {
  const token = jwt.sign(
    { id: userId, v: tokenVersion },
    process.env.SECRET_KEY_ACCESS_TOKEN,
    { expiresIn: "15m" },
  );
  return token;
};

export default generatedAccessToken;
