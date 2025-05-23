"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const showtime_controller_1 = require("../controllers/showtime.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/create-show", auth_middleware_1.authenticate, auth_middleware_1.isAdmin, showtime_controller_1.createShowtime);
router.post("/list-show/:movieId", showtime_controller_1.listShowtimesOfMovie);
exports.default = router;
