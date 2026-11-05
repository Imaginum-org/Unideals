import { buildAssistantReply, buildEnhanceListingReply, buildNegotiationAdvice } from "../services/assistant.service.js";

export const chatWithAssistant = async (req, res, next) => {
  try {
    const result = await buildAssistantReply({
      message: req.body.message,
      history: req.body.history,
      user: req.user || null,
      productContext: req.body.productContext || null,
      attachments: req.body.attachments || [],
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const enhanceListing = async (req, res, next) => {
  try {
    const result = await buildEnhanceListingReply({
      itemDescription: req.body.itemDescription,
      condition: req.body.condition,
      originalPrice: req.body.originalPrice,
      category: req.body.category,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const negotiationAdvice = async (req, res, next) => {
  try {
    const result = await buildNegotiationAdvice({
      productId: req.body.productId,
      askingPrice: req.body.askingPrice,
      offerPrice: req.body.offerPrice,
      userRole: req.body.userRole,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
