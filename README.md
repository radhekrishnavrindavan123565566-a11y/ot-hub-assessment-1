# OT Hub — Sundar Precision Works

A full-stack MERN application that replaces WhatsApp/Excel-based OT management with a structured, rule-enforced web application.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local on port 27017, or a free Atlas cluster)

### Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start MongoDB  (terminal 1)
#    Uses the mongod binary already cached by npm test — no separate install needed
npm run mongo

# 3. Seed the database  (terminal 2, run once)
npm run seed

# 4. Start the backend  (terminal 2)
npm run dev:server

# 5. Start the frontend  (terminal 3)
npm run dev:client

# App available at:  http://localhost:5173
# API available at:  http://localhost:3000/api
```

> **No MongoDB installation required.** `npm run mongo` uses the `mongod` binary
> that `mongodb-memory-server` downloads during `npm test`. Run `npm test` first
> if the binary is missing (`server/node_modules/.cache/mongodb-memory-server/`).


---

## Seeded Login Credentials

| Role     | Email                          | Password       | Notes                      |
|----------|-------------------------------|----------------|----------------------------|
| Admin    | admin@sundar.com              | Admin@1234     | HR, all departments        |
| Manager  | manager.machining@sundar.com  | Manager@1234   | Machining dept             |
| Manager  | manager.assembly@sundar.com   | Manager@1234   | Assembly dept              |
| Employee | ravi@sundar.com               | Employee@1234  | Machining, cap 12h, BR-6 demo |
| Employee | priya.employee@sundar.com     | Employee@1234  | Machining                  |
| Employee | anita@sundar.com              | Employee@1234  | Assembly                   |
| Employee | meena@sundar.com              | Employee@1234  | Assembly, cap 8h           |

### BR-6 demo
1. Login as `manager.machining@sundar.com`
2. Open the slot "Quality Inspection Prep"
3. Try to approve Ravi Shankar — he already has 9h this week (3h + 6h), and this slot is 4h → 13h > 12h cap
4. The API will reject with: *"Approving would bring weekly OT to 13.0 h; the cap is 12 h"*

---

## Project Structure

```
ot-hub/
├── server/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── models/          # Mongoose schemas
│   │   ├── middleware/       # auth, validate, errorHandler
│   │   ├── validators/       # Joi schemas
│   │   ├── services/         # Business rule layer (BR-1 to BR-9)
│   │   ├── controllers/      # Thin HTTP layer — delegates to services
│   │   ├── routes/           # Express routers
│   │   ├── utils/            # ApiError, asyncHandler, timeUtils, logger
│   │   ├── app.js            # Express app setup
│   │   ├── index.js          # Server entry
│   │   └── seed.js           # Seed script
│   └── tests/                # Jest + Supertest tests
└── client/
    └── src/
        ├── api/              # Axios calls per resource
        ├── context/          # AuthContext (React Context)
        ├── components/       # common (Badge, Spinner, Pagination…), layout
        ├── pages/            # Screens grouped by role
        └── utils/            # format, CSV export
```

---

## Architecture Decisions

### Backend

**Framework**: Express + Mongoose — straightforward MERN stack, no over-engineering.

**Error shape**: All errors follow `{ success: false, error: { message, details? } }`. Consistent shape means the frontend never guesses the structure.

**Service layer**: All business rules (BR-1 – BR-9) live in `services/`. Controllers are thin HTTP adapters. This makes rules testable without HTTP overhead.

**HTTP status codes**:
- `409 Conflict` for BR-4, BR-5, BR-6 violations — these are state conflicts (resource exists / limit reached), not bad input.
- `422 Unprocessable` is reserved for semantic validation that passes schema checks but fails domain rules. I chose 409 for the cap/overlap/headcount cases because the conflict is with existing DB state.

**Transactions (BR-4/BR-5/BR-6)**: The approval flow uses a MongoDB session + `startTransaction()` to prevent race conditions when two managers approve simultaneously. This catches the double-click / concurrent approval scenario (D1).

**IST handling**: All time calculations use UTC internally (MongoDB stores UTC). IST conversion is isolated in `utils/timeUtils.js` — a single change point if the time zone changes (D5).

**Pagination**: All list endpoints accept `page` + `limit` query params and return `total`, `totalPages`.

**Report**: `GET /api/reports/monthly` uses a MongoDB aggregation pipeline (`$match → $addFields → $group → $lookup → $project → $sort`). No records are loaded into Node.js for summation (A6).

### Frontend

**State management**: React Context (AuthContext) for auth state + TanStack Query (React Query) for server state. Justification: auth is a small global slice that rarely changes; server data (slots, signups, reports) is remote state that benefits from caching, background refetch, and loading/error states out of the box — React Query handles all of this without boilerplate.

**API layer**: All Axios calls are in `src/api/*.js` files. Components import these functions; they never call Axios directly. This makes mocking and testing straightforward.

**Role-based routing**: `ProtectedRoute` in `App.jsx` checks `user.role` and redirects to `/login` on 401 or to `/slots` if the role is insufficient.

---

## Data Model & Indexes

### User
- `email`: unique index (enforced by Mongoose `unique: true`)
- `{ department: 1, role: 1 }`: managers frequently query "all employees in my department"

### Slot
- `{ department: 1, status: 1, startTime: 1 }`: employee slot listing — most common query
- `{ department: 1, startTime: 1 }`: manager date-range filter

### Signup
- `{ slot: 1, employee: 1 }` with partial filter `status in ['pending','approved']`: **unique partial index** enforces BR-3 (one active signup per slot/employee) at the database level, not just in application code
- `{ employee: 1, status: 1, approvedStartTime: 1 }`: overlap + cap checks fetch approved signups by employee efficiently
- `{ slot: 1, status: 1 }`: manager listing signups for a slot

### AuditLog
- `{ createdAt: -1 }`: paginated admin log, newest first
- `{ action: 1, createdAt: -1 }`: filter by action type

---

## Environment Variables

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ot-hub
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=8h
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

---

## Running Tests

```bash
npm test
# or
cd server && npm test
```

Tests use `mongodb-memory-server` (in-memory MongoDB) so no real DB is needed.

Covered cases:
1. Failed login (wrong password, unknown email, missing fields)
2. Access denied for wrong role (employee → POST /users, employee → POST /slots, no token)
3. Overlap rejection (BR-5)
4. Weekly cap rejection (BR-6)
5. Headcount limit (BR-4)

---

## API Collection

See `server/api.http` for HTTP file examples. Or import `server/postman_collection.json` into Postman.

---

## Written Responses (Part D)

### D1 — Concurrent approvals (double-click / race condition)

In the current implementation, approval runs inside a MongoDB `startSession() / startTransaction()` block. The slot's `approvedCount` is re-read inside the transaction. If two managers (or a double-click) fire simultaneously, the second transaction will abort because it reads the post-increment count from the first commit and fails the `approvedCount >= headcountRequired` check.

What I would add to make it fully correct: a [findOneAndUpdate with $inc and a conditional filter](https://www.mongodb.com/docs/manual/reference/operator/update/inc/) on the slot document using optimistic locking (a `version` field), so the second request fails atomically even without a full session. For high-throughput situations, a Redis-based distributed lock (e.g. Redlock) or a job queue (BullMQ) per slot would be more scalable.

### D2 — Scale to 50,000 employees / 5M signups

**What breaks first:**
1. Signup cap/overlap checks do `Signup.find({ employee, status: 'approved', ... })` in-process — at scale this fan-out per approval grows.
2. The monthly aggregation pipeline works well in MongoDB but will slow if not sharded by department/date.
3. The in-memory `mongodb-memory-server` approach in tests doesn't reflect Atlas/replica set behavior.

**Fixes:**
- Materialise weekly OT hours as a cached counter on the User document, updated transactionally on approve/withdraw. Cap check becomes an O(1) read.
- Shard the Signup collection on `{ employee: 1 }` for employee-centric queries.
- Add a read replica for reporting queries so writes aren't blocked.
- Introduce a CDN / caching layer (Redis) for frequently-read slot listings.
- Use Atlas Search for employee name lookup.

### D3 — Security risks (most serious first)

1. **JWT in localStorage** — vulnerable to XSS. Mitigation: move to `httpOnly` cookie (bonus item). For now, `helmet` + strict CSP reduce XSS surface.
2. **No refresh token** — 8h JWTs mean a stolen token is valid for up to 8h. Fix: short-lived access tokens (15 min) + httpOnly refresh token cookie.
3. **MongoDB Atlas connection string in env** — if `.env` leaks, full DB access. Mitigation: use MongoDB Atlas IP allowlist + AWS Secrets Manager in production.
4. **Rate limiting only on login** — the signup and approval endpoints could be hammered. Fix: add general rate limits per IP.
5. **No input length enforcement on queries** — `search` query param passed to `$regex` without a max-length cap could create slow regex. Fix: cap search string at 50 chars and validate regex-safe characters.

### D4 — Assumptions and cuts

**Assumptions:**
- "Date" in a slot refers to IST calendar date; times are also IST. The API accepts ISO UTC strings from the frontend which handles the conversion.
- "Weekly cap" resets on Monday 00:00 IST (not Sunday midnight).
- Managers can only edit/cancel their own department's slots (BR-2 extended to edits).
- An admin cannot sign up for or approve slots.
- Password reset flow is out of scope.

**Cut due to time:**
- Refresh tokens with httpOnly cookies
- Docker Compose file
- Email notifications
- Calendar view
- CI workflow
- Frontend tests

**With two more days:** Refresh tokens, Docker Compose, email notifications via Nodemailer, optimistic UI updates with React Query's `setQueryData`, and a proper end-to-end test suite with Playwright.

### D5 — Second plant in a different time zone

**What changes:**
- Every user and every slot would need a `timezone` field (e.g. `Asia/Kolkata`, `America/New_York`).
- `timeUtils.js` is the single place to update — the `weekStartIST`, `toIST`, and validation functions are already isolated. Replace them with `date-fns-tz` or `luxon` functions that accept a timezone parameter.
- Weekly cap calculation must use the slot's local week, not a hardcoded IST offset.
- The seed script and frontend date/time display would use the plant's timezone.
- BR-1 (slot must be in the future) must compare against the plant's local time, not the server's wall clock.

The key design choice would be: store everything in UTC (which we already do) and convert to/from the relevant timezone only at the boundary (input parsing and display). This minimises the scope of changes.

---

## Time Log

| Phase | Time |
|-------|------|
| Read, plan, schema design | ~45 min |
| Part A: Backend API | ~3.5 h |
| Part B: Frontend | ~3 h |
| Part C: Tests | ~45 min |
| Part D: README, written answers | ~45 min |
| **Total** | **~8 h** |

---

## Known Limitations

- The frontend uses raw CSS utility classes in `index.css` instead of a Tailwind CDN build — all utility classes are hand-written. In a real project, use Tailwind via PostCSS.
- No refresh token; the 8h JWT expiry is a security trade-off.
- Overlap check (BR-5) queries all approved signups in-process; at large scale this should be a materialised counter.
- Slot edit (PATCH /api/slots/:id) does not support changing `department` (intentional).
