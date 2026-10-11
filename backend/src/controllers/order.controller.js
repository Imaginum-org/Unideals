import * as orderService from "../services/order.service.js";
import { forwardServiceError } from "../utils/response.js";

// GET /api/orders?role=all|buying|selling&status=all|active|completed|cancelled
export const listOrders = async (req, res, next) => {
  try {
    const { role = "all", status = "all", page = "1", limit = "20" } = req.query;
    const result = await orderService.getUserOrders({
      userId: req.userId,
      role: ["all", "buying", "selling"].includes(role) ? role : "all",
      status: ["all", "active", "completed", "cancelled"].includes(status)
        ? status
        : "all",
      page,
      limit,
    });
    return res.status(200).json({
      success: true,
      message: "Orders fetched",
      data: result.data,
      counts: result.counts,
      pagination: result.pagination,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
