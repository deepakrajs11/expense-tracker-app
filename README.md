# FinTrack

Production-minded full-stack Expense Tracker built for the Fenmo technical assessment.

## What this solves
- Add expense with `amount`, `category`, `description`, `date`
- View expense list
- Filter by category
- Sort by date (`newest first`)
- Show total for currently visible list

## Built for real-world behavior
- Retry-safe expense creation via `Idempotency-Key` (`POST /api/expenses`)
- Handles refresh/retry flows safely from UI + API
- User-scoped data isolation (each user sees only their own expenses)

## Security highlights
- JWT auth in HttpOnly cookie (`SameSite=Lax`, `Secure` in production)
- Passwords are hashed with `scrypt + salt` (never stored as plain text)
- Strong password validation (upper/lower/number/symbol, min 8)
- Forgot-password with token hashing + expiry + one-time use
- SQL queries use parameterized statements

## Tech stack
- Next.js 16 (App Router + Route Handlers)
- PostgreSQL (Neon/local Postgres)
- Tailwind CSS
- Docker + Docker Compose

## Database choice (why PostgreSQL)
- Reliable relational model for user + expense ownership
- Strong constraints and indexing for correctness/performance
- Money stored as `NUMERIC(12,2)` to avoid floating-point errors

## API summary
- `POST /api/expenses` (idempotent create)
- `GET /api/expenses?category=<name>&sort=date_desc`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- Auth: register, login, logout, session, forgot/reset password

## Local dev (without Docker)
```bash
npm install
npm run db:migrate
npm run db:seed-demo
npm run dev
```

## Sample login (for reviewers)
- Email: `test@sample.com`
- Password: `test@123`
- Seed command: `npm run db:seed-demo`

## Timebox trade-offs
- Focused on correctness, resilience, and security over feature breadth
- No pagination/export/reporting yet
- Category kept as text (not normalized table) for speed of delivery

## Docker (recommended for evaluation)
```bash
docker compose up -d
```
