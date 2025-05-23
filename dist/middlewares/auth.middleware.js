"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jwt_1 = require("../services/jwt");
const authenticate = (req, res, next) => {
    const { token } = req.cookies;
    if (!token)
        return res.status(401).json({ message: "Missing token" });
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.authenticate = authenticate;
const isAdmin = (req, res, next) => {
    if (req.user?.role !== "ADMIN")
        return res.status(403).json({ message: "Admin access required" });
    next();
};
exports.isAdmin = isAdmin;
