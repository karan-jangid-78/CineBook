import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config } from './config/env.js';
import { Movie } from './models/Movie.js';
import { runSeed } from './seed/seed.js';
import { cleanupExpiredHolds } from './services/reservationService.js';

let cleanupTimer = null;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is brand new
    const movieCount = await Movie.countDocuments();
    if (movieCount === 0) {
      console.log('[Server] Database is empty. Running initial seed...');
      await runSeed({ exitOnComplete: false });
    }

    // Background expiration cleanup job runs every 30 seconds
    cleanupTimer = setInterval(async () => {
      try {
        const expiredCount = await cleanupExpiredHolds();
        if (expiredCount > 0) {
          console.log(`[Cleaner] Expired ${expiredCount} stale seat hold(s).`);
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
