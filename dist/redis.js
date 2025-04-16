"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
exports.redis = (0, redis_1.createClient)();
exports.redis.on("error", (err) => console.error("Redis Client Error", err));
