import { any, z } from "zod";

export const userSignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

export const verifyOTPInput = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const createGenreInput = z.object({
  name: z.string().min(1),
});

export const createMovieInput = z.object({
  title: z.string(),
  description: z.string(),
  posterImage: z.any(),
  genreId: z.string(),
});
