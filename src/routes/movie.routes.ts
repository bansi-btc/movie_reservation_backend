import { Router } from "express";
import {
  createGenre,
  createMovie,
  getGenres,
  listMovies,
} from "../controllers/movie.controller";

import multer from "multer";
import { authenticate, isAdmin } from "../middlewares/auth.middleware";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

router.post(
  "/create-genre",
  authenticate as any,
  isAdmin as any,
  createGenre as any
);

router.get("/get-genres", authenticate as any, getGenres as any);

router.post(
  "/create-movie",
  authenticate as any,
  isAdmin as any,
  upload.single("posterImage"),
  createMovie as any
);

router.get("/list-movies", listMovies as any);

export default router;
