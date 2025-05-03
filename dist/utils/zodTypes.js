"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMovieInput = exports.createGenreInput = exports.verifyOTPInput = exports.userSignUpInput = void 0;
const zod_1 = require("zod");
exports.userSignUpInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(5),
});
exports.verifyOTPInput = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
});
exports.createGenreInput = zod_1.z.object({
    name: zod_1.z.string().min(1),
});
exports.createMovieInput = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    posterImage: zod_1.z.any(),
    genreIds: zod_1.z.array(zod_1.z.string()),
});
