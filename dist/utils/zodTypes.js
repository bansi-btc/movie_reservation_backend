"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOTPInput = exports.userSignUpInput = void 0;
const zod_1 = require("zod");
exports.userSignUpInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(5),
});
exports.verifyOTPInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
});
