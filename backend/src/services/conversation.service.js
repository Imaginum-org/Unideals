import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Product from "../models/Product.model.js";
import { AppError } from "../utils/appError.js";

/**
 * Create or return an existing conversation
 * NOTE: Orphaned service - not mounted in routes. Field names aligned
 * with conversation.model.js (buyer_id/seller_id/product_id) to prevent
 * future crashes if wired.
 */
export const createConversation = async ({ buyerId, sellerId, productId }) => {
  // Buyer cannot chat with themselves
  if (buyerId.toString() === sellerId.toString()) {
    throw new AppError("You cannot start a conversation with yourself.", 400);
  }

  // Check product exists
  const product = await Product.findById(productId).select(
    "_id seller_id selling_price",
  );

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    buyer_id: buyerId,
    seller_id: sellerId,
    product_id: productId,
  });

  if (conversation) {
    return conversation;
  }

  // Create new conversation
  conversation = await Conversation.create({
    buyer_id: buyerId,
    seller_id: sellerId,
    product_id: productId,
    product_snapshot: {
      title: product.title || "Product",
      image: product.images?.[0]?.url || "",
      selling_price: product.selling_price || 0,
    },
  });

  return conversation;
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (conversationId) => {
  return Conversation.findById(conversationId)
    .populate("buyer_id", "name avatar subscription")
    .populate("seller_id", "name avatar subscription")
    .populate("product_id", "title selling_price images status");
};

/**
 * Get all conversations of a user
 */
export const getUserConversations = async (userId) => {
  return Conversation.find({
    $or: [
      {
        buyer_id: userId,
        "deleted_for.buyer": false,
      },
      {
        seller_id: userId,
        "deleted_for.seller": false,
      },
    ],
  })
    .populate("buyer_id", "name avatar subscription")
    .populate("seller_id", "name avatar subscription")
    .populate("product_id", "title selling_price images status")
    .sort({
      last_activity_at: -1,
    });
};

/**
 * Search conversations
 */
export const searchConversations = async ({ userId, search }) => {
  const safeSearch = String(search || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .slice(0, 100);
  return Conversation.find({
    $or: [{ buyer_id: userId }, { seller_id: userId }],
  })
    .populate({
      path: "product_id",
      match: {
        title: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      select: "title selling_price images",
    })
    .populate("buyer_id", "name avatar")
    .populate("seller_id", "name avatar");
};

/**
 * Mark conversation as read
 */
export const markConversationRead = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }

  if (conversation.buyer_id.toString() === userId.toString()) {
    conversation.unread_count.buyer = 0;
  }

  if (conversation.seller_id.toString() === userId.toString()) {
    conversation.unread_count.seller = 0;
  }

  await conversation.save();

  return conversation;
};

/**
 * Update conversation preview
 * Called internally by message service
 */
export const updateLastMessage = async ({
  conversationId,
  message,
  messageType,
  senderId,
}) => {
  return Conversation.findByIdAndUpdate(
    conversationId,
    {
      last_message: String(message || "").slice(0, 500),
      last_message_type: messageType,
      last_message_sender: senderId,
      last_activity_at: new Date(),
    },
    {
      new: true,
    },
  );
};

/**
 * Increase unread count
 * Called internally by message service
 */
export const incrementUnreadCount = async ({ conversation, receiverId }) => {
  if (conversation.buyer_id.toString() === receiverId.toString()) {
    conversation.unread_count.buyer += 1;
  }

  if (conversation.seller_id.toString() === receiverId.toString()) {
    conversation.unread_count.seller += 1;
  }

  await conversation.save();

  return conversation;
};

/**
 * Soft delete conversation
 */
export const deleteConversation = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }

  if (conversation.buyer_id.toString() === userId.toString()) {
    conversation.deleted_for.buyer = true;
  }

  if (conversation.seller_id.toString() === userId.toString()) {
    conversation.deleted_for.seller = true;
  }

  await conversation.save();

  return conversation;
};
