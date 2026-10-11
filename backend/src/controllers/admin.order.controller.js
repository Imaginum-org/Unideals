import * as adminOrderService from "../services/admin.order.service.js";
import { safeErrorMessage } from "../utils/response.js";

const sendSuccess = (res, message, payload, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    error: false,
    message,
    ...payload,
  });

const sendFailure = (res, error, statusCode = 400) =>
  res.status(statusCode).json({
    success: false,
    error: true,
    message: safeErrorMessage(error, "Request failed"),
  });

export const getOrders = async (req, res) => {
  try {
    const result = await adminOrderService.getAdminOrders(req.query);
    return sendSuccess(res, "Orders fetched successfully", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const stats = await adminOrderService.getAdminOrderStats();
    return sendSuccess(res, "Order stats fetched successfully", { data: stats });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await adminOrderService.getAdminOrderById(req.params.id);
    return sendSuccess(res, "Order details fetched successfully", { data: order });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await adminOrderService.updateAdminOrderStatus(
      req.params.id,
      req.body.status,
      req.body.reason,
      req.user,
    );
    return sendSuccess(res, "Order status updated successfully", { data: order });
  } catch (error) {
    return sendFailure(res, error);
  }
};
