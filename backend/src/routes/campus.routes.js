import express from "express";
import { listCampuses } from "../controllers/campus.controller.js";

const router = express.Router();

// Public campus directory (active only, cached). No auth — needed by the
// onboarding gate, guest browse picker, and signup flows.
router.get("/", listCampuses);

export default router;
