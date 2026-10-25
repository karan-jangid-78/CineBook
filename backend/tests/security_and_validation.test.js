import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './setup.js';
import { User } from '../src/models/User.js';
import { Movie } from '../src/models/Movie.js';
import { Cinema } from '../src/models/Cinema.js';
import { Show } from '../src/models/Show.js';
import { validateEnv, config } from '../src/config/env.js';

describe('Security, Validation & Production Configuration Guards', () => {
  let authToken, testUser, testShow;

  beforeAll(async () => {
    await setupTestDB();
  }, 35000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Create test user
    testUser = await User.create({
      name: 'Security Test User',
      email: 'security@example.com',
      password: 'password123',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'security@example.com',
      password: 'password123',
    });
    authToken = loginRes.body.data.token;

    // Create test movie, cinema, show
    const movie = await Movie.create({
      title: 'Inception',
      description: 'Dream within a dream',
      genre: ['Sci-Fi', 'Action'],
      duration: 148,
      releaseDate: new Date(),
      rating: 8.8,
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600',
    });

    const cinema = await Cinema.create({
      name: 'Test Cinema Superplex',
      location: 'City Center',
      city: 'Bangalore',
      screens: [{ name: 'Screen 1', totalSeats: 60 }],
    });

    testShow = await Show.create({
      movie: movie._id,
      cinema: cinema._id,
      screenName: 'Screen 1',
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 10000000),
      pricing: { standard: 200, premium: 350, vip: 500 },
      totalSeats: 60,
    });
  });

  // =========================================================================
  // SECTION 1: Backend Seat & Request Validation
  // =========================================================================
  describe('Backend Seat & Request Validation', () => {
    it('1. rejects reservation requests with more than 8 seats with 400 Bad Request', async () => {
      // 9 seats: exceeds maximum limit
      const nineSeats = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
      const res = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: testShow._id.toString(),
          seats: nineSeats,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/maximum of 8 seats/i);
    });

    it('2. rejects reservation requests with malformed seat identifiers with 400 Bad Request', async () => {
      const invalidSeatsList = [
        ['Z99'],       // Invalid row 'Z'
        ['A0'],        // Invalid column '0'
        ['A11'],       // Column out of range (hall has 1-10)
        [''],          // Empty string
        ['INVALID'],   // Non-seat string
      ];

      for (const invalidSeats of invalidSeatsList) {
        const res = await request(app)
          .post('/api/bookings/reserve')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            showId: testShow._id.toString(),
            seats: invalidSeats,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Invalid seat number/i);
      }
    });

    it('3. rejects reservation requests containing duplicate seats in the payload with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: testShow._id.toString(),
          seats: ['B3', 'B3'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Duplicate seats/i);
    });

    it('4. rejects reservation requests with an invalid showId format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: 'not-a-valid-mongo-object-id',
          seats: ['C1'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid showId format/i);
    });

    it('5. rejects reservation requests with an empty or non-array seats payload with 400 Bad Request', async () => {
      const res1 = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: testShow._id.toString(),
          seats: [],
        });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: testShow._id.toString(),
          seats: 'A1', // Not an array
        });
      expect(res2.status).toBe(400);
    });

    it('6. successfully accepts up to 8 valid seats (including case-insensitive input) with 201 Created', async () => {
      const validSeats = ['a1', 'b2', 'c3', 'd4']; // Lowercase should be normalized
      const res = await request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          showId: testShow._id.toString(),
          seats: validSeats,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seats).toHaveLength(4);
      expect(res.body.data.seats.map((s) => s.seatNumber)).toEqual(['A1', 'B2', 'C3', 'D4']);
    });
  });

  // =========================================================================
  // SECTION 2: Rate Limiting Enforcement
  // =========================================================================
  describe('Rate Limiting Protection', () => {
    it('7. returns HTTP 429 Too Many Requests when rate limiting threshold is exceeded', async () => {
      // authLimiter threshold is 15 requests per 15 minutes.
      // We pass the header 'x-test-rate-limit': 'true' to activate enforcement in test mode.
      const attempts = [];
      for (let i = 0; i < 16; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .set('x-test-rate-limit', 'true')
            .send({ email: 'security@example.com', password: 'wrongpassword' })
        );
      }

      const results = await Promise.all(attempts);
      const rateLimited = results.filter((r) => r.status === 429);

      // At least one request must have been rejected with 429 Too Many Requests
      expect(rateLimited.length).toBeGreaterThanOrEqual(1);
      const res429 = rateLimited[0];
      expect(res429.body.success).toBe(false);
      expect(res429.body.message).toMatch(/Too many authentication attempts/i);
    });
  });

  // =========================================================================
  // SECTION 3: CORS Allowlist Behavior
  // =========================================================================
  describe('CORS Allowlist Behavior', () => {
    it('8. permits requests from allowed local development origins with CORS headers', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('9. permits requests with no origin header (same-origin, curl, server-to-server)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('10. rejects requests from unauthorized foreign origins with CORS error', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://unauthorized-attacker-site.com');

      // Unauthorized origin fails CORS policy
      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/CORS policy rejection/i);
    });
  });

  // =========================================================================
  // SECTION 4: Production Environment Startup Guards
  // =========================================================================
  describe('Production Environment Configuration Guards', () => {
    const originalEnv = { ...config };

    afterEach(() => {
      // Restore original configuration after each test
      config.nodeEnv = originalEnv.nodeEnv;
      config.mongoUri = originalEnv.mongoUri;
      config.jwtSecret = originalEnv.jwtSecret;
    });

    it('11. throws a fatal startup error if NODE_ENV=production and MONGO_URI is missing or points to localhost', () => {
      config.nodeEnv = 'production';
      config.mongoUri = '';

      expect(() => validateEnv()).toThrow(/In production mode, a valid persistent MONGO_URI/i);

      config.mongoUri = 'mongodb://127.0.0.1:27017/cinebook';
      expect(() => validateEnv()).toThrow(/In production mode, a valid persistent MONGO_URI/i);
    });

    it('12. throws a fatal startup error if NODE_ENV=production and JWT_SECRET is missing or uses default dev secret', () => {
      config.nodeEnv = 'production';
      config.mongoUri = 'mongodb+srv://user:pass@cluster0.mongodb.net/cinebook?retryWrites=true&w=majority';
      config.jwtSecret = '';

      expect(() => validateEnv()).toThrow(/In production mode, a secure, unique JWT_SECRET/i);

      config.jwtSecret = 'cinebook_secret_key_jwt_2026_portfolio_secure';
      expect(() => validateEnv()).toThrow(/In production mode, a secure, unique JWT_SECRET/i);
    });

    it('13. validates successfully when production configurations are correctly set', () => {
      config.nodeEnv = 'production';
      config.mongoUri = 'mongodb+srv://admin:securepass@cluster0.mongodb.net/cinebook?retryWrites=true&w=majority';
      config.jwtSecret = 'a_very_strong_production_random_secret_string_12345';

      expect(() => validateEnv()).not.toThrow();
    });
  });
});
