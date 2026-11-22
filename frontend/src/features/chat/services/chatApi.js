import axios from "../../../services/axiosInstance";

// All chat REST lives under /api/conversations (see backend routes).
// Shapes:
//  Conversation list row: { _id, role: buying|selling, otherParty, product,
//    last_message, unread, dealStatus, dealPrice, last_activity_at }
//  Conversation detail: { ..., product_id, deal, otherParty, role }
//  Message: { _id, conversation_id, sender_id, receiver_id, message_type
//    (text|offer|system), text, deal_id, message_status (sent|delivered|read),
//    createdAt }

export const fetchConversations = async ({ role = "all", search = "", signal } = {}) => {
  const { data } = await axios.get("/api/conversations", {
    params: { role, search, limit: 50 },
    ...(signal ? { signal } : {}),
  });
  return data?.data || [];
};

export const createConversation = async (productId) => {
  const { data } = await axios.post("/api/conversations", { productId });
  return data?.data;
};

export const fetchConversation = async (id, { signal } = {}) => {
  const { data } = await axios.get(`/api/conversations/${id}`, {
    ...(signal ? { signal } : {}),
  });
  return data?.data;
};

// `after`: incremental catch-up, only messages newer than that id.
export const fetchMessages = async (id, { limit = 50, before, after, signal } = {}) => {
  const { data } = await axios.get(`/api/conversations/${id}/messages`, {
    params: { limit, ...(before ? { before } : after ? { after } : {}) },
    ...(signal ? { signal } : {}),
  });
  return { messages: data?.data || [], hasMore: Boolean(data?.hasMore) };
};

export const sendMessage = async (id, text, { replyTo } = {}) => {
  const { data } = await axios.post(`/api/conversations/${id}/messages`, {
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  return data?.data;
};

export const markRead = async (id, { receipt = true } = {}) => {
  await axios.patch(`/api/conversations/${id}/read`, { receipt });
};

export const fetchDeal = async (id, { signal } = {}) => {
  const { data } = await axios.get(`/api/conversations/${id}/deal`, {
    ...(signal ? { signal } : {}),
  });
  return data?.data?.deal;
};

export const makeOffer = async (id, amount) => {
  const { data } = await axios.post(`/api/conversations/${id}/offers`, {
    amount,
  });
  return data?.data; // { deal, message }
};

export const respondOffer = async (id, messageId, action) => {
  const { data } = await axios.post(`/api/conversations/${id}/offers/respond`, {
    messageId,
    action,
  });
  return data?.data;
};

export const confirmDeal = async (id, amount) => {
  const { data } = await axios.post(`/api/conversations/${id}/confirm`, {
    amount,
  });
  return data?.data;
};

// time: optional "HH:MM" (India time); without it the meetup is a whole day.
export const schedulePickup = async (id, date, location, time = "") => {
  const { data } = await axios.post(`/api/conversations/${id}/pickup`, {
    date,
    location,
    ...(time ? { time } : {}),
  });
  return data?.data;
};

// ---- Handover (finishing the deal at the meetup) ----

// Buyer: the 4-digit code to show the seller. Returns "1234".
export const getHandoverCode = async (id) => {
  const { data } = await axios.get(`/api/conversations/${id}/handover-code`);
  return data?.data?.code;
};

// Seller: enter the buyer’s code. Right code completes the deal.
export const verifyHandover = async (id, code) => {
  const { data } = await axios.post(`/api/conversations/${id}/handover`, { code });
  return data?.data;
};

// Either side: "the deal is done" (completes if the other side already said so).
export const markDealDone = async (id) => {
  const { data } = await axios.post(`/api/conversations/${id}/done`);
  return data?.data;
};

// Take back "done", or tell the other side there’s a problem.
export const clearDoneRequest = async (id, reason = "") => {
  const { data } = await axios.post(`/api/conversations/${id}/done/clear`, reason ? { reason } : {});
  return data?.data;
};

// Either side, after the meetup time: the other person didn’t come.
export const reportNoShow = async (id) => {
  const { data } = await axios.post(`/api/conversations/${id}/no-show`);
  return data?.data;
};

export const cancelDeal = async (id, reason = "") => {
  const { data } = await axios.post(`/api/conversations/${id}/cancel`, {
    reason,
  });
  return data?.data;
};

// Seller: step the deal back one stage (payment → pickup → confirmed → negotiating).
export const revertDeal = async (id, from) => {
  const { data } = await axios.post(`/api/conversations/${id}/revert`, from ? { from } : {});
  return data?.data;
};

// Voice note: the file is already on ImageKit; only its id + metadata go here.
export const sendVoice = async (id, { fileId, durationMs, peaks, replyTo } = {}) => {
  const { data } = await axios.post(`/api/conversations/${id}/voice`, {
    fileId,
    durationMs,
    peaks,
    ...(replyTo ? { replyTo } : {}),
  });
  return data?.data;
};

// Chat photos (Cloudinary): signed single-use upload ticket, then the send.
export const getImageSignature = async () => {
  const { data } = await axios.get("/api/conversations/uploads/image-signature");
  return data?.data;
};

export const sendImage = async (id, { publicId, version, signature, width, height, caption, replyTo } = {}) => {
  const { data } = await axios.post(`/api/conversations/${id}/image`, {
    publicId,
    version,
    signature,
    width,
    height,
    ...(caption ? { caption } : {}),
    ...(replyTo ? { replyTo } : {}),
  });
  return data?.data;
};

// Set (or clear with null) your reaction; returns the message's reactions.
export const setReaction = async (id, messageId, emoji) => {
  const { data } = await axios.put(`/api/conversations/${id}/messages/${messageId}/reaction`, { emoji });
  return data?.data || [];
};
