import { Router } from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import {
  createPickupSpot,
  deletePickupSpot,
  getUserPickupSpots,
  setPrimaryPickupSpot,
  updatePickupSpot,
} from "../controllers/pickupSpot.controller.js";

const pickupSpotRouter = Router();

pickupSpotRouter.use(auth);

// Spot-list abuse guard (picker polling + rapid create cycling).
const pickupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many pickup-spot requests, try later" },
});
pickupSpotRouter.use(pickupLimiter);

pickupSpotRouter.post("/", createPickupSpot);
pickupSpotRouter.get("/", getUserPickupSpots);
pickupSpotRouter.put("/:pickupSpotId", updatePickupSpot);
pickupSpotRouter.delete("/:pickupSpotId", deletePickupSpot);
pickupSpotRouter.patch("/:pickupSpotId/primary", setPrimaryPickupSpot);

export default pickupSpotRouter;
