import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createShowtime = async (req: Request, res: Response) => {
  const { movieId, startTime, capacity } = req.body;

  const startTimeDate = new Date(startTime);

  try {
    const movieExists = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movieExists) {
      return res.status(404).json({ error: "Movie not found" });
    }
    const result = await prisma.$transaction(async (tx) => {
      const showtime = await tx.showtime.create({
        data: {
          startTime: startTimeDate,
          capacity: Number(capacity),
          movie: {
            connect: { id: movieId },
          },
        },
      });

      const seatData = Array.from({ length: Number(capacity) }, (_, i) => ({
        number: i + 1,
        showtimeId: showtime.id,
      }));

      await tx.seat.createMany({ data: seatData });

      return showtime;
    });
    res.status(200).json({
      success: true,
      message: "show created successfully",
      showtime: result,
    });
  } catch (err) {
    res.status(500).json({ error: "Showtime creation failed", err });
    console.log(err);
  }
};

export const listShowtimesOfMovie = async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;

    const movieExists = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movieExists) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const showTImes = await prisma.showtime.findMany({
      where: {
        movieId,
      },
      include: {
        movie: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Showtimes fetched successfully",
      showTImes,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch showtimes" });
  }
};

export const getShowDetails = async (req: Request, res: Response) => {
  try {
    const { showId } = req.params;

    const showDetails = await prisma.showtime.findUnique({
      where: { id: showId },
      include: {
        seats: true,
      },
    });

    if (!showDetails) {
      return res.status(404).json({ error: "Show not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Seats details fetched successfully",
      showDetails,
    });
  } catch (err) {
    return res.status(500).json({
      success: true,
      message: "Internal server error",
    });
  }
};
