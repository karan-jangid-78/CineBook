import express from 'express';
import { getShows, getShowSeats } from '../controllers/showController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getShows);
router.get('/:id/seats', optionalAuthenticateToken, getShowSeats);

export default router;
