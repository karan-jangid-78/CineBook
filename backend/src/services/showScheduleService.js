import mongoose from 'mongoose';
import { Movie } from '../models/Movie.js';
import { Cinema } from '../models/Cinema.js';
import { Show } from '../models/Show.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { SeatReservation } from '../models/SeatReservation.js';
import { runSeed } from '../seed/seed.js';

let isEnsuring = false;

/**
 * Ensures that all currently showing movies have active show schedules
 * for today and the upcoming N days across all cinemas and screen types.
 * 
 * Completely self-healing: if no future shows exist (e.g. older seed data lapsed),
 * fresh show schedules are generated automatically so bookings can always be made.
 */
export async function ensureUpcomingShows({ daysAhead = 5, specificMovieId = null } = {}) {
  if (isEnsuring) return;
  isEnsuring = true;

  try {
    let movies = specificMovieId
      ? await Movie.find({ _id: specificMovieId })
      : await Movie.find({ status: { $ne: 'upcoming' } });

    let cinemas = await Cinema.find();

    // If movies or cinemas don't exist, run safe seed first
    if (movies.length === 0 || cinemas.length === 0) {
      const totalMovies = await Movie.countDocuments();
      if (totalMovies === 0) {
        console.log('[ScheduleService] Initial catalog empty. Running initial safe seed...');
        await runSeed({ exitOnComplete: false, cleanCollections: false });
        movies = specificMovieId
          ? await Movie.find({ _id: specificMovieId })
          : await Movie.find({ status: { $ne: 'upcoming' } });
        cinemas = await Cinema.find();
      }
    }

    if (movies.length === 0 || cinemas.length === 0) {
      return;
    }

    const showHours = [10, 14, 18, 21]; // Standard showtimes: 10:30, 14:30, 18:30, 21:30
    const now = new Date();
    const showsToInsert = [];

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0);

      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      for (const movie of movies) {
        // Skip upcoming movies from immediate daily show generation
        if (movie.status === 'upcoming') continue;

        for (const cinema of cinemas) {
          // Check how many active shows exist for this movie + cinema on this date
          const existingShows = await Show.find({
            movie: movie._id,
            cinema: cinema._id,
            isActive: true,
            startTime: { $gte: startOfDay, $lte: endOfDay },
          });

          // If no shows exist on this day for this movie and cinema, create standard slate
          if (existingShows.length === 0) {
            const screens = cinema.screens && cinema.screens.length > 0
              ? cinema.screens
              : [{ name: 'Audi 1 - Dolby Atmos Prime', screenType: 'Dolby Atmos', totalSeats: 60 }];

            const primaryScreen = screens[0];

            for (const hour of showHours) {
              const startTime = new Date(targetDate);
              startTime.setHours(hour, 30, 0, 0);

              const endTime = new Date(startTime);
              endTime.setMinutes(endTime.getMinutes() + (movie.duration || 120) + 20);

              showsToInsert.push({
                movie: movie._id,
                cinema: cinema._id,
                screenName: primaryScreen.name,
                startTime,
                endTime,
                format: primaryScreen.screenType?.includes('IMAX') ? 'IMAX 3D' : '2D',
                language: movie.language || 'English',
                pricing: {
                  standard: 220,
                  premium: 350,
                  vip: 520,
                },
                totalSeats: primaryScreen.totalSeats || 60,
                isActive: true,
              });
            }
          }
        }
      }
    }

    if (showsToInsert.length > 0) {
      console.log(`[ScheduleService] Auto-scheduling ${showsToInsert.length} fresh upcoming shows...`);
      const inserted = await Show.insertMany(showsToInsert, { ordered: false });
      console.log(`[ScheduleService] Successfully inserted ${inserted.length} shows across the next ${daysAhead} days.`);

      // Ensure demo account has an active upcoming booking
      await ensureDemoUserUpcomingBooking();
    }
  } catch (err) {
    console.error('[ScheduleService] Error ensuring upcoming shows:', err.message);
  } finally {
    isEnsuring = false;
  }
}

/**
 * Ensures demo user john@example.com has an upcoming confirmed booking
 * so the "My Bookings" -> "Upcoming" view displays a confirmed ticket voucher.
 */
export async function ensureDemoUserUpcomingBooking() {
  try {
    const demoUser = await User.findOne({ email: 'john@example.com' });
    if (!demoUser) return;

    // Check if demo user already has at least one active future booking
    const userBookings = await Booking.find({ user: demoUser._id }).populate('show');
    const hasUpcoming = userBookings.some((b) => {
      return b.show?.startTime && new Date(b.show.startTime).getTime() > Date.now();
    });

    if (hasUpcoming) {
      return;
    }

    // Find the next upcoming show starting in the future
    const upcomingShow = await Show.findOne({
      isActive: true,
      startTime: { $gte: new Date(Date.now() + 60 * 60 * 1000) }, // at least 1 hr from now
    })
      .populate('movie')
      .populate('cinema')
      .sort({ startTime: 1 });

    if (!upcomingShow) return;

    // Verify seats C5, C6 are free for this show
    const existingReserved = await SeatReservation.find({
      show: upcomingShow._id,
      seatNumber: { $in: ['C5', 'C6'] },
      status: { $in: ['HELD', 'CONFIRMED'] },
    });

    if (existingReserved.length > 0) {
      return; // seats already occupied
    }

    const reservationId = new mongoose.Types.ObjectId().toString();
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bookingReference = `CB-${dateTag}-UP${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const newBooking = await Booking.create({
      bookingReference,
      user: demoUser._id,
      show: upcomingShow._id,
      reservationId,
      seats: [
        { seatNumber: 'C5', tier: 'premium', price: upcomingShow.pricing?.premium || 350 },
        { seatNumber: 'C6', tier: 'premium', price: upcomingShow.pricing?.premium || 350 },
      ],
      subtotal: 700,
      convenienceFee: 30,
      taxAndFees: 5,
      totalAmount: 735,
      paymentDetails: {
        method: 'SIMULATED_CARD',
        status: 'COMPLETED',
        transactionId: `TXN_SEED_${Date.now()}`,
        simulated: true,
      },
      status: 'CONFIRMED',
    });

    await SeatReservation.create([
      {
        show: upcomingShow._id,
        seatNumber: 'C5',
        tier: 'premium',
        price: upcomingShow.pricing?.premium || 350,
        user: demoUser._id,
        reservationId,
        status: 'CONFIRMED',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        confirmedAt: new Date(),
        booking: newBooking._id,
      },
      {
        show: upcomingShow._id,
        seatNumber: 'C6',
        tier: 'premium',
        price: upcomingShow.pricing?.premium || 350,
        user: demoUser._id,
        reservationId,
        status: 'CONFIRMED',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        confirmedAt: new Date(),
        booking: newBooking._id,
      },
    ]);

    console.log(`[ScheduleService] Created demo upcoming booking (${bookingReference}) for John Doe.`);
  } catch (err) {
    console.error('[ScheduleService] Error setting up demo booking:', err.message);
  }
}
