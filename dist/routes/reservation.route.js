"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const reservation_controller_1 = require("../controllers/reservation.controller");
const router = (0, express_1.Router)();
router.post("/lock-temporary", auth_middleware_1.authenticate, reservation_controller_1.lockSeatTemporarily);
router.post("/book-seats", auth_middleware_1.authenticate, reservation_controller_1.bookSeats);
exports.default = router;
