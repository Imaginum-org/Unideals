import * as reportService from "../services/report.service.js";
import { forwardServiceError } from "../utils/response.js";

export const reportProduct = async (req, res, next) => {
  try {
    const user = req.user;
    const { productId } = req.params;

    const { reason, description, evidence } = req.body;

    const report = await reportService.reportProduct(
      productId,
      { reason, description, evidence },
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

    const { reason, description, evidence } = req.body;

    const report = await reportService.reportUser(
      userId,
      { reason, description, evidence },
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

// ---- Admin moderation queue (support/admin roles enforced at the route) ----

// GET /api/admin/reports?page=&limit=&status=&target_model=&sort=latest|count
export const getAdminReports = async (req, res, next) => {
  try {
    const { page, limit, status, target_model, sort } = req.query;
    const result = await reportService.getReportQueue({
      page,
      limit,
      status,
      target_model,
      sort,
    });
    return res.status(200).json({
      success: true,
      message: "Reports fetched successfully",
      ...result,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PATCH /api/admin/reports/:id { status: action_taken|dismissed, admin_note? }
export const reviewAdminReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const report = await reportService.reviewReport(id, { status, admin_note });
    return res.status(200).json({
      success: true,
      message: "Report reviewed successfully",
      data: report,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
