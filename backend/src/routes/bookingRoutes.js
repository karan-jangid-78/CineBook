import express from 'express';
import {
  reserveSeats,
  releaseSeats,
  confirmBooking,
  getMyBookings,
  getBookingById,
} from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { bookingHoldLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticateToken); // All booking routes require authentication

router.post('/reserve', bookingHoldLimiter, reserveSeats);
router.post('/release', releaseSeats);
router.post('/confirm', confirmBooking);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);

export default router;
