# 🎬 CineBook — Full-Stack MERN Movie Ticket Booking Application

[![Node.js](https://img.shields.io/badge/Node.js-v24.21-339933?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-17%20Passed-FCC72B?logo=vitest)](https://vitest.dev/)

> **A portfolio project engineered for BTech software placement interviews.**
> Demonstrates production-grade full-stack architecture, clean code practices, and **database-enforced concurrency control** to prevent double-booking race conditions.

---

## 🌟 Key Features

1. **Dark Cinematic Interface**: Designed with custom palette (`#0B0F19`, gold accents, glassmorphism), fluid animations, and responsive mobile/desktop layouts.
2. **Interactive Seat Selection Map**:
   - Curved screen indicator (`All eyes this way — Cinema Screen`).
   - Standard (₹220), Premium (₹350), and VIP Recliner (₹520) tiers.
   - Distinct states: Available, Selected, Held by another user (amber), and Booked (gray).
3. **Concurrency-Safe Seat Reservation**:
   - MongoDB **Partial Unique Index** guarantees at most ONE active hold or booking per seat.
   - Rejects concurrent collisions with HTTP `409 Conflict`.
   - Tested under **100 concurrent requests** competing for the exact same seat.
4. **Multi-Seat Atomicity**: All-or-nothing semantics—if any seat in a requested batch is unavailable, all other seats are rolled back.
5. **5-Minute Reservation Holds**: Real-time visual countdown timer; auto-expires abandoned holds.
6. **Delayed Cleanup Race Prevention**: Safe timestamp-based cleanup queries prevent an older delayed worker from accidentally killing a newer customer's reservation.
7. **Simulated Payment & Idempotency**:
   - Clear simulated sandbox badge (no real credit cards charged).
   - Unique `reservationId` constraint prevents duplicate charges and repeated confirmations.
8. **Digital Ticket Voucher & History**: Downloadable/printable confirmed tickets with reference codes and past vs. upcoming booking tabs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide React Icons |
| **Backend** | Node.js (ES Modules), Express.js, MongoDB, Mongoose ODM |
| **Security** | JWT Authentication, `bcryptjs` password hashing, sanitized inputs |
| **Database** | Supports local MongoDB, MongoDB Atlas, and **Auto Zero-Config Embedded MongoDB Replica Set** |
| **Testing** | Vitest, Supertest, MongoMemoryReplSet |

---

## 🚀 Quick Start Guide (Windows)

> **Zero-Configuration Setup:** CineBook automatically starts an embedded MongoDB Replica Set if no local MongoDB service is running on your machine. You do not need to install MongoDB Atlas or local service to run and test!

### 1. Clone & Navigate to Project
```powershell
cd "c:\Users\hp\Desktop\ticket project"
```

### 2. Start Backend API Server
Open a PowerShell terminal:
```powershell
cd backend
npm.cmd install        # (Already installed in workspace)
npm.cmd run seed       # Seeds sample movies, cinemas, shows, and demo users
npm.cmd run dev        # Starts backend on http://localhost:5000
```

### 3. Start Frontend Client
Open a second PowerShell terminal:
```powershell
cd frontend
npm.cmd install        # (Already installed in workspace)
npm.cmd run dev        # Starts Vite dev server on http://localhost:5173
```

Open your browser to: **`http://localhost:5173`**

---

## 🧪 Running Automated Tests

Run the full automated test suite (including the **100-concurrent-requests test**):

```powershell
cd backend
npm.cmd test
```

### Actual Test Execution Output
```text
Test Files  2 passed (2)
     Tests  17 passed (17)
  Duration  8.05s

✓ auth.test.js (6 tests)
  ✓ 1. registers a new user with valid data and returns JWT token
  ✓ 2. rejects registration with duplicate email address with 409 Conflict
  ✓ 3. rejects registration with password shorter than 6 characters
  ✓ 4. successfully logs in with valid credentials
  ✓ 5. rejects login with incorrect password with 401 Unauthorized
  ✓ 6. retrieves authenticated user profile via /api/auth/me

✓ concurrency.test.js (11 tests)
  ✓ 1. successfully reserves an available seat and creates HELD status in DB
  ✓ 2. rejects a second sequential reservation for the same occupied seat with 409 Conflict
  ✓ 3. handles two simultaneous requests competing for the same seat: exactly 1 succeeds, 1 fails with 409
  ✓ 4. handles 100 concurrent requests competing for the same seat: at most ONE succeeds and exactly 1 in DB
  ✓ 5. multi-seat request fails atomically without leaving partial reservations if one seat is unavailable
  ✓ 6. an expired hold becomes available again for new reservations
  ✓ 7. delayed cleanup worker does not accidentally release a newer reservation on the same seat
  ✓ 8. repeated confirmation requests are idempotent and do not create duplicate bookings
  ✓ 9. prevents a user from confirming or releasing another user reservation (403 Forbidden)
  ✓ 10. verifies booking persists and can be queried via /my-bookings and /:id
  ✓ 11. returns 400 Bad Request for missing or invalid parameters
```

---

## 🔑 Demo Credentials

For quick evaluation, click the **"Demo Login"** button in the navbar or on the login page:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Demo User** | `john@example.com` | `password123` | Browsing, Reserving, Simulated Checkout, My Bookings |
| **Demo Admin** | `admin@cinebook.com` | `admin123` | Administrative access |
| **New User** | Register freely via UI | Min 6 chars | Standard user access |

---

## 📂 Project Architecture

```text
ticket project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # Auto-detects local Mongo or embedded Replica Set
│   │   │   └── env.js                  # Environment variable configuration
│   │   ├── models/
│   │   │   ├── User.js                 # User schema with bcrypt password hashing
│   │   │   ├── Movie.js                # Movie schema with genres, duration, posters
│   │   │   ├── Cinema.js               # Cinema and screens schema
│   │   │   ├── Show.js                 # Showtimes and tier pricing schema
│   │   │   ├── SeatReservation.js      # Core partial unique index concurrency model
│   │   │   └── Booking.js              # Idempotent booking model with payment details
│   │   ├── services/
│   │   │   └── reservationService.js   # Concurrency-safe holds, atomic multi-seat, cleanup
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, login, profile
│   │   │   ├── movieController.js      # Catalog and search
│   │   │   ├── showController.js       # Show queries & real-time seat availability
│   │   │   └── bookingController.js    # Reserve, release, confirm, history
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT Bearer token authentication
│   │   │   └── errorHandler.js         # Centralized error handler (400, 401, 409, 500)
│   │   ├── routes/                     # Express route definitions
│   │   ├── seed/
│   │   │   ├── seedData.js             # Realistic sample movies, cinemas, shows
│   │   │   └── seed.js                 # Repeatable database seeder
│   │   ├── app.js                      # Express configuration & health check
│   │   └── server.js                   # Server bootstrap & background cleanup timer
│   └── tests/
│       ├── setup.js                    # Isolated MongoMemoryReplSet test runner
│       ├── auth.test.js                # Auth test suite
│       └── concurrency.test.js         # 100-request concurrency stress test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Header with active hold timer & demo login
│   │   │   ├── Footer.jsx              # Footer with architecture highlights
│   │   │   ├── MovieCard.jsx           # Poster card with ratings and genres
│   │   │   ├── SeatMap.jsx             # Interactive curved seat grid with tiers
│   │   │   ├── ReservationTimer.jsx    # Real-time 5-minute countdown bar
│   │   │   └── LoadingSpinner.jsx      # Cinematic loader
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # User auth state & 1-click demo login
│   │   │   └── BookingContext.jsx      # Active hold state & countdown synchronization
│   │   ├── pages/
│   │   │   ├── HomePage.jsx            # Featured hero, search, and genre filters
│   │   │   ├── MovieDetailsPage.jsx    # Movie details, date selector, showtimes
│   │   │   ├── SeatSelectionPage.jsx   # Seat selection with real-time lock flow
│   │   │   ├── CheckoutPage.jsx        # Simulated payment sandbox & breakdown
│   │   │   ├── ConfirmationPage.jsx    # Printable ticket voucher pass
│   │   │   ├── LoginPage.jsx           # Sign in with 1-click demo buttons
│   │   │   ├── RegisterPage.jsx        # Registration form
│   │   │   └── MyBookingsPage.jsx      # Upcoming & past booking history
│   │   ├── services/
│   │   │   └── api.js                  # Axios instance with JWT interceptor
│   │   ├── App.jsx                     # Route definitions & ProtectedRoutes
│   │   ├── main.jsx                    # Application entry point
│   │   └── index.css                   # Tailwind styles, glassmorphism, screen curves
│   ├── index.html                      # HTML entry with cinematic fonts
│   ├── vite.config.js                  # Vite configuration with /api proxy
│   └── tailwind.config.js              # Cinematic dark theme tokens
│
├── CONCURRENCY_EXPLAINED.md            # SDE interview guide on race conditions
└── README.md                           # Documentation & quick start guide
```

---

## 🎯 Files to Study First for Placement Interviews

1. [`backend/src/models/SeatReservation.js`](file:///c:/Users/hp/Desktop/ticket%20project/backend/src/models/SeatReservation.js): Study the **partial unique index** that stops race conditions at the database layer.
2. [`backend/src/services/reservationService.js`](file:///c:/Users/hp/Desktop/ticket%20project/backend/src/services/reservationService.js): Study `createSeatHold` (atomic multi-seat lock), `cleanupExpiredHolds` (timestamp-safe delayed release), and `confirmBooking` (idempotent confirmation).
3. [`backend/tests/concurrency.test.js`](file:///c:/Users/hp/Desktop/ticket%20project/backend/tests/concurrency.test.js): Study Test 4 (100 concurrent requests competing for 1 seat) and Test 5 (all-or-nothing rollback).
4. [`CONCURRENCY_EXPLAINED.md`](file:///c:/Users/hp/Desktop/ticket%20project/CONCURRENCY_EXPLAINED.md): Read this before your interview to explain race conditions, TOCTOU, and database guarantees clearly.
