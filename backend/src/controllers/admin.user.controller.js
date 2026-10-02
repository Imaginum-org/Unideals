import * as adminUserService from "../services/admin.user.service.js";
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

export const getUsers = async (req, res) => {
  try {
    const result = await adminUserService.getUsers(req.query);
    return sendSuccess(res, "Users fetched successfully", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const user = await adminUserService.updateUserStatus(
      req.params.id,
      req.body.status,
    );

    return sendSuccess(res, "User status updated successfully", {
      data: user,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};
