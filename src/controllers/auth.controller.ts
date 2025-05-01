import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../services/jwt";
import { userSignUpInput, verifyOTPInput } from "../utils/zodTypes";
import { totp } from "otplib";
import { sendOTPEmail } from "../utils/sendEmail";

totp.options = {
  digits: 6,
  step: 300, // 5 minute validity
};

const prisma = new PrismaClient();

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const parsedInput = userSignUpInput.safeParse({ email, password });

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

    const hashed = await bcrypt.hash(password, 10);
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

    const otp = totp.generate(userSecret);

    try {
      const data = await sendOTPEmail({ to: email, otp });
    } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
};

export const verifyOTPController = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const parsedInput = verifyOTPInput.safeParse({ email, otp });

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

  const isValid = totp.verify({
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

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isVerified)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken({ id: user.id, role: user.role });
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
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
};
