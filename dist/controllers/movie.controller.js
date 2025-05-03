"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMovies = exports.createMovie = exports.getGenres = exports.createGenre = void 0;
const client_1 = require("@prisma/client");
const zodTypes_1 = require("../utils/zodTypes");
const cloudinary_1 = require("../config/cloudinary");
const prisma = new client_1.PrismaClient();
const createGenre = async (req, res) => {
    const { name } = req.body;
    const parsedInput = zodTypes_1.createGenreInput.safeParse({ name });
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
    }
    catch (err) {
        res.status(500).json({ message: "Genre creation failed", err });
    }
};
exports.createGenre = createGenre;
const getGenres = async (req, res) => {
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
    }
    catch (err) { }
};
exports.getGenres = getGenres;
const createMovie = async (req, res) => {
    try {
        const { title, description, genreIds } = req.body;
        const genres = JSON.parse(genreIds);
        console.log(genres, "genres");
        const posterImage = req.file;
        const parsedInput = zodTypes_1.createMovieInput.safeParse({
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
            const result = await cloudinary_1.cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`, {
                folder: "uploads",
            });
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
                include: {
                    genres: true,
                },
            });
            res.status(200).json({
                success: true,
                message: "Movie created successfully",
                movie,
            });
        }
        catch (err) {
            console.log(err);
            return res.status(500).json({ message: "Image upload failed", err });
        }
    }
    catch (err) {
        return res.status(500).json({ message: "Movie creation failed", err });
    }
};
exports.createMovie = createMovie;
const listMovies = async (_, res) => {
    try {
        const movies = await prisma.movie.findMany({
            include: { genres: true, showtimes: true },
        });
        res.json(movies);
    }
    catch {
        res.status(500).json({ error: "Could not fetch movies" });
    }
};
exports.listMovies = listMovies;
