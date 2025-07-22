import { Router, Request, Response, Application } from "express";
import {
  signup,
  login,
  verifyOTPController,
  getUserDetails,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/signup", signup as any);
router.post("/verify-otp", verifyOTPController as any);
router.post("/login", login as any);
router.get("/getUserDetails", authenticate as any, getUserDetails as any);

export default router;
