import { Router, Request, Response, Application } from "express";
import {
  signup,
  login,
  verifyOTPController,
} from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signup as any);
router.post("/verify-otp", verifyOTPController as any);
router.post("/login", login as any);

export default router;
