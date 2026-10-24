import {
  createSeatHold,
  releaseSeatHold,
  confirmBooking as confirmBookingService,
} from '../services/reservationService.js';
import { Booking } from '../models/Booking.js';

export async function reserveSeats(req, res, next) {
  try {
    const { showId, seats } = req.body;
    const userId = req.user._id;

    if (!showId || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'showId and an array of seats are required',
      });
    }

    const holdData = await createSeatHold({
      showId,
      seatNumbers: seats,
      userId,
    });

    res.status(201).json({
      success: true,
      message: 'Seats reserved successfully. Complete checkout before timer expires.',
      data: holdData,
    });
  } catch (err) {
    next(err);
  }
}

export async function releaseSeats(req, res, next) {
  try {
    const { reservationId } = req.body;
    const userId = req.user._id;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'reservationId is required',
      });
    }

    const result = await releaseSeatHold({
      reservationId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Seat reservation released',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmBooking(req, res, next) {
  try {
    const { reservationId, paymentDetails } = req.body;
    const userId = req.user._id;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: 'reservationId is required',
      });
    }

    const { booking, idempotent } = await confirmBookingService({
      reservationId,
      userId,
      paymentDetails,
    });

    res.status(idempotent ? 200 : 201).json({
      success: true,
      message: idempotent
        ? 'Booking already confirmed (idempotent response)'
        : 'Payment simulated and booking confirmed successfully!',
      data: {
        booking,
        idempotent,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const userId = req.user._id;

    const bookings = await Booking.find({ user: userId })
      .populate({
        path: 'show',
        populate: ['movie', 'cinema'],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findById(id)
      .populate({
        path: 'show',
        populate: ['movie', 'cinema'],
      })
      .populate('user', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.user._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}
