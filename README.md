# 🌱 AgroLink — Smart Farm Resource & Workforce Management

A MERN-stack agricultural marketplace: farmers rent equipment, hire workers and buy seeds/fertilizers; equipment owners and workers receive and manage requests; admins oversee the platform. Everything on screen is backed by the Express API and MongoDB — there is no hard-coded demo data in the app.

> See **[AUDIT_REPORT.md](AUDIT_REPORT.md)** for what was found, what was fixed, how it was verified, and the PASS / BLOCKED checklist.

## Features

| Area | What works |
|---|---|
| **Auth** | Register / login / logout, bcrypt hashing, JWT with expiry, "keep me signed in", session survives refresh, expired-session handling, password change revokes old tokens, role-based routes + API authorization, password visibility toggle, per-role redirect |
| **Search** | Global + per-category search over equipment, workers, seeds, fertilizers. Case-insensitive, trimmed, partial, regex-safe. Filters: category, location, price range, availability, skills, season, fertilizer type, distance. Sorting, pagination, suggestions, loading / empty / error states, URL-synced filters |
| **GPS / location** | Opt-in browser Geolocation (one-shot, never tracked), manual city / address fallback, saved to your profile, GeoJSON + `2dsphere` indexes, distance + radius + nearest-first sorting. Other users only ever see approximate distance, never coordinates |
| **Bookings** | Date-range rentals, server-side pricing, double-booking prevention, approve / reject / complete / cancel, auto-accept option, atomic stock reservation for seeds & fertilizers |
| **Payments** | Razorpay order creation + HMAC signature verification + gateway cross-check + webhook, idempotent, PDF invoices, history, admin management & refunds. **Clearly-labelled TEST MODE** when no keys are set |
| **EMI** | Server-controlled interest rate, application → admin approval → gateway-verified instalments → auto-completion |
| **Chat & notifications** | Socket.IO chat (participants only, REST fallback), unread counts, typing, WebRTC voice calls; per-user notifications with preferences, mark-all-read, delete |
| **Settings** | Every control is real and persisted: profile, photo, location, language (6), theme, notification preferences, password; worker skills/availability/rate; owner listing preferences; admin system settings & announcements |
| **Dashboards** | Farmer, Worker, Equipment Owner, Admin — all numbers come from the API |
| **Weather** | Real forecasts (Open-Meteo, no key needed) for your saved location with farm advisories |
| **i18n** | English, हिन्दी, ಕನ್ನಡ, தமிழ், తెలుగు, മലയാളം across the app (`npm run check:i18n` enforces parity) |

## Quick start

Prerequisites: Node 18+ and MongoDB (local or Atlas).

```bash
# 1. Backend
cd backend
cp .env.example .env          # set MONGO_URI and a JWT_SECRET of 32+ random characters
npm install
npm run seed                  # optional: shared demo listings (idempotent, never deletes anything)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ngPass1' npm run seed:admin
npm run dev                   # http://localhost:5000

# 2. Frontend (new terminal, project root)
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Admin accounts cannot be created through public sign-up; use `npm run seed:admin` (or an existing admin → *Users → Add user*).
The seeded demo listings belong to system accounts (`marketplace@agrolink.demo`, `*.worker@agrolink.demo`) with random passwords. Requests to them appear in those accounts, not yours — create your own owner/worker account and list your own items to see the full loop.

## Environment variables

**Backend (`backend/.env`)**

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | **Required**, 32+ random characters (server refuses to start otherwise) |
| `JWT_EXPIRE` / `JWT_SESSION_EXPIRE` | Token lifetime with / without "keep me signed in" (default `7d` / `1d`) |
| `CLIENT_URL` | Comma-separated allowed frontend origins (CORS) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Enable real payments. Leave blank for TEST MODE |
| `RAZORPAY_WEBHOOK_SECRET` | Only if you configure the webhook `POST /api/payments/webhook` (event `payment.captured`) |
| `ALLOW_TEST_PAYMENTS` | `true` permits test-mode payments when `NODE_ENV=production` (off by default) |

**Frontend (`.env`)**: `VITE_API_URL` / `VITE_SERVER_URL` (see `.env.example`).

### Payments: real vs test mode

* **With Razorpay keys**: the server creates the order from the amount stored in MongoDB (the client never sends a price), the browser opens Razorpay Checkout, and the payment only becomes *completed* after the server verifies the HMAC signature **and** confirms amount/status with Razorpay. The secret key never leaves the server.
* **Without keys**: the app shows a *TEST MODE* banner; a dialog lets you simulate success/failure/cancel. Those payments are stored with `mode: "test"`, labelled "Test payment" everywhere (receipts, history, admin), and are excluded from earnings/revenue totals. In production they are refused unless `ALLOW_TEST_PAYMENTS=true`.
* Webhook (optional, recommended in production): point Razorpay at `/api/payments/webhook`.

### Maps / weather keys

None needed. Distances use the Haversine formula; weather uses Open-Meteo. (If you later add a map tile provider, document its key here.)

## Commands

```bash
# frontend
npm run lint && npx tsc -p tsconfig.app.json --noEmit
npm test              # vitest + React Testing Library
npm run check:i18n    # locale parity
npm run build

# backend (needs a MongoDB; tests use their own throwaway databases)
cd backend
MONGO_TEST_URI=mongodb://127.0.0.1:27017 npm test
```

## Security notes

Every API query is scoped to the authenticated user and role; other users' bookings, payments, notifications, messages, contact details and coordinates are never returned. Passwords are bcrypt-hashed; JWTs carry a version so password changes/deactivation revoke sessions immediately; credentials endpoints are rate-limited; inputs are validated and regexes are escaped; Helmet and strict CORS are enabled; clients cannot create notifications for other users.

## Project structure

```
backend/src  config · controllers · middleware · models · routes · services · sockets · utils · seed
backend/tests  Jest + Supertest against a real MongoDB (auth, isolation, search, equipment, booking, payment, EMI, settings, socket)
src            components · contexts · hooks · lib · pages · services · types · locales
```
