# FinTrack

Production-ready Expense Tracker built for the Fenmo technical assessment.

## Core features
- JWT login/register/logout (separate auth pages)
- Forgot/reset password flow with email link
- Add expense: `amount`, `category`, `description`, `date`
- Expense list with **search + multi-filters**:
  - category
  - date range
  - min/max amount
  - sort (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`)
- Pagination (`rows/page`, prev/next navigation)
- Total for currently visible expenses
- Edit/Delete expense
- **Export currently visible (filtered) rows to CSV**
- Overview + Trends pages with line-chart data visibility

## Reliability and correctness
- Idempotent create (`POST /api/expenses`) using `Idempotency-Key`
- Safe client retry/refresh handling for submission flows
- Per-user data isolation in all expense operations
- Money stored as `NUMERIC(12,2)` (no floating-point drift)
- Indexed Postgres queries for filter/sort paths

## Security
- JWT in HttpOnly cookie (`SameSite=Lax`, `Secure` in production)
- Password hashing with `scrypt + salt` (no plain-text storage)
- Strong password policy (upper/lower/number/symbol, min 8)
- Password reset token hashing + expiry + one-time use
- Parameterized SQL queries

## API (summary)
- `POST /api/expenses` (idempotent create)
- `GET /api/expenses?category=<name>&sort=date_desc`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- Auth: register, login, logout, session, forgot/reset password

## Sample login (review-ready)
- Email: `test@sample.com`
- Password: `test@123`
- Seed: `npm run db:seed-demo`

## Timebox decisions
- Prioritized correctness, resilience, security, and clean architecture first
- Delivered practical UX value: filters, trends, pagination, and CSV export

## Local setup
```bash
npm install
npm run db:migrate
npm run db:seed-demo
npm run dev
```

## Docker (recommended)
```bash
docker compose up -d
```
