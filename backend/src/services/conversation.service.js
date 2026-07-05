import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../utils/appError.js";

/**
 * Create or return an existing conversation
 */
export const createConversation = async ({ buyerId, sellerId, productId }) => {
  // Buyer cannot chat with themselves
  if (buyerId.toString() === sellerId.toString()) {
    throw new AppError("You cannot start a conversation with yourself.", 400);
  }

  // Check product exists
  const product = await Product.findById(productId).select(
    "_id seller_id price negotiationAllowed",
  );

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    buyer: buyerId,
    seller: sellerId,
    product: productId,
  });

  if (conversation) {
    return conversation;
  }

  // Create new conversation
  conversation = await Conversation.create({
    buyer: buyerId,
    seller: sellerId,
    product: productId,
    negotiationEnabled: product.negotiationAllowed,
  });

  return conversation;
};

/**
 * Get conversation by ID
 */
export const getConversationById = async (conversationId) => {
  return Conversation.findById(conversationId)
    .populate("buyer", "name profilePic userTier")
    .populate("seller", "name profilePic userTier")
    .populate("product", "title price images status negotiationAllowed");
};

/**
 * Get all conversations of a user
 */
export const getUserConversations = async (userId) => {
  return Conversation.find({
    $or: [
      {
        buyer: userId,
        "deletedFor.buyer": false,
      },
      {
        seller: userId,
        "deletedFor.seller": false,
      },
    ],
  })
    .populate("buyer", "name profilePic userTier")
    .populate("seller", "name profilePic userTier")
    .populate("product", "title price images status")
    .sort({
      lastActivityAt: -1,
    });
};

/**
 * Search conversations
 */
export const searchConversations = async ({ userId, search }) => {
  return Conversation.find({
    $or: [{ buyer: userId }, { seller: userId }],
  })
    .populate({
      path: "product",
      match: {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      select: "title price images",
    })
    .populate("buyer", "name profilePic")
    .populate("seller", "name profilePic");
};

/**
 * Mark conversation as read
 */
export const markConversationRead = async ({ conversationId, userId }) => {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new AppError("Conversation not found.", 404);
  }

  if (conversation.buyer.toString() === userId.toString()) {
    conversation.unreadCount.buyer = 0;
  }

  if (conversation.seller.toString() === userId.toString()) {
    conversation.unreadCount.seller = 0;
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
      lastMessage: message,
      lastMessageType: messageType,
      lastMessageSender: senderId,
      lastActivityAt: new Date(),
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
  if (conversation.buyer.toString() === receiverId.toString()) {
    conversation.unreadCount.buyer += 1;
  }

  if (conversation.seller.toString() === receiverId.toString()) {
    conversation.unreadCount.seller += 1;
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

  if (conversation.buyer.toString() === userId.toString()) {
    conversation.deletedFor.buyer = true;
  }

  if (conversation.seller.toString() === userId.toString()) {
    conversation.deletedFor.seller = true;
  }

  await conversation.save();

  return conversation;
};
