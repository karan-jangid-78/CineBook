import express from 'express';
import { getShows, getShowSeats } from '../controllers/showController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';
import { ensureUpcomingShows } from '../services/showScheduleService.js';

const router = express.Router();

router.get('/', getShows);
router.get('/refresh-upcoming', async (req, res, next) => {
  try {
    await ensureUpcomingShows({ daysAhead: 5 });
    res.status(200).json({
      success: true,
      message: 'Upcoming movie shows refreshed and verified successfully.',
    });
  } catch (err) {
    next(err);
  }
});
router.get('/:id/seats', optionalAuthenticateToken, getShowSeats);

export default router;

