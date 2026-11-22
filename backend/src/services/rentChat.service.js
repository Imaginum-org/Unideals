import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import RentBooking from "../models/RentBooking.model.js";
import { MESSAGE_STATUS, MESSAGE_TYPE } from "../config/constants.js";
import { emitToConversation, emitToUser } from "../utils/socket.js";
import { sendTextMessage } from "./message.service.js";

/*
 * Rent & Borrow chats live in the main chat inbox (/chat), not in a separate
 * thread. Each booking gets a Conversation with context "rent":
 *   buyer_id  = borrower, seller_id = lender,
 *   product_id = the RentPost id (keeps the existing unique
 *                buyer + seller + item index; there is no Product with
 *                that id, so product lookups simply come back empty and the
 *                inbox falls back to product_snapshot).
 * Booking events (requested, accepted, handed over, ...) are posted as
 * system lines so the thread tells the whole story.
 */

export const RENT_CHAT = "rent";

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/** Find or create the chat thread for a booking and point it at that booking. */
export const ensureBookingChat = async (booking) => {
  const filter = { buyer_id: booking.borrower_id, seller_id: booking.lender_id, product_id: booking.post_id };
  const update = {
    $set: {
      context: RENT_CHAT,
      rent_booking_id: booking._id,
      is_active: true,
      "deleted_for.buyer": false,
      "deleted_for.seller": false,
      product_snapshot: {
        title: booking.post_snapshot?.title || "Rent & Borrow",
        image: booking.post_snapshot?.image || "",
        selling_price: booking.agreed_price || 0,
        isGirlsOnly: false,
      },
    },
  };
  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  } catch (error) {
    // Two requests raced on the unique index: the other one created it.
    if (error?.code !== 11000) throw error;
    conversation = await Conversation.findOneAndUpdate(filter, update, { returnDocument: "after" });
  }
  if (!sameId(booking.conversation_id, conversation._id)) {
    await RentBooking.updateOne({ _id: booking._id }, { $set: { conversation_id: conversation._id } });
  }
  return conversation;
};

/**
 * Post into a booking's thread without a push of its own (rent already
 * notifies for booking events). `system` lines render as centred notes.
 */
export const postToBookingChat = async (booking, { senderId, text, system = true }) => {
  const conversation = await ensureBookingChat(booking);
  const receiverId = sameId(conversation.buyer_id, senderId) ? conversation.seller_id : conversation.buyer_id;
  const type = system ? MESSAGE_TYPE.SYSTEM : MESSAGE_TYPE.TEXT;
  const message = await Message.create({
    conversation_id: conversation._id,
    sender_id: senderId,
    receiver_id: receiverId,
    message_type: type,
    text,
    message_status: MESSAGE_STATUS.SENT,
  });
  const side = sameId(conversation.buyer_id, receiverId) ? "buyer" : "seller";
  const at = new Date();
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: { last_message: text.slice(0, 500), last_message_type: type, last_message_sender: senderId, last_activity_at: at },
      $inc: { [`unread_count.${side}`]: 1 },
    },
  );
  emitToConversation(conversation._id, "message:new", message.toObject());
  emitToUser(receiverId, "conversation:updated", { conversationId: String(conversation._id), last_message: text.slice(0, 500), last_activity_at: at });
  return conversation;
};

/** Best-effort: chat trouble must never fail a booking action. */
export const bookingChatEvent = (booking, senderId, text) =>
  postToBookingChat(booking, { senderId, text }).catch(() => null);

/** A typed message from the booking page goes through the normal chat pipeline. */
export const sendBookingChatMessage = async (booking, senderId, text) => {
  const conversation = await ensureBookingChat(booking);
  const message = await sendTextMessage({ conversationId: conversation._id, senderId, text });
  return { conversationId: String(conversation._id), message };
};
