import mongoose from 'mongoose';
import { SeatReservation } from '../models/SeatReservation.js';
import { Show } from '../models/Show.js';
import { Booking } from '../models/Booking.js';
import { isReplicaSet } from '../config/db.js';

export function getTierForSeat(seatNumber) {
  const row = seatNumber.charAt(0).toUpperCase();
  if (['A', 'B'].includes(row)) return 'standard';
  if (['C', 'D'].includes(row)) return 'premium';
  if (['E', 'F'].includes(row)) return 'vip';
  return 'standard';
}

export function generateAllSeatNumbers() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seats = [];
  for (const row of rows) {
    for (let col = 1; col <= 10; col++) {
      seats.push(`${row}${col}`);
    }
  }
  return seats;
}

export async function cleanupExpiredHolds(showId = null) {
  const query = {
    status: 'HELD',
    expiresAt: { $lt: new Date() },
  };
  if (showId) {
    query.show = showId;
  }
  const result = await SeatReservation.updateMany(query, {
    $set: { status: 'EXPIRED' },
  });
  return result.modifiedCount;
}

export async function getSeatLayoutAndAvailability(showId, currentUserId = null) {
  const show = await Show.findById(showId).populate('movie').populate('cinema');
  if (!show) {
    const err = new Error('Show not found');
    err.statusCode = 404;
    throw err;
  }

  // Atomically expire any stale holds for this show first
  await cleanupExpiredHolds(showId);

  // Fetch active reservations (HELD or CONFIRMED)
  const activeReservations = await SeatReservation.find({
    show: showId,
    status: { $in: ['HELD', 'CONFIRMED'] },
  }).lean();

  const reservedMap = new Map();
  for (const res of activeReservations) {
    reservedMap.set(res.seatNumber, res);
  }

  const allSeatNumbers = generateAllSeatNumbers();
  const seats = allSeatNumbers.map((seatNumber) => {
    const row = seatNumber.charAt(0);
    const col = parseInt(seatNumber.slice(1), 10);
    const tier = getTierForSeat(seatNumber);
    const price = show.pricing[tier] || 250;

    const reservation = reservedMap.get(seatNumber);

    let status = 'available';
    let heldByCurrentUser = false;
    let expiresAt = null;
    let reservationId = null;

    if (reservation) {
      if (reservation.status === 'CONFIRMED') {
        status = 'booked';
      } else if (reservation.status === 'HELD') {
        status = 'held';
        expiresAt = reservation.expiresAt;
        reservationId = reservation.reservationId;
        if (currentUserId && reservation.user.toString() === currentUserId.toString()) {
          heldByCurrentUser = true;
        }
      }
    }

    return {
      seatNumber,
      row,
      col,
      tier,
      price,
      status,
      heldByCurrentUser,
      expiresAt,
      reservationId: heldByCurrentUser ? reservationId : undefined,
    };
  });

  return {
    show: {
      _id: show._id,
      movie: show.movie,
      cinema: show.cinema,
      screenName: show.screenName,
      startTime: show.startTime,
      endTime: show.endTime,
      pricing: show.pricing,
      format: show.format,
      language: show.language,
    },
    seats,
  };
}

export async function createSeatHold({ showId, seatNumbers, userId, holdMinutes = 5 }) {
  if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    const err = new Error('Please select at least one seat');
    err.statusCode = 400;
    throw err;
  }

  // Enforce server-side maximum limit of 8 seats per booking
  if (seatNumbers.length > 8) {
    const err = new Error('You can select a maximum of 8 seats per booking');
    err.statusCode = 400;
    throw err;
  }

  // Validate that every seat matches the theater layout (Rows A-F, Columns 1-10)
  const SEAT_REGEX = /^[A-F]([1-9]|10)$/;
  for (const seat of seatNumbers) {
    if (typeof seat !== 'string' || !SEAT_REGEX.test(seat.trim().toUpperCase())) {
      const err = new Error(`Invalid seat number: "${seat}". Seats must be between A1 and F10.`);
      err.statusCode = 400;
      throw err;
    }
  }

  const normalizedSeats = seatNumbers.map((s) => s.trim().toUpperCase());
  // Check for duplicates in the request itself
  const uniqueRequested = new Set(normalizedSeats);
  if (uniqueRequested.size !== normalizedSeats.length) {
    const err = new Error('Duplicate seats in reservation request');
    err.statusCode = 400;
    throw err;
  }

  const show = await Show.findById(showId);
  if (!show) {
    const err = new Error('Show not found');
    err.statusCode = 404;
    throw err;
  }

  // First, release any stale holds
  await cleanupExpiredHolds(showId);

  const reservationId = new mongoose.Types.ObjectId().toString();
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

  const docs = normalizedSeats.map((seatNumber) => {
    const tier = getTierForSeat(seatNumber);
    const price = show.pricing[tier] || 250;
    return {
      show: showId,
      seatNumber,
      tier,
      price,
      user: userId,
      reservationId,
      status: 'HELD',
      expiresAt,
    };
  });

  const canUseTransactions = isReplicaSet();

  if (canUseTransactions) {
    const session = await mongoose.startSession();
    try {
      let result = null;
      await session.withTransaction(async () => {
        // Double-check inside transaction if any seat is already HELD or CONFIRMED
        const existing = await SeatReservation.find({
          show: showId,
          seatNumber: { $in: normalizedSeats },
          status: { $in: ['HELD', 'CONFIRMED'] },
        }).session(session);

        if (existing.length > 0) {
          const taken = existing.map((s) => s.seatNumber);
          const err = new Error(`Seat(s) already reserved: ${taken.join(', ')}`);
          err.statusCode = 409;
          err.takenSeats = taken;
          throw err;
        }

        result = await SeatReservation.insertMany(docs, { session });
      });

      return {
        reservationId,
        showId,
        expiresAt,
        seats: docs,
        totalAmount: docs.reduce((sum, d) => sum + d.price, 0),
      };
    } catch (err) {
      if (err.code === 11000) {
        const conflictErr = new Error('One or more selected seats were claimed concurrently. Please pick another seat.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback: insert with unique index protection and automatic rollback compensation
    try {
      // Check existing active seats
      const existing = await SeatReservation.find({
        show: showId,
        seatNumber: { $in: normalizedSeats },
        status: { $in: ['HELD', 'CONFIRMED'] },
      });

      if (existing.length > 0) {
        const taken = existing.map((s) => s.seatNumber);
        const err = new Error(`Seat(s) already reserved: ${taken.join(', ')}`);
        err.statusCode = 409;
        err.takenSeats = taken;
        throw err;
      }

      await SeatReservation.insertMany(docs, { ordered: true });

      return {
        reservationId,
        showId,
        expiresAt,
        seats: docs,
        totalAmount: docs.reduce((sum, d) => sum + d.price, 0),
      };
    } catch (err) {
      // Clean up any partially inserted seats under this reservationId (all-or-nothing guarantee)
      await SeatReservation.deleteMany({ reservationId });

      if (err.code === 11000) {
        const conflictErr = new Error('One or more selected seats were claimed concurrently. Please pick another seat.');
        conflictErr.statusCode = 409;
        throw conflictErr;
      }
      throw err;
    }
  }
}

export async function releaseSeatHold({ reservationId, userId }) {
  const reservations = await SeatReservation.find({ reservationId });
  if (!reservations || reservations.length === 0) {
    const err = new Error('Reservation not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: User can only cancel their own reservation
  const first = reservations[0];
  if (first.user.toString() !== userId.toString()) {
    const err = new Error('Unauthorized to release this reservation');
    err.statusCode = 403;
    throw err;
  }

  // Only HELD reservations can be manually released (cannot cancel confirmed this way)
  const result = await SeatReservation.updateMany(
    { reservationId, status: 'HELD' },
    { $set: { status: 'RELEASED' } }
  );

  return { releasedCount: result.modifiedCount };
}

export async function confirmBooking({ reservationId, userId, paymentDetails = {} }) {
  // 1. Idempotency Check: check if a Booking already exists for this reservationId
  const existingBooking = await Booking.findOne({ reservationId })
    .populate({
      path: 'show',
      populate: ['movie', 'cinema'],
    })
    .populate('user', 'name email');

  if (existingBooking) {
    // Verify user ownership of the existing booking
    if (existingBooking.user._id.toString() !== userId.toString()) {
      const err = new Error('Unauthorized access to this booking');
      err.statusCode = 403;
      throw err;
    }
    // Return existing booking idempotently
    return { booking: existingBooking, idempotent: true };
  }

  // 2. Fetch all seat reservations for this reservationId
  const reservations = await SeatReservation.find({ reservationId });
  if (!reservations || reservations.length === 0) {
    const err = new Error('Reservation not found');
    err.statusCode = 404;
    throw err;
  }

  // 3. Verify user ownership
  const reservationUser = reservations[0].user.toString();
  if (reservationUser !== userId.toString()) {
    const err = new Error('Unauthorized: You cannot confirm another user reservation');
    err.statusCode = 403;
    throw err;
  }

  // 4. Verify status is HELD and not expired
  const now = new Date();
  for (const res of reservations) {
    if (res.status !== 'HELD') {
      const err = new Error(`Reservation is in status "${res.status}" and cannot be confirmed.`);
      err.statusCode = 409;
      throw err;
    }
    if (res.expiresAt < now) {
      // Mark as expired
      await SeatReservation.updateMany({ reservationId, status: 'HELD' }, { $set: { status: 'EXPIRED' } });
      const err = new Error('Seat hold has expired. Please reselect your seats.');
      err.statusCode = 410; // Gone / Expired
      throw err;
    }
  }

  const showId = reservations[0].show;
  const show = await Show.findById(showId);
  if (!show) {
    const err = new Error('Show not found');
    err.statusCode = 404;
    throw err;
  }

  // Calculate prices
  const seats = reservations.map((r) => ({
    seatNumber: r.seatNumber,
    tier: r.tier,
    price: r.price,
  }));
  const subtotal = seats.reduce((acc, s) => acc + s.price, 0);
  const convenienceFee = 30;
  const taxAndFees = Math.round(convenienceFee * 0.18);
  const totalAmount = subtotal + convenienceFee + taxAndFees;

  // Generate readable booking reference: CB-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const bookingReference = `CB-${dateStr}-${randomSuffix}`;

  const transactionId = paymentDetails.transactionId || `SIM_TXN_${Date.now()}_${randomSuffix}`;

  const canUseTransactions = isReplicaSet();

  if (canUseTransactions) {
    const session = await mongoose.startSession();
    try {
      let createdBooking = null;
      await session.withTransaction(async () => {
        // Create booking
        const [booking] = await Booking.create(
          [
            {
              bookingReference,
              user: userId,
              show: showId,
              reservationId,
              seats,
              subtotal,
              convenienceFee,
              taxAndFees,
              totalAmount,
              paymentDetails: {
                method: paymentDetails.method || 'SIMULATED_CARD',
                status: 'COMPLETED',
                transactionId,
                simulated: true,
              },
              status: 'CONFIRMED',
            },
          ],
          { session }
        );

        // Update reservations to CONFIRMED
        await SeatReservation.updateMany(
          { reservationId, status: 'HELD' },
          {
            $set: {
              status: 'CONFIRMED',
              confirmedAt: new Date(),
              booking: booking._id,
            },
          },
          { session }
        );

        createdBooking = booking;
      });

      const populated = await Booking.findById(createdBooking._id)
        .populate({
          path: 'show',
          populate: ['movie', 'cinema'],
        })
        .populate('user', 'name email');

      return { booking: populated, idempotent: false };
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key on reservationId (concurrent double-submit): return existing
        const existing = await Booking.findOne({ reservationId })
          .populate({
            path: 'show',
            populate: ['movie', 'cinema'],
          })
          .populate('user', 'name email');
        if (existing) {
          return { booking: existing, idempotent: true };
        }
      }
      throw err;
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback
    try {
      const booking = await Booking.create({
        bookingReference,
        user: userId,
        show: showId,
        reservationId,
        seats,
        subtotal,
        convenienceFee,
        taxAndFees,
        totalAmount,
        paymentDetails: {
          method: paymentDetails.method || 'SIMULATED_CARD',
          status: 'COMPLETED',
          transactionId,
          simulated: true,
        },
        status: 'CONFIRMED',
      });

      await SeatReservation.updateMany(
        { reservationId, status: 'HELD' },
        {
          $set: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            booking: booking._id,
          },
        }
      );

      const populated = await Booking.findById(booking._id)
        .populate({
          path: 'show',
          populate: ['movie', 'cinema'],
        })
        .populate('user', 'name email');

      return { booking: populated, idempotent: false };
    } catch (err) {
      if (err.code === 11000) {
        const existing = await Booking.findOne({ reservationId })
          .populate({
            path: 'show',
            populate: ['movie', 'cinema'],
          })
          .populate('user', 'name email');
        if (existing) {
          return { booking: existing, idempotent: true };
        }
      }
      throw err;
    }
  }
}
