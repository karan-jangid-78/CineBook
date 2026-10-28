import { Show } from '../models/Show.js';
import { getSeatLayoutAndAvailability } from '../services/reservationService.js';
import { ensureUpcomingShows } from '../services/showScheduleService.js';

export async function getShowSeats(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const data = await getSeatLayoutAndAvailability(id, currentUserId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function getShows(req, res, next) {
  try {
    const { movie, cinema, date } = req.query;
    const query = { isActive: true };

    if (movie) query.movie = movie;
    if (cinema) query.cinema = cinema;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    let shows = await Show.find(query)
      .populate('movie')
      .populate('cinema')
      .sort({ startTime: 1 });

    // Auto-heal: If querying upcoming shows and 0 results found, ensure schedule and retry
    if (shows.length === 0 && (!date || new Date(date).getTime() >= new Date().setHours(0, 0, 0, 0))) {
      await ensureUpcomingShows({ daysAhead: 5, specificMovieId: movie || null });
      shows = await Show.find(query)
        .populate('movie')
        .populate('cinema')
        .sort({ startTime: 1 });
    }

    res.status(200).json({
      success: true,
      count: shows.length,
      data: shows,
    });
  } catch (err) {
    next(err);
  }
}

