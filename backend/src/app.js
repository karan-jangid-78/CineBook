import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import showRoutes from './routes/showRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Trust reverse proxy (e.g. Render, Vercel, Nginx) so client IP is accurately extracted
app.set('trust proxy', 1);

// Configure environment-driven CORS allowlist
const allowedOrigins = new Set([
  ...config.clientUrls,
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')] : []),
  ...(config.nodeEnv !== 'production'
    ? [
        'http://localhost:5173',
        'http://localhost:5000',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:3000',
      ]
    : []),
]);

const corsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  const options = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-test-rate-limit'],
  };

  // 1. Allow requests with no origin (e.g. curl, mobile apps, server-to-server)
  if (!origin) {
    options.origin = true;
    return callback(null, options);
  }

  const normalized = origin.replace(/\/+$/, '');
  const host = req.headers.host;
  const isSameHost = host && (origin === `http://${host}` || origin === `https://${host}`);
  const isRenderUrl = process.env.RENDER_EXTERNAL_URL && normalized === process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');

  // 2. Allow if origin matches configured allowed client URLs, local dev servers, same-host, or Render domain
  if (allowedOrigins.has(normalized) || isSameHost || isRenderUrl) {
    options.origin = true;
    return callback(null, options);
  }

  return callback(new Error(`CORS policy rejection: Origin "${origin}" is not in the allowed list.`));
};

// Middleware
app.use(cors(corsDelegate));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global API rate limiting
app.use('/api', apiLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CineBook API',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);

// Serve Frontend Static Build if available (Unified full-stack deployment)
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 Route Not Found for unhandled /api requests
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
