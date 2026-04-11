# Expense Tracker (Next.js + PostgreSQL)

Minimal full-stack expense tracker with resilient request handling.

## Features

- Create expense entries with `amount`, `category`, `description`, and `date`
- List expenses
- Filter by category
- Sort by newest date first
- Show total of currently visible list
- Idempotent create API using `Idempotency-Key` for retry safety

## Tech Decisions

- **Framework**: Next.js App Router (`app/`) with Route Handlers for API
- **Database**: PostgreSQL (Neon)
- **Money handling**: Store amount as exact decimal (`amount NUMERIC(12,2)`) to avoid floating-point errors
- **Idempotency**: `expense_idempotency` table maps key + request hash to created expense so duplicate retries do not create duplicate rows

## Trade-offs (timebox)

- Kept auth out of scope
- Kept category as free text (not normalized table)
- Focused on correctness and retry behavior over advanced UI polish

## Intentionally Not Done

- No pagination
- No edit/delete expense
- No category summary charts

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

- `expenses`
- `expense_idempotency`
- indexes on `expense_date` and `category`

## API

### `POST /api/expenses`

Creates a new expense.

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

Query params:

- `category=<name>`
- `sort=date_desc`

## Deployment Notes

- Deploy app on Vercel (or Render)
- Add DB env vars in deployment settings
- Run `npm run db:migrate` once against production DB before first use
