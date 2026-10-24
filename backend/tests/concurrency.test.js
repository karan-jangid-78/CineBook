import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './setup.js';
import { User } from '../src/models/User.js';
import { Movie } from '../src/models/Movie.js';
import { Cinema } from '../src/models/Cinema.js';
import { Show } from '../src/models/Show.js';
import { SeatReservation } from '../src/models/SeatReservation.js';
import { Booking } from '../src/models/Booking.js';
import { cleanupExpiredHolds } from '../src/services/reservationService.js';

describe('Concurrency & Core Booking Engine', () => {
  let user1Token, user1Id;
  let user2Token, user2Id;
  let testMovie, testCinema, testShow;

  beforeAll(async () => {
    await setupTestDB();
  }, 35000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // Create User 1
    const u1 = await User.create({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123',
    });
    user1Id = u1._id.toString();

    // Create User 2
    const u2 = await User.create({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123',
    });
    user2Id = u2._id.toString();

    // Get Auth Tokens
    const login1 = await request(app).post('/api/auth/login').send({
      email: 'user1@example.com',
      password: 'password123',
    });
    user1Token = login1.body.data.token;

    const login2 = await request(app).post('/api/auth/login').send({
      email: 'user2@example.com',
      password: 'password123',
    });
    user2Token = login2.body.data.token;

    // Create Sample Movie
    testMovie = await Movie.create({
      title: 'Dune: Part Two',
      description: 'Epic Sci-Fi sequel',
      genre: ['Sci-Fi', 'Adventure'],
      duration: 166,
      releaseDate: new Date(),
      rating: 8.8,
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600',
    });

    // Create Sample Cinema
    testCinema = await Cinema.create({
      name: 'CineBook PVR Superplex',
      location: 'Nexus Mall',
      city: 'Bangalore',
      screens: [{ name: 'Screen 1 IMAX', totalSeats: 60 }],
    });

    // Create Sample Show
    testShow = await Show.create({
      movie: testMovie._id,
      cinema: testCinema._id,
      screenName: 'Screen 1 IMAX',
      startTime: new Date(Date.now() + 3600000), // 1 hour in future
      endTime: new Date(Date.now() + 10000000),
      pricing: { standard: 200, premium: 350, vip: 500 },
      totalSeats: 60,
    });
  });

  // Test 1: Successful reservation of an available seat
  it('1. successfully reserves an available seat and creates HELD status in DB', async () => {
    const res = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow._id.toString(),
        seats: ['A1'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservationId).toBeDefined();
    expect(res.body.data.seats).toHaveLength(1);
    expect(res.body.data.seats[0].seatNumber).toBe('A1');

    // Verify database state directly
    const dbReservation = await SeatReservation.findOne({
      show: testShow._id,
      seatNumber: 'A1',
      status: 'HELD',
    });
    expect(dbReservation).not.toBeNull();
    expect(dbReservation.user.toString()).toBe(user1Id);
  });

  // Test 2: Rejection of a second reservation for the same occupied seat
  it('2. rejects a second sequential reservation for the same occupied seat with 409 Conflict', async () => {
    // User 1 reserves A1
    await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: testShow._id.toString(),
        seats: ['A1'],
      });

    // User 2 attempts to reserve A1
    const res = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        showId: testShow._id.toString(),
        seats: ['A1'],
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    // Verify in database: exactly ONE active reservation exists for A1
    const activeReservations = await SeatReservation.find({
      show: testShow._id,
      seatNumber: 'A1',
      status: { $in: ['HELD', 'CONFIRMED'] },
    });
    expect(activeReservations).toHaveLength(1);
    expect(activeReservations[0].user.toString()).toBe(user1Id);
  });

  // Test 3: Two simultaneous requests competing for the same last seat
  it('3. handles two simultaneous requests competing for the same seat: exactly 1 succeeds, 1 fails with 409', async () => {
    const targetSeat = 'B5';

    const req1 = request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: [targetSeat] });

    const req2 = request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ showId: testShow._id.toString(), seats: [targetSeat] });

    // Fire both requests at the exact same time
    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    // One must be 201 (Created), the other must be 409 (Conflict)
    expect(statuses).toEqual([201, 409]);

    // Check database state: exactly ONE active reservation must exist
    const activeSeats = await SeatReservation.find({
      show: testShow._id,
      seatNumber: targetSeat,
      status: { $in: ['HELD', 'CONFIRMED'] },
    });
    expect(activeSeats).toHaveLength(1);
  });

  // Test 4: One hundred concurrent requests competing for the same seat
  it('4. handles 100 concurrent requests competing for the same seat: at most ONE succeeds and exactly 1 in DB', async () => {
    const targetSeat = 'C4';
    const totalRequests = 100;

    // Fire 100 concurrent requests
    const promises = Array.from({ length: totalRequests }).map((_, i) => {
      // Alternate tokens between users
      const token = i % 2 === 0 ? user1Token : user2Token;
      return request(app)
        .post('/api/bookings/reserve')
        .set('Authorization', `Bearer ${token}`)
        .send({ showId: testShow._id.toString(), seats: [targetSeat] });
    });

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    // EXACTLY 1 request must have succeeded
    expect(successful.length).toBe(1);
    // The other 99 requests must have failed with 409 Conflict
    expect(conflicts.length).toBe(totalRequests - 1);

    // CRITICAL DATABASE VERIFICATION:
    const activeInDb = await SeatReservation.find({
      show: testShow._id,
      seatNumber: targetSeat,
      status: { $in: ['HELD', 'CONFIRMED'] },
    });
    expect(activeInDb).toHaveLength(1);
  });

  // Test 5: A multi-seat request failing without leaving partial reservations (All-or-Nothing Atomicity)
  it('5. multi-seat request fails atomically without leaving partial reservations if one seat is unavailable', async () => {
    // User 1 occupies 'D2'
    await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: ['D2'] });

    // User 2 attempts to reserve batch ['D1', 'D2', 'D3']
    const res = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ showId: testShow._id.toString(), seats: ['D1', 'D2', 'D3'] });

    // Must be rejected with 409 Conflict
    expect(res.status).toBe(409);

    // Verify database state: D1 and D3 must NOT have been left in database!
    const d1 = await SeatReservation.findOne({ show: testShow._id, seatNumber: 'D1' });
    const d3 = await SeatReservation.findOne({ show: testShow._id, seatNumber: 'D3' });
    expect(d1).toBeNull();
    expect(d3).toBeNull();

    // Only D2 should exist, belonging to User 1
    const d2 = await SeatReservation.findOne({ show: testShow._id, seatNumber: 'D2' });
    expect(d2).not.toBeNull();
    expect(d2.user.toString()).toBe(user1Id);
  });

  // Test 6: An expired hold becoming available again
  it('6. an expired hold becomes available again for new reservations', async () => {
    const targetSeat = 'E1';

    // Create a hold that expired 10 minutes ago
    const reservationId = new mongoose.Types.ObjectId().toString();
    await SeatReservation.create({
      show: testShow._id,
      seatNumber: targetSeat,
      tier: 'vip',
      price: 500,
      user: new mongoose.Types.ObjectId(user1Id),
      reservationId,
      status: 'HELD',
      expiresAt: new Date(Date.now() - 600000), // 10 minutes ago
    });

    // Now User 2 tries to reserve E1
    const res = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ showId: testShow._id.toString(), seats: [targetSeat] });

    // Should succeed because previous hold expired!
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Active reservation in DB should now belong to User 2
    const currentActive = await SeatReservation.findOne({
      show: testShow._id,
      seatNumber: targetSeat,
      status: 'HELD',
    });
    expect(currentActive.user.toString()).toBe(user2Id);
  });

  // Test 7: An old expiration cleanup not releasing a newer reservation
  it('7. delayed cleanup worker does not accidentally release a newer reservation on the same seat', async () => {
    const targetSeat = 'E2';

    // User 1 had an expired reservation in the past
    await SeatReservation.create({
      show: testShow._id,
      seatNumber: targetSeat,
      tier: 'vip',
      price: 500,
      user: new mongoose.Types.ObjectId(user1Id),
      reservationId: new mongoose.Types.ObjectId().toString(),
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 300000),
    });

    // User 2 creates a fresh reservation right now (expires in 5 minutes)
    const newReservationId = new mongoose.Types.ObjectId().toString();
    const futureExpiresAt = new Date(Date.now() + 300000);
    const user2Reservation = await SeatReservation.create({
      show: testShow._id,
      seatNumber: targetSeat,
      tier: 'vip',
      price: 500,
      user: new mongoose.Types.ObjectId(user2Id),
      reservationId: newReservationId,
      status: 'HELD',
      expiresAt: futureExpiresAt,
    });

    // Now simulate a delayed background cleanup job executing
    await cleanupExpiredHolds();

    // Verify User 2's reservation is STILL HELD and was NOT touched by the cleaner!
    const verified = await SeatReservation.findById(user2Reservation._id);
    expect(verified.status).toBe('HELD');
    expect(verified.expiresAt.getTime()).toBe(futureExpiresAt.getTime());
  });

  // Test 8: Repeated confirmation not creating duplicate bookings (Idempotency)
  it('8. repeated confirmation requests are idempotent and do not create duplicate bookings', async () => {
    // User 1 reserves seats
    const holdRes = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: ['B1', 'B2'] });

    const reservationId = holdRes.body.data.reservationId;

    // First confirmation call
    const confirm1 = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        reservationId,
        paymentDetails: { method: 'SIMULATED_CARD' },
      });

    expect(confirm1.status).toBe(201);
    expect(confirm1.body.data.booking.bookingReference).toBeDefined();

    // Second confirmation call with identical reservationId (simulating double-click or network retry)
    const confirm2 = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        reservationId,
        paymentDetails: { method: 'SIMULATED_CARD' },
      });

    // Should return 200 OK with the existing booking
    expect(confirm2.status).toBe(200);
    expect(confirm2.body.data.idempotent).toBe(true);
    expect(confirm2.body.data.booking.bookingReference).toBe(confirm1.body.data.booking.bookingReference);

    // Database verification: EXACTLY ONE booking document exists
    const bookingsInDb = await Booking.find({ reservationId });
    expect(bookingsInDb).toHaveLength(1);
  });

  // Test 9: A user being unable to confirm or cancel another user's reservation
  it('9. prevents a user from confirming or releasing another user reservation (403 Forbidden)', async () => {
    // User 1 reserves a seat
    const holdRes = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: ['A5'] });

    const reservationId = holdRes.body.data.reservationId;

    // User 2 attempts to release User 1's reservation
    const releaseAttempt = await request(app)
      .post('/api/bookings/release')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ reservationId });

    expect(releaseAttempt.status).toBe(403);

    // User 2 attempts to confirm User 1's reservation
    const confirmAttempt = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        reservationId,
        paymentDetails: { method: 'SIMULATED_CARD' },
      });

    expect(confirmAttempt.status).toBe(403);
  });

  // Test 10: Booking persistence after refresh and subsequent API requests
  it('10. verifies booking persists and can be queried via /my-bookings and /:id', async () => {
    // Hold and confirm seats
    const holdRes = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: ['C1'] });

    const reservationId = holdRes.body.data.reservationId;

    const confirmRes = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ reservationId });

    const bookingId = confirmRes.body.data.booking._id;

    // Fetch single booking
    const getRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.bookingReference).toBe(confirmRes.body.data.booking.bookingReference);
    expect(getRes.body.data.seats[0].seatNumber).toBe('C1');

    // Fetch my-bookings list
    const myListRes = await request(app)
      .get('/api/bookings/my-bookings')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(myListRes.status).toBe(200);
    expect(myListRes.body.count).toBeGreaterThanOrEqual(1);
    expect(myListRes.body.data[0]._id).toBe(bookingId);
  });

  // Test 11: Appropriate errors for invalid input and unavailable seats
  it('11. returns 400 Bad Request for missing or invalid parameters', async () => {
    // Missing seats array
    const res1 = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ showId: testShow._id.toString(), seats: [] });
    expect(res1.status).toBe(400);

    // Missing showId
    const res2 = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ seats: ['A1'] });
    expect(res2.status).toBe(400);

    // Invalid non-existent showId
    const res3 = await request(app)
      .post('/api/bookings/reserve')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        showId: new mongoose.Types.ObjectId().toString(),
        seats: ['A1'],
      });
    expect(res3.status).toBe(404);
  });
});
