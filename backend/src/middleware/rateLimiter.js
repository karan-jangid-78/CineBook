import rateLimit from 'express-rate-limit';

// Standard rate limit bypass for test suites unless explicitly requested via test header
const shouldSkipInTests = (req) => {
  return process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true';
};

/**
 * Rate limiter for authentication routes (login / register)
 * Protects against brute-force password attacks and credential stuffing
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/register attempts per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkipInTests,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  statusCode: 429,
});

/**
 * Rate limiter for booking hold reservations
 * Prevents denial-of-inventory attacks / automated seat-hoarding bots
 */
export const bookingHoldLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 hold attempts per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkipInTests,
  message: {
    success: false,
    message: 'Too many seat reservation requests. Please try again later.',
  },
  statusCode: 429,
});

/**
 * Global rate limiter for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: shouldSkipInTests,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  statusCode: 429,
});
