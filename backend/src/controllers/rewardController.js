import { getRewardData } from "../services/rewardService.js";
import { safeErrorMessage } from "../utils/response.js";

/**
 * GET /api/rewards/me
 * Returns the current user's reward wallet:
 * boost_credits, profile_frame, special_tags, and full reward history.
 */
export const getMyRewards = async (req, res) => {
  try {
    const data = await getRewardData(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeErrorMessage(err) });
  }
};
