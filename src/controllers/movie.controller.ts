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
    res.status(200).json({
      success: true,
      message: "Genre created successfully",
      genre,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Genre creation failed", err });
  }
};

export const getGenres = async (req: Request, res: Response) => {
  try {
    const genres = await prisma.genre.findMany();

    if (!genres) {
      return res.status(400).json({
        success: false,
        message: "Unable to get genre",
      });
    }

    return res.status(200).json({
      success: true,
      genres,
    });
  } catch (err) {}
};

export const createMovie = async (req: Request, res: Response) => {
  try {
    const { title, description, genreIds } = req.body;

    const genres = JSON.parse(genreIds) as string[];

    const posterImage = req.file;

    const parsedInput = createMovieInput.safeParse({
      title,
      description,
      posterImage,
      genreIds: genres,
    });

    if (!parsedInput.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", error: parsedInput.error.errors });
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
          genres: {
            connect: genres.map((id) => ({ id })),
          },
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
    console.log(err);
    return res.status(500).json({ message: "Movie creation failed", err });
  }
};

export const listMovies = async (_: Request, res: Response) => {
  try {
    const movies = await prisma.movie.findMany({
      include: { genres: true, showtimes: true },
    });

    res.status(200).json({
      success: true,
      message: "Movies fetched successfully",
      movies,
    });
  } catch {
    res.status(500).json({ error: "Could not fetch movies" });
  }
};

export const getMovieDetails = async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { genres: true, showtimes: true },
    });

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Movie details fetched successfully",
      movie,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Could not fetch movie details",
      error: err,
    });
  }
};
