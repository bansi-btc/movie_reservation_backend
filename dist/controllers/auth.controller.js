"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.verifyOTPController = exports.signup = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const jwt_1 = require("../services/jwt");
const zodTypes_1 = require("../utils/zodTypes");
const otplib_1 = require("otplib");
const sendEmail_1 = require("../utils/sendEmail");
otplib_1.totp.options = {
    digits: 6,
    step: 300, // 5 minute validity
};
const prisma = new client_1.PrismaClient();
const signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        const parsedInput = zodTypes_1.userSignUpInput.safeParse({ email, password });
        if (!parsedInput.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedInput.error.errors,
            });
        }
        const existing = await prisma.user.findUnique({
            where: { email },
        });
        if (existing?.isVerified) {
            return res.status(400).json({ message: "Email already used." });
        }
        const hashed = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.user.upsert({
            where: { email: email },
            update: {
                password: hashed,
            },
            create: {
                email: email,
                password: hashed,
            },
        });
        const baseSecret = process.env.OTP_SECRET ?? "bansi123";
        const userSecret = email + baseSecret;
        const otp = otplib_1.totp.generate(userSecret);
        try {
            const data = await (0, sendEmail_1.sendOTPEmail)({ to: email, otp });
        }
        catch (err) {
            return res
                .status(500)
                .json({ message: "Failed to send OTP email", error: err });
        }
        return res.status(200).json({
            success: true,
            message: "An otp has been sent to your email, please verify",
            data: {
                email: user.email,
                otp: otp,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: "Signup failed" });
    }
};
exports.signup = signup;
const verifyOTPController = async (req, res) => {
    const { email, otp } = req.body;
    const parsedInput = zodTypes_1.verifyOTPInput.safeParse({ email, otp });
    if (!parsedInput.success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: parsedInput.error.errors,
        });
    }
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
    }
    const baseSecret = process.env.OTP_SECRET ?? "bansi123";
    const userSecret = email + baseSecret;
    const isValid = otplib_1.totp.verify({
        token: otp,
        secret: userSecret,
    });
    if (!isValid) {
        return res.status(400).json({ message: "Invalid OTP" });
    }
    const updatedUser = await prisma.user.update({
        where: { email },
        data: { isVerified: true },
    });
    if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
    }
    return res.status(200).json({
        success: true,
        message: "User verified successfully",
    });
};
exports.verifyOTPController = verifyOTPController;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isVerified)
            return res.status(401).json({ message: "Invalid credentials" });
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid credentials" });
        const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
        res
            .cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        })
            .status(200)
            .json({
            success: true,
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email, role: user.role },
        });
    }
    catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
};
exports.login = login;
