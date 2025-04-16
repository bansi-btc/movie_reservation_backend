import { Router } from "express";
import {
  createShowtime,
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

export default router;
