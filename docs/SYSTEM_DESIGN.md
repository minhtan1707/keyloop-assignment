# System Design — Unified Service Scheduler (Scenario A)

## Goal

Backend service that replaces manual workshop booking:

1. Accept a service appointment request (vehicle, service type, dealership, desired time)
2. Check real-time availability of a **ServiceBay** and a **qualified Technician** for the full duration
3. Persist a confirmed **Appointment** linking customer, vehicle, technician, and bay

**Layer choice:** backend only. Frontend is stubbed via OpenAPI (`/docs`) and curl examples.

## Assumptions

| # | Assumption |
| --- | --- |
| 1 | Booking is always scoped to one `dealership_id` |
| 2 | Service type defines duration (e.g. Oil Change = 60m) |
| 3 | Technicians must have a matching skill for the service type |
| 4 | Occupancy lives only in `resource_calendar` (`appointment` \| `busy`) — same idea as a rental `car_calendar` |
| 5 | Busy blocks (PTO, bay maintenance) are not appointments but still block booking |
| 6 | Assignment is deterministic first-fit (sorted technician/bay ids) |
| 7 | Times are UTC ISO-8601 |
| 8 | Staff authenticate with JWT (`advisor` / `manager`); public: `/health`, `/whoami`, `POST /auth/login` |
| 9 | Optional `Idempotency-Key` on create for safe retries |
| 10 | Cancel frees calendar rows; reschedule re-checks availability in one transaction |
| 11 | Multi-replica safety comes from Postgres advisory locks + calendar overlap checks |

## Architecture

```
                    ┌──────────────────────────────────────┐
 Clients / Swagger  │  nginx :8080 (least_conn)            │
 curl / Postman  ──►│    api-1 (schema sync + seed)        │
                    │    api-2                             │
                    │    api-3                             │──► PostgreSQL
                    │    api-4                             │    (shared SoT)
                    └──────────────────────────────────────┘

Each Nest replica (stateless):
  AuthModule | CatalogModule | AvailabilityModule
  ScheduleModule | AppointmentsModule | HealthModule
```

```
┌─ NestJS API ─────────────────────────────────────────┐
│  POST /auth/login              (public, JWT issue)   │
│  GET  /health, /whoami         (public, LB / demo)   │
│  Catalog / Availability / Schedule / Appointments    │
│    (Bearer JWT required)                             │
└───────────────────────────┬──────────────────────────┘
                            │
                            ▼
┌─ PostgreSQL ─────────────────────────────────────────┐
│  users, dealerships, customers, vehicles             │
│  service_types, technicians, technician_skills       │
│  service_bays, appointments, resource_calendar       │
│  idempotency_records                                 │
└──────────────────────────────────────────────────────┘
```

## Component roles

| Component | Role |
| --- | --- |
| **Auth** | Login, JWT validation, global guard (`@Public()` opt-out) |
| **Catalog** | Dealerships, service types, demo listings |
| **Resources** | Technicians, skills, service bays (entities) |
| **Schedule** | Busy blocks + calendar listing on `resource_calendar` |
| **Availability** | Pure first-fit over free qualified resources |
| **Appointments** | Create / get / list / cancel / reschedule + idempotency |
| **Seed** | Deterministic mock data + demo users on `api-1` boot |
| **nginx** | Public entrypoint; fans out to 4 Nest replicas |
| **PostgreSQL** | Source of truth for occupancy and concurrency |

## Resource calendar model

| `kind` | Created by | Blocks availability? | Has customer? |
| --- | --- | --- | --- |
| `appointment` | Confirm / reschedule flow | Yes | Yes (via `appointments`) |
| `busy` | Manager/ops API | Yes | No — reason only |

Availability for a time window checks **only** `resource_calendar` overlaps, then applies skill + active filters separately.

## Data flows

### Confirm booking (`POST /appointments`)

1. JWT auth + DTO validation (`snake_case` public contract)
2. Optional `Idempotency-Key`: replay stored response if same key+body
3. Open DB transaction
4. Load customer / vehicle / dealership / service type; compute `[starts_at, ends_at)`
5. Collect qualified active technicians + active bays
6. `pg_advisory_xact_lock` on candidate resources (sorted keys → no deadlock)
7. Load overlapping `resource_calendar` rows
8. `AvailabilityService.findAvailableSlot` (deterministic first-fit)
9. Insert `appointments` + two calendar rows (tech + bay, `kind=appointment`)
10. Commit — or rollback / `409` if no slot; persist idempotency record on success

### Cancel (`POST /appointments/:id/cancel`)

Transaction: lock resources → delete calendar rows for that appointment → set `status=cancelled`.

### Reschedule (`POST /appointments/:id/reschedule`)

Transaction: delete old calendar rows → re-run availability for new `desired_start_at` → update appointment + write new calendar rows.

### Busy block (`POST /resource-calendar/busy`)

Separate transaction: advisory lock → overlap check → insert one `kind=busy` row.

## API surface (summary)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Returns Bearer token |
| GET | `/health`, `/whoami` | Public | Liveness + replica id |
| GET | `/dealerships`, `/service-types`, `/demo-catalog` | JWT | Catalog |
| POST | `/availability/check` | JWT | Dry-run |
| POST | `/appointments` | JWT | Optional `Idempotency-Key` |
| GET | `/appointments`, `/appointments/:id` | JWT | Read |
| POST | `/appointments/:id/cancel` | JWT | Free calendar |
| POST | `/appointments/:id/reschedule` | JWT | Move slot |
| POST | `/resource-calendar/busy` | JWT | Manual busy |
| GET | `/resource-calendar` | JWT | List occupancy |

Demo users: `advisor@keyloop.local` / `manager@keyloop.local` — password `Password123!`.

## Technology choices

| Choice | Justification |
| --- | --- |
| **NestJS** | Module boundaries, DI, validation, OpenAPI; matches candidate NestJS experience and Keyloop Node/Nest backends |
| **TypeORM** | Familiar Data Mapper API; `DataSource.transaction` for booking lifecycle; strong Nest ecosystem |
| **PostgreSQL** | Relational integrity + advisory locks for multi-replica safe booking |
| **JWT** | Stateless auth — required for horizontal Nest replicas behind nginx |
| **Docker Compose** | Postgres + 4 API replicas + nginx to demonstrate scalability without a full K8s cluster |
| **Jest** | Unit tests for pure availability / interval rules |

### NestJS vs alternatives (short)

| Alternative | When it fits | Why not here |
| --- | --- | --- |
| **Express / Fastify** | Minimal APIs, max control | More DIY for modules, validation, OpenAPI — assessment time goes to scaffolding |
| **Go** | High-throughput microservices | Higher delivery risk for this candidate under time pressure; booking correctness is still Postgres |
| **Laravel / Symfony** | PHP-first teams | Valid stack, but not current daily driver for this submission |

NestJS wins on module boundaries, OpenAPI, and ability to verify AI-generated code quickly.

## Concurrency and locking

Booking must stay correct when nginx sends traffic to **any** of four Nest replicas.

```
Request → Nest replica (stateless)
            → BEGIN
            → pg_advisory_xact_lock(resource keys, sorted)
            → read resource_calendar overlaps
            → insert appointment + calendar rows
            → COMMIT (locks released automatically)
```

| Mechanism | Role |
| --- | --- |
| **`pg_advisory_xact_lock`** | Serialize confirm/reschedule/busy writes per resource inside the DB transaction; lock dies on commit/rollback |
| **`resource_calendar` overlap query** | Business rule: no overlapping occupancy for tech/bay |
| **JWT (stateless)** | No sticky sessions required behind nginx |

**Why not Redis lock for calendar?** Occupancy lives in Postgres. A Redis lock does not replace a DB transaction; it only helps optional “soft hold for 2 minutes” UX. Correctness stays in Postgres.

**Production hardening (follow-up):** `EXCLUDE USING gist` on `(resource_type, resource_id, tstzrange(starts_at, ends_at))` so the database rejects overlaps even if a future code path skips advisory locks.

## Scalability

- Nest instances are **stateless** (JWT, no in-memory booking state).
- nginx uses `least_conn` across `api-1`…`api-4` (prefer replica with fewest active connections).
- `api-1` alone runs schema sync + seed; others wait until healthy.
- Double-booking prevention is **not** in the app process — it is Postgres advisory locks + `resource_calendar` overlap checks.
- `/whoami` and `X-Replica-Id` prove which replica served a request.
- Further scale (K8s HPA, read replicas, dealership partitioning) is evolutionary, not required for MVP.

## Observability

| Layer | What we have |
| --- | --- |
| Liveness | `GET /health` (replica_id included) |
| Load-balancer demo | `GET /whoami`, response header `X-Replica-Id` |
| Validation | Nest `ValidationPipe` → structured 400s |
| App logs | Nest bootstrap + TypeORM logging in development |
| Conflict signal | HTTP `409` for unavailable slots / idempotency key misuse |

**Next (production):** request-id correlation, metrics (`appointments_created`, `booking_conflicts`), OpenTelemetry around the confirm transaction.

## GenAI in the design phase

Cursor was used **after** a human-authored plan locked:

- Scenario A + backend layer
- `resource_calendar` pattern (from car-rental calendar experience)
- NestJS + TypeORM justification
- Transaction and multi-replica locking model

AI assisted implementation of modules, Docker/nginx wiring, and boilerplate. Design ownership stayed with the candidate: scenario choice, occupancy model, and concurrency approach were not delegated.

## Implemented vs follow-up

| Feature | Status |
| --- | --- |
| JWT auth | Implemented (demo users) |
| Idempotency-Key on create | Implemented |
| Cancel / reschedule | Implemented |
| Multi-replica Docker demo | Implemented (nginx + 4 APIs) |
| Dealership-wide closures | Follow-up |
| Postgres exclusion constraints | Follow-up hardening |
| Formal migrations (prod) | Follow-up |
| Full frontend | Intentionally stubbed (OpenAPI + curl) |
