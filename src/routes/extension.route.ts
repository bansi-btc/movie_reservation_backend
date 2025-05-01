import { Router } from "express";
import { generateMeaningController } from "../controllers/exntension.controller";

const router = Router();

router.post("/generateMeaning", generateMeaningController as any);

export default router;
