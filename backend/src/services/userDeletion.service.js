import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import ProductView from "../models/ProductView.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Deal from "../models/deal.model.js";
import Review from "../models/Review.model.js";
import Report from "../models/Report.model.js";
import Notification, { NotificationReceipt } from "../models/Notification.model.js";
import Payment from "../models/Payment.model.js";
import Subscription from "../models/Subscription.model.js";
import Boost from "../models/Boost.model.js";
import BadgeEvent from "../models/Badge.model.js";
import ChatCooldown from "../models/ChatCooldown.model.js";
import PhotoHandoff from "../models/PhotoHandoff.model.js";
import PickupSpot from "../models/PickupSpot.model.js";
import StaffAccess from "../models/StaffAccess.model.js";
import Campus from "../models/Campus.model.js";
import { USER_ROLES } from "../config/constants.js";
import { deleteImageSafely } from "../utils/imagekit.js";
import { getIO } from "../utils/socket.js";
import { logAdminAction } from "./auditLog.service.js";
import { recomputeSellerRating } from "./review.service.js";
import { dropPersonAccess } from "./access.service.js";

const { ObjectId } = mongoose.Types;

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const idsOf = (rows) => rows.map((row) => row._id);

/**
 * Super Admin: permanently delete a user and everything linked to them.
 *
 * Removed: the account; their listings (+ images, boosts, view counters,
 * reports on them, wishlist entries pointing at them); every conversation
 * they were part of with its messages, deals and reviews; reports they filed
 * or that name them; their notifications, payments, subscriptions, badge
 * history, chat cooldowns, phone-upload sessions, pickup spots and custom
 * staff access; their avatar.
 *
 * Kept: the audit log (staff actions stay accountable, including this one)
 * and broadcast notifications they sent as staff.
 *
 * Sessions are revoked first, so a failure part-way leaves a locked account
 * that can simply be deleted again. Admin accounts can't be deleted here.
 */
export const deleteUserPermanently = async ({ userId, actor, confirmEmail, reason }) => {
  if (!ObjectId.isValid(userId)) throw httpError("Invalid user id");
  if (String(actor?._id) === String(userId)) throw httpError("You can't delete your own account here");

  const user = await User.findById(userId).select("name email role status campus_id avatar subscription createdAt").lean();
  if (!user) throw httpError("User not found", 404);
  if (user.role === USER_ROLES.ADMIN) throw httpError("Super Admin accounts can't be deleted from the portal", 403);
  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== String(user.email).toLowerCase()) {
    throw httpError("Type the user's email exactly to confirm");
  }
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 500) || null : null;
  const uid = user._id;

  // 1. Lock the account and end every session before touching anything else.
  await User.updateOne(
    { _id: uid },
    { $set: { status: "inactive", refresh_token: null, refresh_token_prev: null, refresh_token_prev_expires_at: null }, $inc: { tokenVersion: 1 } },
  );
  try {
    getIO()?.in(`user:${uid}`).disconnectSockets(true);
  } catch {
    // realtime is best-effort
  }

  // 2. Work out what belongs to them.
  const [products, conversations, handoffs] = await Promise.all([
    Product.find({ seller_id: uid }).select("_id images seller_id").lean(),
    Conversation.find({ $or: [{ buyer_id: uid }, { seller_id: uid }] }).select("_id buyer_id seller_id").lean(),
    PhotoHandoff.find({ user: uid }).select("images").lean(),
  ]);
  const productIds = idsOf(products);
  // Chats about their listings are already covered (they are the seller there).
  const conversationIds = idsOf(conversations);
  const deals = conversationIds.length ? await Deal.find({ conversation_id: { $in: conversationIds } }).select("_id").lean() : [];
  const dealIds = idsOf(deals);

  // Sellers whose rating includes a review from (or about) this user.
  const reviews = await Review.find({ $or: [{ buyer_id: uid }, { seller_id: uid }, ...(dealIds.length ? [{ deal_id: { $in: dealIds } }] : [])] })
    .select("seller_id")
    .lean();
  const sellersToRerate = [...new Set(reviews.map((r) => String(r.seller_id)).filter((id) => id !== String(uid)))];

  // Images are removed after the records, so "still used elsewhere" checks
  // don't count the rows being deleted.
  const productImages = products.flatMap((p) => (p.images || []).filter((img) => img?.fileId).map((img) => ({ fileId: img.fileId, productId: p._id })));
  const handoffImages = handoffs.flatMap((h) => (h.images || []).map((img) => img?.fileId).filter(Boolean));
  const avatarFileId = user.avatar?.fileId || null;

  // 3. Delete. Independent collections run in parallel.
  const reportFilter = {
    $or: [
      { reporter_id: uid },
      { target_model: "User", target_id: uid },
      ...(productIds.length ? [{ target_model: "Product", target_id: { $in: productIds } }] : []),
      ...(conversationIds.length ? [{ conversation_id: { $in: conversationIds } }] : []),
    ],
  };
  const results = await Promise.all([
    Product.deleteMany({ seller_id: uid }),
    productIds.length ? ProductView.deleteMany({ product_id: { $in: productIds } }) : null,
    Boost.deleteMany({ $or: [{ user_id: uid }, ...(productIds.length ? [{ product_id: { $in: productIds } }] : [])] }),
    productIds.length ? User.updateMany({ wishlist: { $in: productIds } }, { $pull: { wishlist: { $in: productIds } } }) : null,
    conversationIds.length ? Conversation.deleteMany({ _id: { $in: conversationIds } }) : null,
    Message.deleteMany({ $or: [{ sender_id: uid }, { receiver_id: uid }, ...(conversationIds.length ? [{ conversation_id: { $in: conversationIds } }] : [])] }),
    dealIds.length ? Deal.deleteMany({ _id: { $in: dealIds } }) : null,
    Review.deleteMany({ $or: [{ buyer_id: uid }, { seller_id: uid }, ...(dealIds.length ? [{ deal_id: { $in: dealIds } }] : [])] }),
    Report.deleteMany(reportFilter),
    Notification.deleteMany({ recipient_id: uid }),
    NotificationReceipt.deleteMany({ user_id: uid }),
    Payment.deleteMany({ user_id: uid }),
    Subscription.deleteMany({ user_id: uid }),
    BadgeEvent.deleteMany({ user_id: uid }),
    ChatCooldown.deleteMany({ user_id: uid }),
    PhotoHandoff.deleteMany({ user: uid }),
    PickupSpot.deleteMany({ user: uid }),
    StaffAccess.deleteMany({ user_id: uid }),
  ]);
  const count = (i) => results[i]?.deletedCount || 0;
  const removed = {
    listings: count(0),
    conversations: count(4),
    messages: count(5),
    deals: count(6),
    reviews: count(7),
    reports: count(8),
    notifications: count(9) + count(10),
    payments: count(11),
    subscriptions: count(12),
  };

  // 4. The account itself, then clean-up that can't fail the request.
  await User.deleteOne({ _id: uid });
  await dropPersonAccess(uid);

  await Promise.allSettled([
    ...sellersToRerate.map((sellerId) => recomputeSellerRating(sellerId)),
    ...productImages.map(({ fileId, productId }) => deleteImageSafely(fileId, { ownerId: uid, excludeProductId: productId })),
    ...handoffImages.map((fileId) => deleteImageSafely(fileId, { ownerId: uid })),
    ...(avatarFileId ? [deleteImageSafely(avatarFileId, { ownerId: uid, excludeUserId: uid })] : []),
  ]);

  const campus = user.campus_id ? await Campus.findById(user.campus_id).select("name").lean() : null;
  await logAdminAction({
    actor,
    action: "user.delete",
    targetType: "user",
    targetId: uid,
    targetSnapshot: { name: user.name, email: user.email, role: user.role, campus: campus?.name || null },
    metadata: { reason: cleanReason, removed },
  }).catch(() => {});

  return { id: String(uid), removed };
};
