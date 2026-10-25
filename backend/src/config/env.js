import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Parse allowed frontend client URLs from environment (comma-separated if multiple)
const rawClientUrls = process.env.CLIENT_URL || '';
const clientUrls = rawClientUrls
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/cinebook'),
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'cinebook_dev_secret_key_jwt_2026_local_only'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv,
  isProduction,
  reservationHoldMinutes: parseInt(process.env.RESERVATION_HOLD_MINUTES, 10) || 5,
  // Embedded MongoDB is strictly forbidden in production to prevent data loss and OOM crashes
  useEmbeddedMongoFallback: !isProduction && process.env.USE_EMBEDDED_MONGO !== 'false',
  clientUrls,
  autoSeed: process.env.AUTO_SEED === 'true',
};

/**
 * Validates critical environment variables required for production.
 * Must fail early at server startup if required configurations are absent.
 */
export function validateEnv() {
  if (config.nodeEnv === 'production') {
    if (!config.mongoUri || config.mongoUri.includes('127.0.0.1') || config.mongoUri.includes('localhost')) {
      throw new Error(
        '[Config] Fatal: In production mode, a valid persistent MONGO_URI pointing to an external MongoDB database (e.g. MongoDB Atlas) is required.'
      );
    }

    if (
      !config.jwtSecret ||
      config.jwtSecret === 'cinebook_dev_secret_key_jwt_2026_local_only' ||
      config.jwtSecret === 'cinebook_secret_key_jwt_2026_portfolio_secure'
    ) {
      throw new Error(
        '[Config] Fatal: In production mode, a secure, unique JWT_SECRET environment variable is required.'
      );
    }
  }
}

