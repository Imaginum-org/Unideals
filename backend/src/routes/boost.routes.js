import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  boostProduct,
  getMyBoostSummary,
} from "../controllers/boost.controller.js";

const router = express.Router();

router.get("/me/summary", auth, getMyBoostSummary);
router.post("/products/:productId", auth, boostProduct);

export default router;
