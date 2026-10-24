import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinebook',
  jwtSecret: process.env.JWT_SECRET || 'cinebook_secret_key_jwt_2026_portfolio_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  reservationHoldMinutes: parseInt(process.env.RESERVATION_HOLD_MINUTES, 10) || 5,
  useEmbeddedMongoFallback: process.env.USE_EMBEDDED_MONGO !== 'false',
};
