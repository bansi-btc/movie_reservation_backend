"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookSeats = exports.lockSeatTemporarily = void 0;
const zod_1 = require("zod");
const redis_1 = require("../redis");
const client_1 = require("@prisma/client");
const lockSeatsInput = zod_1.z.object({
    showtimeId: zod_1.z.string(),
    seatsToBook: zod_1.z.array(zod_1.z.number()),
});
const prisma = new client_1.PrismaClient();
const lockSeatTemporarily = async (req, res) => {
    try {
        const locks = [];
        const { showtimeId, seatsToBook } = req.body;
        const userId = req?.user?.id;
        const parsedInput = lockSeatsInput.safeParse({
            showtimeId,
            seatsToBook,
        });
        if (!parsedInput.success) {
            return res
                .status(400)
                .json({ message: "Invalid input", error: parsedInput.error.errors });
        }
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        try {
            for (const seat of seatsToBook) {
                const key = `lock:seat:${showtimeId}:${seat}`;
                const success = await redis_1.redis.set(key, userId, {
                    NX: true,
                    EX: 300,
                });
                if (!success) {
                    for (const locked of locks) {
                        await redis_1.redis.del(locked);
                    }
                    return res.status(300).json({
                        success: false,
                        message: `Seat ${seat} is already locked by another user`,
                    });
                }
                locks.push(key);
            }
            const bookedSeats = await prisma.seat.findMany({
                where: {
                    showtimeId,
                    number: { in: seatsToBook },
                    isBooked: true,
                },
            });
            if (bookedSeats.length > 0) {
                for (const locked of locks) {
                    await redis_1.redis.del(locked);
                }
                throw new Error(`Some seats are already booked`);
            }
        }
        catch (err) {
            return res.status(400).json({
                success: false,
                message: err,
            });
        }
        return res.status(200).json({
            success: true,
            message: "Seats locked successfully",
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err,
        });
    }
};
exports.lockSeatTemporarily = lockSeatTemporarily;
const bookSeats = async (req, res) => {
    try {
        const { showtimeId, seatsToBook } = req.body;
        const userId = req?.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        console.log(userId, "userId");
        const parsedInput = lockSeatsInput.safeParse({
            showtimeId,
            seatsToBook,
        });
        if (!parsedInput.success) {
            return res
                .status(400)
                .json({ message: "Invalid input", error: parsedInput.error.errors });
        }
        for (const seat of seatsToBook) {
            const key = `lock:seat:${showtimeId}:${seat}`;
            const lockedBy = await redis_1.redis.get(key);
            const success = await redis_1.redis.del(key);
            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: `Seat ${seat} is not locked`,
                });
            }
            if (lockedBy !== userId) {
                return res.status(400).json({
                    success: false,
                    message: `Seat ${seat} is locked by another user`,
                });
            }
        }
        const seats = await prisma.seat.findMany({
            where: {
                showtimeId,
                number: { in: seatsToBook },
                isBooked: false,
            },
        });
        if (seats.length !== seatsToBook.length) {
            return res.status(400).json({
                success: false,
                message: "Some seats are already booked",
            });
        }
        const seatIds = seats.map((seat) => seat.id);
        const result = await prisma.$transaction(async (tx) => {
            // Create reservation
            const reservation = await tx.reservation.create({
                data: {
                    user: {
                        connect: { id: userId },
                    },
                    seat: {
                        connect: seatIds.map((id) => ({ id })),
                    },
                },
                include: {
                    seat: true,
                },
            });
            if (!reservation) {
                throw new Error("Reservation failed");
            }
            await tx.seat.updateMany({
                where: {
                    id: { in: seatIds },
                },
                data: {
                    isBooked: true,
                    reservationId: reservation.id,
                },
            });
            return reservation;
        });
        return res.status(200).json({
            success: true,
            message: "Seats booked successfully",
            reservation: result,
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            err,
        });
    }
};
exports.bookSeats = bookSeats;
