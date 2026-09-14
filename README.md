# Unified Service Scheduler (Keyloop Scenario A)

NestJS + PostgreSQL backend for **resource-constrained workshop appointment booking**.

Frontend is stubbed via **OpenAPI** at `/docs` and the curl examples below.

## Stack

- NestJS 11 / TypeScript
- TypeORM + PostgreSQL 16
- JWT auth, Idempotency-Key, cancel/reschedule
- Docker Compose: Postgres + **4 Nest replicas** + nginx
- class-validator + Swagger
- Jest unit tests for availability domain logic

## Quick start (full Docker pipeline — recommended)

This starts **PostgreSQL**, **4 backend replicas** (`api-1`…`api-4`), and **nginx** on port `8080`.  
`api-1` syncs schema and loads mock seed data; the other replicas join after it is healthy.

```bash
npm run docker:up
# equivalent: docker compose up --build -d
```

| Entry | URL |
| --- | --- |
| nginx (public API) | http://localhost:8080 |
| Swagger | http://localhost:8080/docs |
| Health | http://localhost:8080/health |
| Whoami (replica demo) | http://localhost:8080/whoami |
| Postgres | `localhost:5432` (user/pass/db: `scheduler`) |

```bash
npm run docker:ps
npm run docker:logs
npm run docker:down
```

### Prove horizontal scaling (different replicas)

```bash
# PowerShell — expect api-1 .. api-4 across the batch
1..12 | ForEach-Object { curl.exe -s http://localhost:8080/whoami; Write-Host '' }
```

Also check the `X-Replica-Id` response header. Nginx uses **least_conn** across 4 Nest containers; all share one Postgres (mock seed loaded by `api-1` on boot). Under light sequential curls you may still see even spread; under uneven request duration, busy replicas get fewer new connections.

Booking correctness still comes from **shared PostgreSQL** (advisory locks + `resource_calendar`), not from in-memory state on a single Nest process.

### Architecture (Compose)

```
Client → nginx:8080
           ├─ api-1 (schema sync + seed)
           ├─ api-2
           ├─ api-3
           └─ api-4
                 └─► postgres:5432 (shared source of truth + mock data)
```

## Local dev (API on host, DB in Docker)

If you only want Postgres in Docker and Nest on the host:

```bash
docker compose up -d postgres
npm install
cp .env.example .env
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/health

## Seeded IDs (stable)

| Entity | UUID |
| --- | --- |
| Dealership | `11111111-1111-4111-8111-111111111111` |
| Customer | `22222222-2222-4222-8222-222222222222` |
| Vehicle | `33333333-3333-4333-8333-333333333333` |
| Oil Change (60m) | `44444444-4444-4444-8444-444444444401` |
| Full Service (180m) | `44444444-4444-4444-8444-444444444402` |
| Tech (oil only) | `55555555-5555-4555-8555-555555555501` |
| Tech (full only) | `55555555-5555-4555-8555-555555555502` |
| Tech (both) | `55555555-5555-4555-8555-555555555503` |
| Bay 1 | `66666666-6666-4666-8666-666666666601` |
| Bay 2 | `66666666-6666-4666-8666-666666666602` |

Seed also creates:

- Tech oil **PTO** all day `2026-09-15`
- Bay 1 **maintenance** `2026-09-15T08:00Z` → `12:00Z`

## Auth (JWT)

Protected routes require `Authorization: Bearer <token>`.  
Public: `/health`, `/whoami`, `POST /auth/login`, Swagger UI `/docs`.

| User | Password | Role |
| --- | --- | --- |
| `advisor@keyloop.local` | `Password123!` | advisor |
| `manager@keyloop.local` | `Password123!` | manager |

```bash
curl -s -X POST http://localhost:8080/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"advisor@keyloop.local\",\"password\":\"Password123!\"}"
```

Use the returned `access_token` on booking APIs.

## Curl cookbook

Use `http://localhost:8080` when running the full Docker pipeline (nginx).  
Use `http://localhost:3000` for local `npm run start:dev`.

### Login + check availability

```bash
curl -s -X POST http://localhost:8080/auth/login -H "Content-Type: application/json" -d "{\"email\":\"advisor@keyloop.local\",\"password\":\"Password123!\"}"
curl -s -X POST http://localhost:8080/availability/check -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"dealership_id\":\"11111111-1111-4111-8111-111111111111\",\"service_type_id\":\"44444444-4444-4444-8444-444444444401\",\"desired_start_at\":\"2026-09-15T09:00:00.000Z\"}"
```

### Create appointment (with Idempotency-Key)

```bash
curl -s -X POST http://localhost:8080/appointments ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: book-oil-2026-09-15-1300" ^
  -d "{\"customer_id\":\"22222222-2222-4222-8222-222222222222\",\"vehicle_id\":\"33333333-3333-4333-8333-333333333333\",\"dealership_id\":\"11111111-1111-4111-8111-111111111111\",\"service_type_id\":\"44444444-4444-4444-8444-444444444401\",\"desired_start_at\":\"2026-09-15T13:00:00.000Z\"}"
```

Replaying the same key + body returns the original appointment (no double book).

### Reschedule / cancel

```bash
curl -s -X POST http://localhost:8080/appointments/<APPOINTMENT_ID>/reschedule ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"desired_start_at\":\"2026-09-18T10:00:00.000Z\"}"

curl -s -X POST http://localhost:8080/appointments/<APPOINTMENT_ID>/cancel ^
  -H "Authorization: Bearer <TOKEN>"
```

### Mark busy

```bash
curl -s -X POST http://localhost:8080/resource-calendar/busy ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"dealership_id\":\"11111111-1111-4111-8111-111111111111\",\"resource_type\":\"technician\",\"resource_id\":\"55555555-5555-4555-8555-555555555503\",\"starts_at\":\"2026-09-20T09:00:00.000Z\",\"ends_at\":\"2026-09-20T12:00:00.000Z\",\"reason\":\"training\"}"
```

### List calendar / appointments / demo catalog

```bash
curl -s "http://localhost:8080/resource-calendar?dealership_id=11111111-1111-4111-8111-111111111111" -H "Authorization: Bearer <TOKEN>"
curl -s http://localhost:8080/appointments -H "Authorization: Bearer <TOKEN>"
curl -s http://localhost:8080/demo-catalog -H "Authorization: Bearer <TOKEN>"
```

## Tests

```bash
npm test
```

Core coverage:

- Interval overlap rules (half-open `[start, end)`)
- Busy-block and appointment occupancy skip logic
- Deterministic first-fit assignment (sorted tech/bay ids)

## Domain model (short)

Availability reads **only** `resource_calendar` for occupancy (`appointment` | `busy`).

Booking confirm runs in **one DB transaction**:

1. Advisory locks on candidate resources
2. Re-check calendar overlaps
3. Insert `appointments`
4. Insert two `resource_calendar` rows (tech + bay)
5. Commit — or rollback on conflict

## Docs

- System design: [`docs/SYSTEM_DESIGN.md`](./docs/SYSTEM_DESIGN.md)

## AI Collaboration Narrative

**Strategy:** I owned the scenario choice, assumptions, and architecture in a written plan first (Scenario A, NestJS backend, `resource_calendar` mirroring my rental `car_calendar`). Cursor was used as an implementation collaborator against that plan—not as an unsupervised author of the design.

**How I directed the AI**

1. Constrained prompts to one bounded context at a time (entities → availability pure service → transactional appointments → schedule busy API).
2. Required snake_case public DTOs and camelCase internals to match my NestJS production conventions.
3. Insisted occupancy checks hit **only** `resource_calendar`, with skills/active flags as separate filters.
4. Required a single transactional confirm path with advisory locks so multi-replica nginx/K8s scaling stays correct.

**Verification / ownership**

- Reviewed TypeORM relations/`DataSource.transaction` paths (`technician.dealership`) so qualification filtering is correct.
- Added focused Jest tests for busy vs appointment overlaps and back-to-back slots before relying on manual curls.
- Kept domain assignment logic in a pure `AvailabilityService` so business rules are unit-testable without HTTP or ORM noise.
- Documented NestJS tradeoffs vs Go/Laravel/Express in the plan/design doc instead of defaulting to “framework X is best.”

**What I would still challenge in review**

These are honest follow-ups I’d discuss in a technical interview — not gaps in the core Scenario A acceptance criteria.

| Area | Current state | Follow-up |
| --- | --- | --- |
| **Concurrency** | `pg_advisory_xact_lock` inside Postgres transactions before calendar read/write | Add Postgres `EXCLUDE USING gist` on `tstzrange` so overlap rules are enforced by the DB, not only by app code paths |
| **Contention** | Under heavy load on the same bay/tech, locks serialize requests (correct, but slower) | Metrics on lock wait / `409` rate; optional soft-hold in Redis for UX only — not as a substitute for Postgres integrity |
| **Auth** | JWT login + global guard (`advisor` / `manager` demo users) | Fine-grained RBAC (e.g. manager-only busy writes), refresh tokens, audit log |
| **Idempotency** | `Idempotency-Key` on `POST /appointments` replays same key+body | Unique constraint + upsert if two parallel retries race the same key before save |
| **Closures** | Per-resource busy (PTO, bay maintenance) | Dealership-wide closed days (holiday / shutdown) as a separate table or virtual calendar rows |
| **Persistence** | TypeORM `synchronize` for demo | Formal migrations + exclusion constraints before production |
| **Tests** | Unit tests on availability / interval rules | DB integration tests for parallel booking (two requests, one slot, one `201` / one `409`) |
