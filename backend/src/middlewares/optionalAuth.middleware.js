import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";

const optionalAuth = async (req, res, next) => {
  let token;
  try {
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);
    const user = await User.findById(decoded.id).select("-password -refresh_token").lean();
    
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    req.userId = user._id;
    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    req.userId = null;
    // A token was sent but has expired: routes that care (the assistant
    // stream) can ask the client to refresh instead of treating it as a guest.
    req.authExpired = Boolean(token) && err?.name === "TokenExpiredError";
    next();
  }
};

export default optionalAuth;
