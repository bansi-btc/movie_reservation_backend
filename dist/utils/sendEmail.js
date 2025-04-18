"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPEmail = void 0;
const resend_1 = require("resend");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const apiKey = process.env.RESEND_API_KEY;
const resend = new resend_1.Resend(apiKey);
const sendOTPEmail = async ({ to, otp, }) => {
    const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [to],
        subject: "Your OTP Code",
        html: `<strong>Your OTP code is ${otp}</strong>`,
    });
    if (error) {
        throw error;
    }
    console.log(data, "email data");
    return data;
};
exports.sendOTPEmail = sendOTPEmail;
