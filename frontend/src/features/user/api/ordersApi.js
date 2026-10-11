import axios from "../../../services/axiosInstance";

// Unified orders feed, same Deal documents the chat renders.
// GET /api/orders?role=all|buying|selling&status=all|active|completed|cancelled
export const fetchOrders = async ({ role = "all", status = "all" } = {}) => {
  const { data } = await axios.get("/api/orders", {
    params: { role, status, limit: 50 },
  });
  return {
    orders: data?.data || [],
    counts: data?.counts || {},
    pagination: data?.pagination || null,
  };
};

// Cancel an order's deal (either party, before completion).
// Writes to the same Deal the chat reads, so both pages sync instantly.
export const cancelOrder = async (conversationId, reason = "") => {
  const { data } = await axios.post(
    `/api/conversations/${conversationId}/cancel`,
    { reason },
  );
  return data?.data;
};
