import { Request, Response } from "express";
import { z } from "zod";
import { redis } from "../redis";
import { PrismaClient } from "@prisma/client";

const lockSeatsInput = z.object({
  showtimeId: z.string(),
  seatsToBook: z.array(z.number()),
});

const prisma = new PrismaClient();

const bookSeatsInput = z.object({
  showtimeId: z.string(),
  seatsToBook: z.array(z.number()),
});

export const bookSeats = async (
  req: Request & { user: { id: string } },
  res: Response
) => {
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
    const bookingJob = await prisma.bookingJob.create({
      data: {
        showtimeId,
        userId,
      },
    });
    if (!bookingJob) {
      return res.status(400).json({ message: "Failed to create booking job" });
    }

    const bookingObject = {
      bookingId: bookingJob.id,
      showtimeId,
      userId,
    };

    redis.lPush("bookings", JSON.stringify(bookingObject));

    return res.status(200).json({
      success: true,
      message: "Seats booking in progress",
      bookingJob,
    });
  } catch (err) {}
};

export const lockSeatTemporarily = async (
  req: Request & { user?: { id?: string } },
  res: Response
) => {
  try {
    const locks: string[] = [];

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
        const success = await redis.set(key, userId, {
          NX: true,
          EX: 300,
        });

        if (!success) {
          for (const locked of locks) {
            await redis.del(locked);
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
          await redis.del(locked);
        }
        throw new Error(`Some seats are already booked`);
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seats locked successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err,
    });
  }
};

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
