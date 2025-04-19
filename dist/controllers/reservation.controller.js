"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookseatsWebhook = exports.bookSeats = void 0;
const zod_1 = require("zod");
const redis_1 = require("../redis");
const client_1 = require("@prisma/client");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
const lockSeatsInput = zod_1.z.object({
    showtimeId: zod_1.z.string(),
    seatsToBook: zod_1.z.array(zod_1.z.number()),
});
const prisma = new client_1.PrismaClient();
const bookSeatsInput = zod_1.z.object({
    showtimeId: zod_1.z.string(),
    seatsToBook: zod_1.z.array(zod_1.z.number()),
});
const bookSeats = async (req, res) => {
    try {
        const { showtimeId, seatsToBook } = req.body;
        const userId = req.user.id;
        const showTime = await prisma.showtime.findUnique({
            where: {
                id: showtimeId,
            },
        });
        if (!showTime) {
            return res.status(400).json({ message: "Showtime not found" });
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
        const parsedInput = bookSeatsInput.safeParse({
            showtimeId,
            seatsToBook,
        });
        if (!parsedInput.success) {
            return res
                .status(400)
                .json({ message: "Invalid input", error: parsedInput.error.errors });
        }
        const bookingJob = await prisma.bookingJob.create({ data: {} });
        if (!bookingJob) {
            return res.status(400).json({ message: "Failed to create booking job" });
        }
        const bookingObject = {
            bookingId: bookingJob.id,
            showtimeId,
            userId,
            seatsToBook,
        };
        redis_1.redis.lPush("bookings", JSON.stringify(bookingObject));
        return res.status(200).json({
            success: true,
            message: "Seats booking in progress",
            bookingJob,
        });
    }
    catch (err) { }
};
exports.bookSeats = bookSeats;
// export const bookSeats = async (
//   req: Request & { user?: { id?: string } },
//   res: Response
// ) => {
//   try {
//     const { showtimeId, seatsToBook } = req.body;
//     const userId = req?.user?.id;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//     const parsedInput = lockSeatsInput.safeParse({
//       showtimeId,
//       seatsToBook,
//     });
//     if (!parsedInput.success) {
//       return res
//         .status(400)
//         .json({ message: "Invalid input", error: parsedInput.error.errors });
//     }
//     for (const seat of seatsToBook) {
//       const key = `lock:seat:${showtimeId}:${seat}`;
//       const lockedBy = await redis.get(key);
//       const success = await redis.del(key);
//       if (!success) {
//         return res.status(400).json({
//           success: false,
//           message: `Seat ${seat} is not locked`,
//         });
//       }
//       if (lockedBy !== userId) {
//         return res.status(400).json({
//           success: false,
//           message: `Seat ${seat} is locked by another user`,
//         });
//       }
//     }
//     const seats = await prisma.seat.findMany({
//       where: {
//         showtimeId,
//         number: { in: seatsToBook },
//         isBooked: false,
//       },
//     });
//     if (seats.length !== seatsToBook.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Some seats are already booked",
//       });
//     }
//     const seatIds = seats.map((seat) => seat.id);
//     const result = await prisma.$transaction(async (tx) => {
//       // Create reservation
//       const reservation = await tx.reservation.create({
//         data: {
//           showtime: {
//             connect: { id: showtimeId },
//           },
//           user: {
//             connect: { id: userId },
//           },
//           seats: {
//             connect: seatIds.map((id) => ({ id })),
//           },
//         },
//       });
//       if (!reservation) {
//         throw new Error("Reservation failed");
//       }
//       await tx.seat.updateMany({
//         where: {
//           id: { in: seatIds },
//         },
//         data: {
//           isBooked: true,
//           reservationId: reservation.id,
//         },
//       });
//       return reservation;
//     });
//     return res.status(200).json({
//       success: true,
//       message: "Seats booked successfully",
//       reservation: result,
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       err,
//     });
//   }
// };
const bookseatsWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    console.log(req.body, "raw body");
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error("❌ Signature verification failed:", err);
        return res.status(400).send(`Webhook Error: ${err}`);
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log(session?.metadata);
        if (!session?.metadata) {
            return res.status(400).json({
                success: false,
                message: "Invalid session metadata",
            });
        }
        const { metaDataString } = session.metadata;
        const { seatsToBook, showtimeId, userId, bookingId } = JSON.parse(metaDataString);
        if (!seatsToBook || !showtimeId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid session metadata",
            });
        }
        const allLocked = await Promise.all(seatsToBook.map(async (seat) => {
            const lockOwner = await redis_1.redis.get(`lock:seat:${showtimeId}:${seat}`);
            return lockOwner === userId;
        }));
        if (!allLocked.every(Boolean)) {
            console.error("Seat locks not valid.");
            return res.status(400).send("Invalid seat locks.");
        }
        //create reservation mark bookingJob as success
        // update seats as booked
        // create reservation
        // marked bookin JOB as success
        // delete the locks
        const reservation = await prisma.$transaction(async (tx) => {
            const seats = await tx.seat.findMany({
                where: {
                    showtimeId,
                    number: { in: seatsToBook },
                    isBooked: false,
                },
            });
            if (seats.length !== seatsToBook.length) {
                throw new Error("Some seats are already booked we will refund you");
            }
            const seatIds = seats.map((s) => s.id);
            await tx.seat.updateMany({
                where: {
                    id: { in: seatIds },
                },
                data: {
                    isBooked: true,
                },
            });
            const reservation = await tx.reservation.create({
                data: {
                    showtime: { connect: { id: showtimeId } },
                    user: { connect: { id: userId } },
                    seats: {
                        connect: seatIds.map((id) => ({ id })),
                    },
                },
            });
            await tx.bookingJob.update({
                where: {
                    id: bookingId,
                },
                data: {
                    status: "SUCCESS",
                    reservation: {
                        connect: { id: reservation.id },
                    },
                },
            });
            return reservation;
        });
        if (!reservation) {
            return res.status(400).json({ message: "Failed to create reservation" });
        }
        await Promise.all(seatsToBook.map((seat) => redis_1.redis.del(`lock:seat:${showtimeId}:${seat}`)));
        console.log(reservation, "reservation");
        return res.status(200).json({
            received: true,
            message: "Seats booked successfully",
            reservation,
        });
    }
    console.log("Webhook called");
    res.status(200).json({
        success: true,
        message: "Webhook called",
    });
};
exports.bookseatsWebhook = bookseatsWebhook;
