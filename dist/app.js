"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const movie_routes_1 = __importDefault(require("./routes/movie.routes"));
const shows_routes_1 = __importDefault(require("./routes/shows.routes"));
const reservation_route_1 = __importDefault(require("./routes/reservation.route"));
const cloudinary_1 = require("./config/cloudinary");
const multer_1 = __importDefault(require("multer"));
const redis_1 = require("./redis");
const reservation_controller_1 = require("./controllers/reservation.controller");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const storage = multer_1.default.memoryStorage();
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.post("/webHook", express_1.default.raw({ type: "application/json" }), reservation_controller_1.bookseatsWebhook); //this to allow only request from the stripe
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const PORT = process.env.PORT || 3000;
// app.use(upload.none());
// app.use("/chrome-extension", extensionRoutes);
app.use("/auth", auth_routes_1.default);
app.use("/movie", movie_routes_1.default);
app.use("/shows", shows_routes_1.default);
app.use("/reservation", reservation_route_1.default);
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
(0, cloudinary_1.cloudinaryConnect)();
app.listen(PORT, async () => {
    await redis_1.redis.connect();
    console.log(`Server running on http://localhost:${PORT}`);
});
