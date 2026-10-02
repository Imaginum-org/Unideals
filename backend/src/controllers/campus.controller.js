import * as campusService from "../services/campus.service.js";
import { forwardServiceError } from "../utils/response.js";

// GET /api/campuses — public directory of active campuses (cached).
export const listCampuses = async (req, res, next) => {
  try {
    const campuses = await campusService.listActiveCampuses();
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.status(200).json({
      success: true,
      message: "Campuses fetched successfully",
      data: campuses,
    });
  } catch (error) {
    next(error);
  }
};

// Admin CRUD — mounted under /api/admin/campuses.
export const adminCreateCampus = async (req, res, next) => {
  try {
    const campus = await campusService.createCampus(req.body);
    return res.status(201).json({
      success: true,
      message: "Campus created successfully",
      data: campus,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

export const adminListCampuses = async (req, res, next) => {
  try {
    const Campus = (await import("../models/Campus.model.js")).default;
    const campuses = await Campus.find({})
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      message: "Campuses fetched successfully",
      data: campuses,
    });
  } catch (error) {
    next(error);
  }
};

export const adminUpdateCampus = async (req, res, next) => {
  try {
    const campus = await campusService.updateCampus(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Campus updated successfully",
      data: campus,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
