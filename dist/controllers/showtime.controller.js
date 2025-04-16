"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listShowtimesOfMovie = exports.createShowtime = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createSeats = async (showtimeId, capacity) => {
    try {
        for (let i = 1; i <= capacity; i++) {
            await prisma.seat.create({
                data: {
                    number: i,
                    showtimeId,
                },
            });
        }
    }
    catch (err) {
        throw new Error(err);
    }
};
const createShowtime = async (req, res) => {
    const { movieId, startTime, capacity } = req.body;
    const startTimeDate = new Date(startTime);
    console.log(startTimeDate);
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
    }
    catch (err) {
        res.status(500).json({ error: "Showtime creation failed", err });
        console.log(err);
    }
};
exports.createShowtime = createShowtime;
const listShowtimesOfMovie = async (req, res) => {
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
    }
    catch {
        res.status(500).json({ error: "Failed to fetch showtimes" });
    }
};
exports.listShowtimesOfMovie = listShowtimesOfMovie;
