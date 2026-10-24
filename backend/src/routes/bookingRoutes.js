import express from 'express';
import {
  reserveSeats,
  releaseSeats,
  confirmBooking,
  getMyBookings,
  getBookingById,
} from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken); // All booking routes require authentication

router.post('/reserve', reserveSeats);
router.post('/release', releaseSeats);
router.post('/confirm', confirmBooking);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBookingById);

export default router;
