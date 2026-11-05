import * as conversationService from "../services/conversation.service.js";
import { forwardServiceError } from "../utils/response.js";

// POST /api/conversations { productId }, buyer starts / resumes chat
export const createConversation = async (req, res, next) => {
  try {
    const buyerId = req.userId;
    const { productId } = req.body;
    const conversation = await conversationService.createConversation({
      buyerId,
      productId,
    });
    const detail = await conversationService.getConversationById(
      conversation._id,
      buyerId,
    );
    return res.status(201).json({
      success: true,
      message: "Conversation ready",
      data: detail,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/conversations?role=all|buying|selling&search=&page=&limit=
export const listConversations = async (req, res, next) => {
  try {
    const { role = "all", search = "", page = "1", limit = "30" } = req.query;
    const result = await conversationService.getUserConversations({
      userId: req.userId,
      role: ["all", "buying", "selling"].includes(role) ? role : "all",
      search,
      page,
      limit,
    });
    return res.status(200).json({
      success: true,
      message: "Conversations fetched",
      data: result.data,
      pagination: result.pagination,
      meta: { unreadTotal: result.unreadTotal || 0 },
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/conversations/:id, header + deal + role + other party
export const getConversation = async (req, res, next) => {
  try {
    const detail = await conversationService.getConversationById(
      req.params.id,
      req.userId,
    );
    if (!detail) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Conversation fetched",
      data: detail,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
