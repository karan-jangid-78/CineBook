import mongoose from 'mongoose';

const bookingSeatSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true },
    tier: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
      index: true,
    },
    /**
     * Unique reservationId ensures IDEMPOTENCY:
     * If the client or network triggers repeated confirmation requests,
     * the database unique index prevents duplicate bookings from being created.
     */
    reservationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    seats: [bookingSeatSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    convenienceFee: {
      type: Number,
      default: 30,
    },
    taxAndFees: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentDetails: {
      method: {
        type: String,
        default: 'SIMULATED_CARD',
      },
      status: {
        type: String,
        enum: ['COMPLETED', 'FAILED'],
        default: 'COMPLETED',
      },
      transactionId: {
        type: String,
        required: true,
      },
      simulated: {
        type: Boolean,
        default: true,
      },
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user booking history
bookingSchema.index({ user: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
