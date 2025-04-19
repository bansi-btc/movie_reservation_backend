import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { bookSeats } from "../controllers/reservation.controller";

const router = Router();

router.post("/book-seats", authenticate as any, bookSeats as any);

export default router;
