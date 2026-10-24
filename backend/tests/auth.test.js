import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearCollections } from './setup.js';
import { User } from '../src/models/User.js';

describe('Authentication & User Flow', () => {
  beforeAll(async () => {
    await setupTestDB();
  }, 30000);

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it('1. registers a new user with valid data and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Wonder',
        email: 'alice@example.com',
        password: 'securepassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.name).toBe('Alice Wonder');

    // Verify user in database
    const userInDb = await User.findOne({ email: 'alice@example.com' });
    expect(userInDb).not.toBeNull();
    expect(userInDb.password).not.toBe('securepassword123'); // Password must be hashed!
  });

  it('2. rejects registration with duplicate email address with 409 Conflict', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Alice First',
      email: 'alice@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Second',
      email: 'alice@example.com',
      password: 'anotherpassword',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('3. rejects registration with password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. successfully logs in with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'mypassword123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'charlie@example.com',
      password: 'mypassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.name).toBe('Charlie');
  });

  it('5. rejects login with incorrect password with 401 Unauthorized', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'mypassword123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'charlie@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('6. retrieves authenticated user profile via /api/auth/me', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Dave',
      email: 'dave@example.com',
      password: 'mypassword123',
    });

    const token = regRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('dave@example.com');
  });
});
