import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config, validateEnv } from './config/env.js';
import { Movie } from './models/Movie.js';
import { runSeed } from './seed/seed.js';
import { cleanupExpiredHolds } from './services/reservationService.js';
import { ensureUpcomingShows } from './services/showScheduleService.js';

let cleanupTimer = null;

async function startServer() {
  try {
    // Validate critical environment configurations before startup
    validateEnv();

    await connectDB();

    // Auto-seed if database is brand new (safe insert, never wipes existing collections)
    const movieCount = await Movie.countDocuments();
    if (movieCount === 0) {
      if (!config.isProduction || config.autoSeed) {
        console.log('[Server] Database is empty. Running initial safe seed...');
        await runSeed({ exitOnComplete: false, cleanCollections: false });
      } else {
        console.log(
          '[Server] Database has 0 movies. Automatic seeding is disabled in production. Run "npm run seed" if initial catalog data is required.'
        );
      }
    }

    // Ensure upcoming shows are fully scheduled for the next 5 days
    await ensureUpcomingShows({ daysAhead: 5 });

    // Background expiration cleanup job runs every 30 seconds
    let lastScheduleCheck = Date.now();
    cleanupTimer = setInterval(async () => {
      try {
        const expiredCount = await cleanupExpiredHolds();
        if (expiredCount > 0) {
          console.log(`[Cleaner] Expired ${expiredCount} stale seat hold(s).`);
        }

        // Periodically verify upcoming shows every 1 hour
        if (Date.now() - lastScheduleCheck > 60 * 60 * 1000) {
          lastScheduleCheck = Date.now();
          await ensureUpcomingShows({ daysAhead: 5 });
        }
      } catch (err) {
        console.error('[Cleaner] Error cleaning expired holds:', err.message);
      }
    }, 30000);


    const server = app.listen(config.port, () => {
      console.log(`\n🎬 =================================================`);
      console.log(`   CineBook API Server running on port ${config.port}`);
      console.log(`   Health check: http://localhost:${config.port}/api/health`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`🎬 =================================================\n`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      if (cleanupTimer) clearInterval(cleanupTimer);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] CineBook backend stopped.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
