import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Movie } from '../models/Movie.js';
import { Cinema } from '../models/Cinema.js';
import { Show } from '../models/Show.js';
import { SeatReservation } from '../models/SeatReservation.js';
import { Booking } from '../models/Booking.js';
import { sampleMovies, sampleCinemas } from './seedData.js';

import { config } from '../config/env.js';

export async function runSeed(options = {}) {
  const exitOnComplete = options.exitOnComplete ?? true;
  // In production, default cleanCollections to FALSE to prevent wiping data
  const cleanCollections = options.cleanCollections ?? (!config.isProduction);

  try {
    console.log('[Seed] Starting CineBook database seeding...');
    await connectDB();

    // 1. Clean existing records only if explicitly requested and safe
    if (cleanCollections) {
      if (config.isProduction && !options.forceProductionReset) {
        throw new Error(
          '[Seed] Refusing to wipe collections in production. Use options.forceProductionReset if intended.'
        );
      }
      await Promise.all([
        User.deleteMany({}),
        Movie.deleteMany({}),
        Cinema.deleteMany({}),
        Show.deleteMany({}),
        SeatReservation.deleteMany({}),
        Booking.deleteMany({}),
      ]);
      console.log('[Seed] Cleared existing database collections.');
    } else {
      console.log('[Seed] Safe mode active: preserving existing collections.');
    }

    // 2. Create Users (avoid duplicate emails)
    const demoUsersToCreate = [
      {
        name: 'Demo Admin',
        email: 'admin@cinebook.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user',
      },
    ];

    const users = [];
    for (const u of demoUsersToCreate) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
      }
      users.push(existing);
    }
    console.log(`[Seed] Demo users ready: ${users.length} user(s).`);

    // 3. Create Movies (avoid duplicates)
    const movies = [];
    for (const m of sampleMovies) {
      let existing = await Movie.findOne({ title: m.title });
      if (!existing) {
        existing = await Movie.create(m);
      }
      movies.push(existing);
    }
    console.log(`[Seed] Movies catalog ready: ${movies.length} movie(s).`);

    // 4. Create Cinemas (avoid duplicates)
    const cinemas = [];
    for (const c of sampleCinemas) {
      let existing = await Cinema.findOne({ name: c.name });
      if (!existing) {
        existing = await Cinema.create(c);
      }
      cinemas.push(existing);
    }
    console.log(`[Seed] Cinemas ready: ${cinemas.length} cinema(s).`);

    // 5. Generate Shows across 3 days
    const showsToInsert = [];
    const showHours = [10, 14, 18, 21]; // 10:00, 14:00, 18:00, 21:00

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const showDate = new Date(today);
      showDate.setDate(today.getDate() + dayOffset);

      for (const movie of movies) {
        if (movie.status === 'upcoming') continue; // Only now_showing have active showtimes

        for (const cinema of cinemas) {
          const screen = cinema.screens[0]; // Primary screen

          for (const hour of showHours) {
            const startTime = new Date(showDate);
            startTime.setHours(hour, 30, 0, 0);

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + movie.duration + 20); // Movie duration + 20 min interval

            showsToInsert.push({
              movie: movie._id,
              cinema: cinema._id,
              screenName: screen.name,
              startTime,
              endTime,
              format: screen.screenType.includes('IMAX') ? 'IMAX 3D' : '2D',
              language: movie.language,
              pricing: {
                standard: 220,
                premium: 350,
                vip: 520,
              },
              totalSeats: 60,
              isActive: true,
            });
          }
        }
      }
    }

    let createdShows = [];
    const activeFutureShows = await Show.countDocuments({
      isActive: true,
      startTime: { $gte: new Date() },
    });

    if (activeFutureShows === 0) {
      createdShows = await Show.create(showsToInsert);
      console.log(`[Seed] Created ${createdShows.length} fresh shows.`);
    } else {
      createdShows = await Show.find({ startTime: { $gte: new Date() } }).limit(5);
      console.log(`[Seed] Active upcoming shows already exist (${activeFutureShows} present).`);
    }


    // 6. Pre-seed a sample confirmed booking for the first show if not already present
    const existingDemoBooking = await Booking.findOne({ bookingReference: 'CB-DEMO-001' });
    if (!existingDemoBooking && createdShows.length > 0) {
      const demoShow = createdShows[0];
      const demoUser = users[1]; // John Doe
      const reservationId = new mongoose.Types.ObjectId().toString();

      const demoSeats = [
        { seatNumber: 'C5', tier: 'premium', price: 350 },
        { seatNumber: 'C6', tier: 'premium', price: 350 },
      ];

      const demoBooking = await Booking.create({
        bookingReference: 'CB-DEMO-001',
        user: demoUser._id,
        show: demoShow._id,
        reservationId,
        seats: demoSeats,
        subtotal: 700,
        convenienceFee: 30,
        taxAndFees: 5,
        totalAmount: 735,
        paymentDetails: {
          method: 'SIMULATED_CARD',
          status: 'COMPLETED',
          transactionId: 'TXN_DEMO_SEED_001',
          simulated: true,
        },
        status: 'CONFIRMED',
      });

      await SeatReservation.create([
        {
          show: demoShow._id,
          seatNumber: 'C5',
          tier: 'premium',
          price: 350,
          user: demoUser._id,
          reservationId,
          status: 'CONFIRMED',
          expiresAt: new Date(Date.now() + 86400000),
          confirmedAt: new Date(),
          booking: demoBooking._id,
        },
        {
          show: demoShow._id,
          seatNumber: 'C6',
          tier: 'premium',
          price: 350,
          user: demoUser._id,
          reservationId,
          status: 'CONFIRMED',
          expiresAt: new Date(Date.now() + 86400000),
          confirmedAt: new Date(),
          booking: demoBooking._id,
        },
      ]);
      console.log(`[Seed] Created demo booking & confirmed seats (C5, C6) for show: ${demoShow._id}`);
    } else {
      console.log(`[Seed] Demo booking verified.`);
    }

    console.log('\n========================================');
    console.log('✅ CineBook Database Seeded Successfully!');
    console.log('----------------------------------------');
    console.log('Demo Credentials:');
    console.log('User:  john@example.com  | Password: password123');
    console.log('Admin: admin@cinebook.com | Password: admin123');
    console.log('========================================\n');

    if (options.exitOnComplete) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
    if (options.exitOnComplete) {
      process.exit(1);
    }
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
