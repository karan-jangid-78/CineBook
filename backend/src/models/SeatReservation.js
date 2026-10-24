import mongoose from 'mongoose';

const seatReservationSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true,
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true,
      uppercase: true,
    },
    tier: {
      type: String,
      enum: ['standard', 'premium', 'vip'],
      required: true,
      default: 'standard',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    reservationId: {
      type: String,
      required: [true, 'Reservation batch ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['HELD', 'CONFIRMED', 'RELEASED', 'EXPIRED'],
      default: 'HELD',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    confirmedAt: {
      type: Date,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * CRITICAL CONCURRENCY UNIQUE INDEX
 * Enforces at the database level that no two documents for the same show and seat
 * can have status 'HELD' or 'CONFIRMED' simultaneously.
 *
 * If two requests race to hold or book the same seat, MongoDB guarantees that
 * at most one will succeed, and the other will trigger a duplicate key error (code 11000).
 */
seatReservationSchema.index(
  { show: 1, seatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['HELD', 'CONFIRMED'] },
    },
  }
);

// Fast compound index for background expiration cleanups
seatReservationSchema.index({ status: 1, expiresAt: 1 });

export const SeatReservation = mongoose.model('SeatReservation', seatReservationSchema);
