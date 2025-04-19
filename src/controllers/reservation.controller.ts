import { Request, Response } from "express";
import { z } from "zod";
import { redis } from "../redis";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    redis.lPush("bookings", JSON.stringify(bookingObject));

    return res.status(200).json({
      success: true,
      message: "Seats booking in progress",
      bookingJob,
    });
  } catch (err) {}
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

export const bookseatsWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  console.log(req.body, "raw body");

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
  } catch (err) {
    console.error("❌ Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log(session?.metadata);

    if (!session?.metadata) {
      return res.status(400).json({
        success: false,
        message: "Invalid session metadata",
      });
    }

    const { metaDataString } = session.metadata;

    const { seatsToBook, showtimeId, userId, bookingId } = JSON.parse(
      metaDataString
    ) as {
      seatsToBook: Array<number>;
      showtimeId: string;
      userId: string;
      bookingId: string;
    };

    if (!seatsToBook || !showtimeId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid session metadata",
      });
    }

    const allLocked = await Promise.all(
      seatsToBook.map(async (seat: number) => {
        const lockOwner = await redis.get(`lock:seat:${showtimeId}:${seat}`);
        return lockOwner === userId;
      })
    );

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

    await Promise.all(
      seatsToBook.map((seat) => redis.del(`lock:seat:${showtimeId}:${seat}`))
    );

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
