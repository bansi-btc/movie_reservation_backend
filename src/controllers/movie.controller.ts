import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createGenreInput, createMovieInput } from "../utils/zodTypes";
import { cloudinary } from "../config/cloudinary";

const prisma = new PrismaClient();

export const createGenre = async (req: Request, res: Response) => {
  const { name } = req.body;

  const parsedInput = createGenreInput.safeParse({ name });

  if (!parsedInput.success) {
    return res
      .status(400)
      .json({ message: "Invalid input", error: parsedInput.error.errors });
  }
  try {
    const genre = await prisma.genre.create({ data: { name } });
    res.json(genre);
  } catch (err: any) {
    res.status(500).json({ message: "Genre creation failed", err });
  }
};

export const createMovie = async (req: Request, res: Response) => {
  try {
    const { title, description, posterImage, genreId } = req.body;

    const parsedInput = createMovieInput.safeParse({
      title,
      description,
      posterImage,
      genreId,
    });

    if (!parsedInput.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", error: parsedInput.error.errors });
    }

    const genreExists = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genreExists) {
      return res.status(404).json({ error: "Genre not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "uploads",
        }
      );
      if (!result?.secure_url) {
        return res.status(500).json({ message: "Image upload failed" });
      }

      const movie = await prisma.movie.create({
        data: {
          title,
          description,
          posterUrl: result.secure_url,
          genre: {
            connect: { id: genreId },
          },
        },
        include: {
          genre: true,
        },
      });

      res.status(200).json({
        success: true,
        message: "Movie created successfully",
        movie,
      });
    } catch (err) {
      console.log(err);

      return res.status(500).json({ message: "Image upload failed", err });
    }
  } catch (err) {
    return res.status(500).json({ message: "Movie creation failed", err });
  }
};

export const listMovies = async (_: Request, res: Response) => {
  try {
    const movies = await prisma.movie.findMany({
      include: { genre: true, showtimes: true },
    });
    res.json(movies);
  } catch {
    res.status(500).json({ error: "Could not fetch movies" });
  }
};
