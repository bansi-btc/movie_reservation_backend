"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const movie_controller_1 = require("../controllers/movie.controller");
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
router.post("/create-genre", auth_middleware_1.authenticate, auth_middleware_1.isAdmin, movie_controller_1.createGenre);
router.get("/get-genres", auth_middleware_1.authenticate, movie_controller_1.getGenres);
router.post("/create-movie", auth_middleware_1.authenticate, auth_middleware_1.isAdmin, upload.single("posterImage"), movie_controller_1.createMovie);
router.get("/list-movies", movie_controller_1.listMovies);
router.get("/get-movie-details/:movieId", auth_middleware_1.authenticate, movie_controller_1.getMovieDetails);
exports.default = router;
