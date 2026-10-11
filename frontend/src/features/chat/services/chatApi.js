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

export const fetchMessages = async (id, { limit = 50, before, signal } = {}) => {
  const { data } = await axios.get(`/api/conversations/${id}/messages`, {
    params: { limit, ...(before ? { before } : {}) },
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

export const schedulePickup = async (id, date, location) => {
  const { data } = await axios.post(`/api/conversations/${id}/pickup`, {
    date,
    location,
  });
  return data?.data;
};

export const confirmPayment = async (id) => {
  const { data } = await axios.post(`/api/conversations/${id}/payment-confirm`);
  return data?.data;
};

export const confirmItemReceived = async (id) => {
  const { data } = await axios.post(`/api/conversations/${id}/item-received`);
  return data?.data;
};

export const cancelDeal = async (id, reason = "") => {
  const { data } = await axios.post(`/api/conversations/${id}/cancel`, {
    reason,
  });
  return data?.data;
};
