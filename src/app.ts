import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import movieRoutes from "./routes/movie.routes";
import showTimeRoutes from "./routes/shows.routes";
import reservationRoutes from "./routes/reservation.route";
import { cloudinaryConnect } from "./config/cloudinary";
import multer from "multer";
import { redis } from "./redis";
import { bookseatsWebhook } from "./controllers/reservation.controller";

const storage = multer.memoryStorage();
const upload = multer({ storage });

dotenv.config();

const app = express();

app.post(
  "/webHook",
  express.raw({ type: "application/json" }),
  bookseatsWebhook as any
); //this to allow only request from the stripe

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// app.use(upload.none());
app.use("/auth", authRoutes);
app.use("/movie", movieRoutes);
app.use("/shows", showTimeRoutes);
app.use("/reservation", reservationRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

cloudinaryConnect();

app.listen(PORT, async () => {
  await redis.connect();
  console.log(`Server running on http://localhost:${PORT}`);
});
