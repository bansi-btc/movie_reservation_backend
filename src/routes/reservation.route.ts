import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  bookSeats,
  lockSeatTemporarily,
} from "../controllers/reservation.controller";

const router = Router();

router.post("/lock-temporary", authenticate as any, lockSeatTemporarily as any);
router.post("/book-seats", authenticate as any, bookSeats as any);

export default router;
