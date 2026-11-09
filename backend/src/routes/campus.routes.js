import express from "express";
import { listCampuses } from "../controllers/campus.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { resolveRequestCampus } from "../services/campus.service.js";
import { getCampusStats } from "../services/campusStats.service.js";

const router = express.Router();

// Public campus directory (active only, cached). No auth — needed by the
// onboarding gate, guest browse picker, and signup flows.
router.get("/", listCampuses);

// Live campus numbers for the Home hero (?campus_slug= for guests).
router.get("/stats", optionalAuth, async (req, res, next) => {
  try {
    const campus = await resolveRequestCampus(req);
    const data = await getCampusStats(campus._id);
    res.set("Cache-Control", "public, max-age=120");
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
