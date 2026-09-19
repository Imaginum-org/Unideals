import * as reportService from "../services/report.service.js";
import { forwardServiceError } from "../utils/response.js";

export const reportProduct = async (req, res, next) => {
  try {
    const user = req.user;
    const { productId } = req.params;

    const { reason, description } = req.body;

    const report = await reportService.reportProduct(
      productId,
      { reason, description },
      user,
    );

    return res.status(201).json({
      success: true,
      message: "Product reported successfully",
      data: report,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

export const reportUser = async (req, res, next) => {
  try {
    const user = req.user;
    const { userId } = req.params;

    const { reason, description } = req.body;

    const report = await reportService.reportUser(
      userId,
      { reason, description },
      user,
    );

    return res.status(201).json({
      success: true,
      message: "User reported successfully",
      data: report,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
