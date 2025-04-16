"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryConnect = exports.cloudinary = void 0;
exports.cloudinary = require("cloudinary").v2;
const cloudinaryConnect = () => {
    try {
        exports.cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }
    catch (err) {
        console.error("Cloudinary connection error:", err.message);
    }
};
exports.cloudinaryConnect = cloudinaryConnect;
