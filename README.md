# Expense Tracker (Next.js + PostgreSQL)

Minimal full-stack expense tracker with resilient request handling.

## Features

- Register / login / logout with JWT in HttpOnly cookie
- Forgot password flow via email reset link (`/forget-password?token=...`)
- Create expense entries with `amount`, `category`, `description`, and `date`
- List only the logged-in user expenses
- Filter by category
- Sort by newest date first
- Show total of currently visible list
- Idempotent create API using `Idempotency-Key` for retry safety
- Light and dark theme with persisted preference

## Tech Decisions

- **Framework**: Next.js App Router (`app/`) with Route Handlers for API
- **Database**: PostgreSQL (Neon)
- **Money handling**: Store amount as exact decimal (`amount NUMERIC(12,2)`) to avoid floating-point errors
- **Auth**: Password hashing via Node `crypto.scrypt`, JWT (`HS256`) in secure HttpOnly cookie
- **Idempotency**: `(user_id, idempotency_key)` + request hash to prevent duplicates per user on retries

## Trade-offs (timebox)

- Kept category as free text (not normalized table)
- Used custom auth/session routes instead of full auth framework to keep scope controlled

## Intentionally Not Done

- No pagination
- No edit/delete expense
- No password reset flow / email verification

## Prerequisites

- Node.js 20+
- PostgreSQL (Neon works)

## Environment

Create `.env`:

```env
DB_HOST=ep-proud-hat-anaoamec.c-6.us-east-1.aws.neon.tech
DB_POOLER_HOST=ep-proud-hat-anaoamec-pooler.c-6.us-east-1.aws.neon.tech
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=your_password
DB_PORT=5432
DB_SSL=true
JWT_SECRET=your_long_random_secret
WEB_BASE_URL=http://localhost:3000
```

You can also use:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

## Install & Run

```bash
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Schema Creation (How to create schema now)

The schema is created by:

```bash
npm run db:migrate
```

This creates:

- `users`
- `expenses`
- `expense_idempotency`
- `password_reset_tokens`
- indexes for user-scoped filtering/sorting

## API

### `POST /api/auth/register`

Create account and start authenticated JWT session.

Body:

```json
{
  "name": "Deepak Raj",
  "email": "you@example.com",
  "password": "strongPassword123"
}
```

### `POST /api/auth/login`

Login and start authenticated JWT session.

### `POST /api/auth/logout`

Logout and clear session cookie.

### `GET /api/auth/session`

Validates JWT cookie and returns current logged-in user or `null`.

### `POST /api/auth/forgot-password`

Accepts `{ email }`, verifies registered user, creates reset token, and sends mail with:

`<WEB_BASE_URL>/forget-password?token=<raw-token>`

### `GET /api/auth/reset-password?token=...`

Validates whether reset token is active.

### `POST /api/auth/reset-password`

Accepts `{ token, password }`, validates token, and sets new password (strong password policy enforced).

### `POST /api/expenses`

Creates a new expense for logged-in user.

Body:

```json
{
  "amount": "249.99",
  "category": "Groceries",
  "description": "Weekly vegetables",
  "date": "2026-04-11"
}
```

Headers:

- `Idempotency-Key: <unique-key>` (recommended for retry safety)

Behavior:

- Same key + same payload => returns same created expense
- Same key + different payload => `409 Conflict`

### `GET /api/expenses`

Returns only logged-in user expenses.

Query params:

- `category=<name>`
- `sort=date_desc`

## Deployment Notes

- Deploy app on Vercel (or Render)
- Add DB env vars in deployment settings
- Run `npm run db:migrate` once against production DB before first use
Optional SMTP for real email delivery:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
SMTP_FROM=no-reply@your-domain.com
SMTP_SECURE=false
```

If SMTP is not configured, reset links are logged in server console in local/dev.
