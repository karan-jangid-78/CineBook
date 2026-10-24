# CineBook: Concurrency-Safe Seat Reservation Engineering Guide

> **Target Audience:** BTech Freshers preparing for Software Development Engineer (SDE) placement interviews.
> This document explains the exact race condition problem, why naive solutions fail, and how CineBook achieves 100% database-enforced concurrency safety.

---

## 1. What is the Race Condition?

In a high-demand movie ticket booking system (e.g., BookMyShow, Ticketmaster), popular shows frequently sell out in seconds.
Imagine a scenario where **Seat C4 is the last remaining seat** for a blockbuster show:

1. **User A** views the seat map at 10:00:00.000 AM and sees Seat C4 is green (Available).
2. **User B** views the seat map at 10:00:00.001 AM and also sees Seat C4 is green (Available).
3. Both users click Seat C4 and hit "Proceed to Checkout" at nearly the exact same millisecond:
   - **Request 1 (User A):** `POST /api/bookings/reserve` with `{ showId: "...", seats: ["C4"] }`
   - **Request 2 (User B):** `POST /api/bookings/reserve` with `{ showId: "...", seats: ["C4"] }`

Without strict concurrency control, both requests would read that the seat is unoccupied, both would insert hold documents, and the customer would suffer double-booking.

---

## 2. Why Checking Availability in the Frontend is Insufficient

A common beginner mistake in interview answers is saying:
*"We disable the seat button in the React UI once someone clicks it."*

### Why this fails:
1. **Time-of-Check to Time-of-Use (TOCTOU):** The network latency between the browser and server is typically 50ms–200ms. By the time User A's browser tells User B's browser that the seat is taken, User B's HTTP request has already been dispatched.
2. **Untrusted Client:** Malicious actors or automated booking bots do not use the browser UI—they send direct HTTP API calls via `curl`, Postman, or custom scripts.
3. **Frontend State is Only a Snapshot:** The client's React state is merely an asynchronous cached view of past database state. **Only the database can serve as the single source of truth.**

---

## 3. How CineBook Guarantees Concurrency Safety

CineBook implements a **defense-in-depth, database-enforced reservation strategy**:

### A. MongoDB Partial Unique Index (The Core Shield)

In `backend/src/models/SeatReservation.js`:

```javascript
seatReservationSchema.index(
  { show: 1, seatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['HELD', 'CONFIRMED'] }
    }
  }
);
```

#### Why a Partial Unique Index?
- **Uniqueness Guarantee:** For any given `(show, seatNumber)`, MongoDB strictly forbids more than **one** document with status `HELD` or `CONFIRMED`.
- If User A and User B race at the exact same millisecond, MongoDB's WiredTiger storage engine handles page latches and writes:
  - The first insert succeeds.
  - The second insert is **instantly rejected** at the database level with error code `11000 (Duplicate Key Error)`.
- **Reusability:** If a seat was held previously but later expired or canceled (status becomes `EXPIRED` or `RELEASED`), it **no longer matches the filter** `{ status: { $in: ['HELD', 'CONFIRMED'] } }`. Therefore, it no longer violates uniqueness, allowing another user to reserve it cleanly!

---

## 4. Multi-Seat Atomicity (All-or-Nothing)

**Problem:** User A requests three seats together: `['C3', 'C4', 'C5']`.
Suppose `C3` and `C5` are free, but someone else claims `C4` concurrently.
If partial reservations were allowed, User A would be charged for two non-adjacent seats, or `C3` and `C5` would remain locked as orphaned holds.

**CineBook's Solution:**
1. **MongoDB Replica Set Transactions:**
   - The multi-seat batch is executed within `session.withTransaction(...)`.
   - If any seat fails or triggers error `11000`, the transaction is immediately aborted via `session.abortTransaction()`.
2. **Compensating Rollback Fallback (for Standalone Mongo):**
   - If running on a standalone database without replica set, CineBook uses an ordered insert grouped under a unique `reservationId`.
   - If a duplicate key error is caught, the service executes `SeatReservation.deleteMany({ reservationId })` before returning HTTP `409 Conflict`.
- **Guarantee:** **Either all requested seats are successfully held, or none are.**

---

## 5. Temporary Holds (5-Minute Countdown) and Safe Expiration

When seats are held:
- `status: 'HELD'`
- `expiresAt: new Date(Date.now() + 5 * 60 * 1000)` (5 minutes)

### Preventing the Delayed Cleanup Race Condition
Consider this tricky interview edge case:
1. User A holds Seat `D1` from 10:00 to 10:05.
2. At 10:05:01, Seat `D1` expires.
3. At 10:05:02, User B quickly reserves Seat `D1`, valid until 10:10.
4. A delayed cleanup worker from 10:05 wakes up at 10:05:03. **Will it accidentally release User B's new reservation?**

**NO.** In CineBook, the expiration query is strictly conditional on timestamp:

```javascript
await SeatReservation.updateMany(
  {
    status: 'HELD',
    expiresAt: { $lt: new Date() } // Only documents whose expiration timestamp is strictly in the past!
  },
  {
    $set: { status: 'EXPIRED' }
  }
);
```

Because User B's reservation has `expiresAt: 10:10` (which is > current time 10:05:03), the condition evaluates to `false`. **User B's reservation is completely safe.**

---

## 6. Repeated Confirmation & Idempotency

**Problem:** A user clicks "Confirm & Pay" multiple times rapidly, or an unstable network retries the request.

**CineBook's Solution:**
1. In `backend/src/models/Booking.js`, `reservationId` is indexed with `unique: true`.
2. In `bookingService.confirmBooking(...)`:
   - Before attempting to insert, it checks if a `Booking` document already exists for `reservationId`.
   - If found, it immediately returns the existing booking with HTTP `200 OK` and `{ idempotent: true }`.
   - It verifies that the requesting user matches the reservation owner (`403 Forbidden` if mismatched).
- **Guarantee:** Exactly **one** booking and **one** payment record can ever exist per reservation session.

---

## 7. Automated Concurrency Test Results

The test suite runs against an isolated in-memory replica set (`backend/tests/concurrency.test.js`):

| Test Case | Scenario | Expected Behavior | Actual Result |
|---|---|---|---|
| **Test 1** | Available seat booking | 201 Created, HELD in DB | ✅ Passed |
| **Test 2** | Sequential double-booking | Second gets 409 Conflict | ✅ Passed |
| **Test 3** | Two simultaneous requests | 1 succeeds (201), 1 fails (409) | ✅ Passed |
| **Test 4** | **100 concurrent requests** competing for 1 seat | **Exactly 1 succeeds, 99 fail with 409, 1 in DB** | ✅ Passed |
| **Test 5** | Multi-seat partial failure | Batch rolled back, 0 orphaned seats in DB | ✅ Passed |
| **Test 6** | Expired hold re-reservation | Released seat becomes available again | ✅ Passed |
| **Test 7** | Delayed cleanup safety | Newer reservation is untouched | ✅ Passed |
| **Test 8** | Double confirmation retry | Idempotent 200 OK, 1 booking in DB | ✅ Passed |
| **Test 9** | Cross-user tampering | 403 Forbidden on foreign reservation | ✅ Passed |
| **Test 10** | Persistence after reload | Booking persists and queries correctly | ✅ Passed |
| **Test 11** | Input validation | 400 Bad Request on invalid parameters | ✅ Passed |

---

## 8. Summary for Placement Interviews

When asked: *"How did you handle concurrency in your movie booking project?"*
Answer in 3 concise points:
1. **Database-level uniqueness:** *"We used a MongoDB Partial Unique Index on `{ show: 1, seatNumber: 1 }` filtered on `{ status: { $in: ['HELD', 'CONFIRMED'] } }`. This offloads race condition locking to the storage engine, rejecting conflicts with HTTP 409."*
2. **Multi-seat atomicity:** *"We wrapped multi-seat reservations in MongoDB transactions with compensating rollback to guarantee that either all requested seats are reserved or none are."*
3. **Timestamp-enforced cleanup:** *"Seat holds last 5 minutes. Background and lazy cleanups check `expiresAt < now`, ensuring a delayed cleanup worker can never accidentally release a newer reservation on the same seat."*
