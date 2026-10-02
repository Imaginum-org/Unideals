import * as adminProductService from "../services/admin.product.service.js";
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

export const getProducts = async (req, res) => {
  try {
    const result = await adminProductService.getProducts(req.query);
    return sendSuccess(res, "Products fetched successfully", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateProductStatus = async (req, res) => {
  try {
    const product = await adminProductService.updateProductStatus(
      req.params.id,
      req.body.status,
    );

    return sendSuccess(res, "Product status updated successfully", {
      data: product,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const softDeleteProduct = async (req, res) => {
  try {
    const product = await adminProductService.softDeleteProduct(req.params.id);

    return sendSuccess(res, "Product soft deleted successfully", {
      data: product,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const hardDeleteProduct = async (req, res) => {
  try {
    const product = await adminProductService.hardDeleteProduct(req.params.id);

    return sendSuccess(res, "Product permanently deleted successfully", {
      data: product,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};
