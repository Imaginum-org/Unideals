import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Deal from "../models/deal.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { DEAL_STATUS, OFFER_STATUS } from "../config/constants.js";
import { AppError } from "../utils/appError.js";

/**
 * Create or return an existing conversation (1 buyer + 1 seller + 1 product).
 * Buyer is the initiator; seller is derived from the product. Also ensures
 * the 1-1 Deal lifecycle row exists (idempotent).
 */
export const createConversation = async ({ buyerId, productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product ID", 400);
  }
  const product = await Product.findById(productId).select(
    "_id seller_id title images selling_price status is_deleted isGirlsOnly",
  );
  if (!product || product.is_deleted) {
    throw new AppError("Product not found.", 404);
  }
  const sellerId = product.seller_id;
  if (String(buyerId) === String(sellerId)) {
    throw new AppError("You cannot start a conversation with yourself.", 400);
  }

  // Girls Corner 🌸 Chat Lock — hard-reject boy → girls-only product before
  // findOne||create so no thread/Deal is created. 403 (not 404) here because
  // the buyer already knew the ID; listing itself stays 404-masked elsewhere.
  if (product.isGirlsOnly) {
    const buyer = await User.findById(buyerId).select("gender").lean();
    if (buyer?.gender !== "female") {
      const err = new AppError("This is a girls-only listing. Only girls can start this chat.", 403);
      err.code = "GIRLS_ONLY_PRODUCT";
      throw err;
    }
  }

  let conversation = await Conversation.findOne({
    buyer_id: buyerId,
    seller_id: sellerId,
    product_id: productId,
  });
  if (!conversation) {
    conversation = await Conversation.create({
      buyer_id: buyerId,
      seller_id: sellerId,
      product_id: productId,
      product_snapshot: {
        title: product.title || "Product",
        image: product.images?.[0]?.url || "",
        selling_price: product.selling_price || 0,
        isGirlsOnly: Boolean(product.isGirlsOnly),
      },
    });
  }

  const price = Number(
    conversation.product_snapshot?.selling_price ||
      product.selling_price ||
      0,
  );
  await Deal.updateOne(
    { conversation_id: conversation._id },
    {
      $setOnInsert: {
        conversation_id: conversation._id,
        original_price: price,
        current_price: price,
        offer_history: [],
        offer_status: OFFER_STATUS.PENDING,
        status: DEAL_STATUS.NEGOTIATING,
      },
    },
    { upsert: true },
  );

  return conversation;
};

/**
 * Get conversation by ID
 */
// Works for raw ObjectIds, ObjectId strings, AND populated sub-documents
// (populated .toString() is "[object Object]", the old code rejected every
// participant on detail routes that populate buyer/seller).
const partyId = (v) => String(v?._id || v);

const assertParticipant = (conversation, userId) => {
  const id = String(userId);
  const isParticipant =
    partyId(conversation.buyer_id) === id ||
    partyId(conversation.seller_id) === id;
  if (!isParticipant) {
    throw new AppError("You do not have access to this conversation.", 403);
  }
};

export const getConversationById = async (conversationId, userId = null) => {
  const conversation = await Conversation.findById(conversationId)
    .populate("buyer_id", "name avatar subscription role")
    .populate("seller_id", "name avatar subscription role")
    .populate(
      "product_id",
      "title selling_price images status is_negotiable pickup_address_snapshot seller_id",
    )
    .lean();
  // Participant check so this stays safe if ever mounted on a route.
  if (conversation && userId) assertParticipant(conversation, userId);
  if (!conversation) return conversation;
  const deal = await Deal.findOne({ conversation_id: conversation._id }).lean();
  const me = userId ? String(userId) : null;
  const isBuyer = me
    ? String(conversation.buyer_id?._id || conversation.buyer_id) === me
    : false;
  const other = isBuyer ? conversation.seller_id : conversation.buyer_id;
  return {
    ...conversation,
    role: me ? (isBuyer ? "buying" : "selling") : null,
    otherParty: other || null,
    unread: me
      ? isBuyer
        ? conversation.unread_count?.buyer || 0
        : conversation.unread_count?.seller || 0
      : 0,
    deal: deal || null,
  };
};

/**
 * List conversations with buying/selling filter + search + deal status.
 * Returns lean rows shaped for the chat sidebar (other party, product,
 * unread for me, role, deal status for badges). Paginated, newest first.
 */
export const getUserConversations = async ({
  userId,
  role = "all",
  search = "",
  page = 1,
  limit = 30,
}) => {
  const me = String(userId);
  const and = [];
  if (role === "buying") and.push({ buyer_id: userId });
  else if (role === "selling") and.push({ seller_id: userId });
  else {
    and.push({
      $or: [
        { buyer_id: userId, "deleted_for.buyer": false },
        { seller_id: userId, "deleted_for.seller": false },
      ],
    });
  }
  if (role !== "all") {
    and.push(
      role === "buying"
        ? { "deleted_for.buyer": false }
        : { "deleted_for.seller": false },
    );
  }

  const q = String(search || "").trim().slice(0, 100);
  const pg = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Math.max(Number(limit) || 30, 1), 100);

  // Push the text pre-filter into Mongo. Snapshot + preview live on the doc,
  // but person names live on User docs, so resolve matching user ids first.
  // Without this, a name-only match would be dropped before the in-memory
  // name check below ever sees it.
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    let nameIds = [];
    try {
      nameIds = await User.find({ name: rx }).select("_id").limit(50).lean();
    } catch {
      nameIds = [];
    }
    const or = [{ "product_snapshot.title": rx }, { last_message: rx }];
    if (nameIds.length) {
      const uids = nameIds.map((u) => u._id);
      or.push({ buyer_id: { $in: uids } }, { seller_id: { $in: uids } });
    }
    and.push({ $or: or });
  }

  let rows = await Conversation.find(and.length ? { $and: and } : {})
    .populate("buyer_id", "name avatar subscription role")
    .populate("seller_id", "name avatar subscription role")
    .populate(
      "product_id",
      "title selling_price images status is_negotiable pickup_address_snapshot",
    )
    .sort({ last_activity_at: -1 })
    .limit(200)
    .lean();

  // Opened-but-untouched threads stay invisible: a conversation only earns
  // its list slot with the first message (every send path stamps
  // last_message, so empty preview ⟺ zero activity, guaranteed).
  rows = rows.filter((r) => String(r.last_message || "").trim() !== "");

  // Attach deal status in one query (scalable: avoids N+1 per row populate).
  const ids = rows.map((r) => r._id);
  const deals = ids.length
    ? await Deal.find({ conversation_id: { $in: ids } })
        .select("conversation_id status current_price updatedAt")
        .lean()
    : [];
  const dealByConv = new Map(deals.map((d) => [String(d.conversation_id), d]));

  if (q) {
    // Title/preview already matched in Mongo; only names can slip through,
    // so keep rows matching the other party's name too.
    const needle = q.toLowerCase();
    rows = rows.filter((r) => {
      const other =
        String(r.buyer_id?._id || r.buyer_id) === me
          ? r.seller_id
          : r.buyer_id;
      const title = r.product_snapshot?.title || r.product_id?.title || "";
      const otherName = other?.name || "";
      return (
        title.toLowerCase().includes(needle) ||
        otherName.toLowerCase().includes(needle) ||
        String(r.last_message || "").toLowerCase().includes(needle)
      );
    });
  }

  const total = rows.length;
  const pageRows = rows.slice((pg - 1) * lim, (pg - 1) * lim + lim);

  const data = pageRows.map((r) => {
    const isBuyer = String(r.buyer_id?._id || r.buyer_id) === me;
    const other = isBuyer ? r.seller_id : r.buyer_id;
    const deal = dealByConv.get(String(r._id)) || null;
    const unread = isBuyer
      ? r.unread_count?.buyer || 0
      : r.unread_count?.seller || 0;
    return {
      _id: r._id,
      role: isBuyer ? "buying" : "selling",
      otherParty: other
        ? {
            _id: other._id,
            name: other.name,
            avatar: other.avatar,
            subscription: other.subscription || "base_user",
            role: other.role || "user",
          }
        : null,
      product: r.product_id
        ? {
            _id: r.product_id._id,
            title: r.product_id.title || r.product_snapshot?.title,
            selling_price:
              r.product_id.selling_price ??
              r.product_snapshot?.selling_price,
            images: r.product_id.images || [],
            status: r.product_id.status,
            is_negotiable: r.product_id.is_negotiable,
            pickup_address_snapshot: r.product_id.pickup_address_snapshot,
          }
        : {
            title: r.product_snapshot?.title,
            selling_price: r.product_snapshot?.selling_price,
            images: r.product_snapshot?.image
              ? [{ url: r.product_snapshot.image }]
              : [],
          },
      product_snapshot: r.product_snapshot,
      last_message: r.last_message,
      last_message_type: r.last_message_type,
      last_activity_at: r.last_activity_at,
      unread,
      dealStatus: deal?.status || "negotiating",
      dealPrice: deal?.current_price ?? r.product_snapshot?.selling_price,
      updatedAt: r.updatedAt,
      createdAt: r.createdAt,
    };
  });

  // Global unread badge (navbar): summed over the fetched window (200 cap).
  // Campus-scale histories fit comfortably; the cap only bounds extremes.
  const unreadTotal = rows.reduce((sum, r) => {
    const mine =
      String(r.buyer_id?._id || r.buyer_id) === me
        ? r.unread_count?.buyer || 0
        : r.unread_count?.seller || 0;
    return sum + mine;
  }, 0);

  return { data, pagination: { page: pg, limit: lim, total }, unreadTotal };
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

  assertParticipant(conversation, userId);

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

  assertParticipant(conversation, userId);

  if (conversation.buyer_id.toString() === userId.toString()) {
    conversation.deleted_for.buyer = true;
  }

  if (conversation.seller_id.toString() === userId.toString()) {
    conversation.deleted_for.seller = true;
  }

  await conversation.save();

  return conversation;
};
