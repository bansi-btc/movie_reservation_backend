import { z } from "zod";

export const userSignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

export const verifyOTPInput = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
