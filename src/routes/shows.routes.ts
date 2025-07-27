import { Router } from "express";
import {
  createShowtime,
  getShowDetails,
  listShowtimesOfMovie,
} from "../controllers/showtime.controller";
import { authenticate, isAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/create-show",
  authenticate as any,
  isAdmin as any,
  createShowtime as any
);

router.post("/list-show/:movieId", listShowtimesOfMovie as any);

router.get(
  "/showSeatDetails/:showId",
  authenticate as any,
  getShowDetails as any
);

export default router;
