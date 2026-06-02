# 💰 FinTrack — Production-Ready Expense Tracker

A complete, production-oriented full-stack expense tracker built as part of a technical assessment.

This project focuses on **correctness, reliability, and real-world usability** rather than feature bloat.

---

## 🌐 Live Demo

👉 [Application Link](https://expense-tracker-app-two-zeta.vercel.app/)

---

## ⚡ Quick Reviewer Access (Recommended)

To save time during evaluation, you can use the demo account:

* **Email:** [test@sample.com](mailto:test@sample.com)
* **Password:** test@123

👉 Alternatively, feel free to **register a new account** and test all flows.

---

## 🧩 Problem Statement

Build a minimal expense tracking system that behaves correctly under real-world conditions:

* Network retries
* Duplicate submissions
* Page refreshes
* Concurrent usage

---

## 🚀 Core Features

### 🧾 Expense Management

* Create expense (amount, category, description, date)
* Edit & delete expenses
* View list of expenses

### 🔍 Filtering & Sorting

* Filter by:

  * Category
  * Date range
  * Min / Max amount
* Sort by:

  * Date (asc / desc)
  * Amount (asc / desc)

### 📊 Insights

* Total for currently visible (filtered) expenses
* Overview + Trends (line chart)

### 📄 Data Export

* Export filtered results to CSV

### 📑 Pagination

* Configurable rows per page
* Prev / Next navigation

---

## 🔐 Authentication

* JWT-based authentication
* Register / Login / Logout
* Forgot & Reset password via email flow

---

## 🧠 Reliability & Data Correctness

This project is designed with **real-world failure scenarios in mind**:

* ✅ **Idempotent expense creation** using `Idempotency-Key`
* ✅ Safe handling of:

  * Double clicks
  * Network retries
  * Page refresh after submit
* ✅ Per-user data isolation
* ✅ Money stored using `NUMERIC(12,2)` (no floating point issues)
* ✅ Indexed queries for efficient filtering & sorting

---

## 🔒 Security Considerations

* JWT stored in **HttpOnly cookies**
* `SameSite=Lax`, `Secure` in production
* Password hashing using **scrypt + salt**
* Strong password policy enforcement
* Reset tokens:

  * Hashed
  * Expiring
  * Single-use
* Parameterized SQL queries (SQL injection safe)

---

## 🔌 API Overview

### Expense APIs

* `POST /api/expenses` → Create (idempotent)
* `GET /api/expenses` → List (filter + sort supported)
* `PATCH /api/expenses/:id` → Update
* `DELETE /api/expenses/:id` → Delete

### Auth APIs

* Register / Login / Logout
* Session check
* Forgot / Reset password

---

## 🏗️ Tech Stack

* **Frontend & Backend:** Next.js (App Router, TypeScript)
* **Database:** PostgreSQL
* **Auth:** JWT (cookie-based)
* **Styling:** Tailwind CSS
* **Charts:** [mention if used]

---

## ⚙️ Local Setup

```bash
npm install
npm run db:migrate
npm run db:seed-demo
npm run dev
```

---

## 🐳 Docker Setup (Recommended)

```bash
docker compose up -d
```

---

## 📱 Android SMS SDK

A companion Android app that listens for SMS notifications, parses debit/credit messages, and allows users to map senders to expense tracker accounts.

**Features:**
* SMS interception and parsing (debit/credit detection)
* First-time sender mapping via notification UI
* Account synchronization from the host app
* QR/barcode scanner for account linking
* Persistent local mapping storage
* Transaction broadcasting to host app

**SDK Location:** `android-sdk/`

**Build & Install:**
```bash
cd android-sdk
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Dashboard & Download:** Visit `/app/dashboard/sdk` to view the SDK page and download the APK or source code.

**API Endpoints:**
* `GET /api/sdk/accounts` — Fetch user accounts for mapping (secured with token)
* `GET /api/sdk/download` — Download built APK or source ZIP

**Testing:** See [TESTING.md](TESTING.md) for comprehensive setup and testing instructions.

---

## 🌱 Demo Data

To quickly test the app:

```bash
npm run db:seed-demo
```

---

## ⚖️ Key Design Decisions

### 1. Idempotency for POST /expenses

Handled via `Idempotency-Key` to ensure:

* No duplicate entries on retries
* Safe real-world behavior

---

### 2. Monetary Precision

Used `NUMERIC(12,2)` instead of float to avoid:

* Rounding errors
* Financial inaccuracies

---

### 3. Fullstack in Next.js

Chose Next.js for:

* Faster development within timebox
* Unified frontend + backend
* Easier deployment

---

### 4. JWT via Cookies (not localStorage)

* Prevents XSS exposure
* Aligns with production security practices

---

## ⏳ Timebox Trade-offs

Due to the 4-hour constraint:

* Focused on **correctness > UI polish**
* Implemented **core flows deeply** instead of adding many features
* Kept architecture simple but extensible

---

## 🚧 What I Would Improve With More Time

* Better UI/UX polish
* Add integration & unit tests
* Rate limiting & API monitoring
* Improved analytics dashboard
* Role-based access (multi-user scenarios)

---

## 🎯 Evaluation Focus

This project is designed to demonstrate:

* Thoughtful handling of **edge cases**
* Ability to build **production-like systems quickly**
* Clean and maintainable code structure
* Strong engineering judgment under constraints

---

## 🙌 Final Notes

The goal was to build something **simple, correct, and extensible** — not just a demo.

Happy to walk through design decisions if needed.
