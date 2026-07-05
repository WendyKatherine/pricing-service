# Pricing Service

A stateless HTTP microservice that computes pricing quotes from an active price
book. Extracted from an inherited legacy Next.js monolith into a standalone,
independently deployable service — with a deliberate focus on **Clean
Architecture**, **testability**, and **operational readiness**.

Deployed to Oracle Cloud via a full CI/CD pipeline (GitHub Actions → GHCR → OCI).

---

## Why this exists

This service was carved out of a monolith that owned everything — storefront, API
routes, pricing, persistence — and shipped as a single deployable. The pricing
logic already had clean internal boundaries, which made it a natural candidate to
extract into its own service: its own process, its own database, its own
deployment lifecycle.

The extraction prioritized **faithfulness**: the pricing engine moved verbatim,
guarded by its existing test suite, so behavior is provably unchanged. A single
anchored figure (subtotal `275.4` for a reference quote) is asserted at every
layer — domain, use case, repository against real Postgres, and HTTP — so any
change to the pricing logic in any layer turns a test red.

---

## Architecture

Clean Architecture with a strict dependency rule: **inner layers know nothing
about outer layers.**

```
┌─────────────────────────────────────────────┐
│  Infrastructure  (Fastify, Postgres, config) │  ← depends on ↓
│  ┌───────────────────────────────────────┐  │
│  │  Application  (use cases, repo ports)  │  │  ← depends on ↓
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Domain  (quote engine, types)  │  │  │  ← depends on nothing
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Domain** — pure business logic (quote engine, resolvers, types). No I/O, no
  framework, no database. Unit-testable in isolation.
- **Application** — use cases orchestrating the domain, depending on repository
  **interfaces** (ports), never on concrete persistence. Failure modes are
  returned as a typed `Result`, not thrown.
- **Infrastructure** — the outside world: Fastify HTTP, the PostgreSQL adapter,
  environment configuration. Implements the ports the application defines.

`main.ts` is the single **composition root** — the only place concrete
implementations are wired together. Adding the entire Postgres layer required
zero changes to `domain/` or `application/` (provable via `git diff`).

Key design decisions are documented as ADRs in [`docs/adr/`](docs/adr/).

---

## Tech stack

- **Node.js 20+** · **TypeScript** (CommonJS)
- **Fastify 5** — HTTP framework (structured JSON logging via pino)
- **PostgreSQL** — persistence (`pg` driver, JSONB for the price book document)
- **node-pg-migrate** — schema migrations (run as a pipeline step)
- **Zod** — environment and request validation at the boundary
- **Jest** + **Testcontainers** — unit and integration testing
- **Docker** — multi-stage build, non-root runtime
- **GitHub Actions → GHCR → Oracle Cloud** — CI/CD

---

## Project structure

```
pricing-service/
├── src/
│   ├── domain/pricing/           # Pure business logic (no I/O)
│   │   ├── engine/               #   Quote computation
│   │   └── types.ts              #   Domain types (PriceBook, Quote…)
│   ├── application/
│   │   ├── ports/                # Repository interfaces
│   │   ├── getQuote.usecase.ts   # Orchestration, returns typed Result
│   │   └── repositories/         # FakePriceBookRepository (for tests)
│   ├── infrastructure/
│   │   ├── config/env.ts         # Env validation (fail-fast at boot)
│   │   ├── db/                   # pg pool
│   │   ├── repositories/         # PostgresPriceBookRepository
│   │   └── http/                 # Fastify server, routes, schemas
│   └── main.ts                   # Composition root + graceful shutdown
├── test/integration/             # Testcontainers-backed integration tests
├── migrations/                   # node-pg-migrate schema migrations
├── docs/adr/                     # Architecture Decision Records
├── Dockerfile                    # Multi-stage, non-root
├── docker-compose.yml            # Local dev stack (service + Postgres)
└── .github/workflows/            # CI/CD pipeline
```

---

## Getting started

### Prerequisites

- Node.js **20.6+** · Docker (for the local stack and integration tests)

### Run the full stack with Docker

```bash
docker compose up --build -d
docker compose exec pricing-service npm run migrate:local
curl localhost:3001/ready        # {"status":"ready","db":"connected"}
```

### Or run the service directly (Node + local Postgres)

```bash
cp .env.example .env             # then fill in local values
npm install
npm run migrate:local            # apply the schema
npm run seed                     # insert one active price book
npm run dev                      # http://localhost:3001
```

### Verify

```bash
curl localhost:3001/health       # {"status":"ok"}         (liveness)
curl localhost:3001/ready        # {"status":"ready",...}  (readiness + DB)
```

Removing `DATABASE_URL` from `.env` makes the service **exit at boot** with a
clear error — the fail-fast environment guard in action.

---

## Configuration

All configuration comes from environment variables. **No secrets are committed
or baked into the image** — everything is injected at runtime. The same build
artifact runs in every environment; only the injected config differs.

| Variable | Required | Values | Default |
|---|---|---|---|
| `NODE_ENV` | no | `development` \| `staging` \| `production` \| `test` | `development` |
| `PORT` | no | positive integer | `3001` |
| `LOG_LEVEL` | no | `fatal` … `trace` | `info` |
| `DATABASE_URL` | **yes** | Postgres connection URL | — |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run in watch mode (loads `.env`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run migrate` | Apply migrations (reads `DATABASE_URL` from env — used in deploy) |
| `npm run migrate:local` | Apply migrations locally (loads `.env`) |
| `npm run seed` | Insert one active price book |
| `npm run test:unit` | Fast tests (domain + application), no database |
| `npm run test:integration` | Tests against ephemeral Postgres (Testcontainers) |
| `npm run verify` | `lint` + `typecheck` + `test:unit` — mirrors the CI gate |

---

## Testing

Testability is treated as a design constraint: if a unit can't be tested in
isolation, that's a design smell. Tests are layered to match the architecture.

- **Domain** — pure functions, tested directly. Fast, deterministic, no mocks.
- **Application** — use cases tested against a **fake repository**, proving
  orchestration with zero database.
- **Integration** — the Postgres adapter tested against an **ephemeral
  Postgres** spun up by Testcontainers, running the **real migration** (not a
  copy), mirroring exactly what CI and production run.

```bash
npm run verify             # fast gate: lint + types + unit
npm run test:integration   # real Postgres via Docker
```

Run `npm run verify` before every push — the pipeline confirms what you already
know passes, it shouldn't be where failures are discovered.

---

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/quote` | Compute a quote from the active price book |
| `GET` | `/health` | Liveness probe (process is up) |
| `GET` | `/ready` | Readiness probe (database reachable) |

Input is validated at the HTTP boundary with Zod. Failure modes map to semantic
status codes: `400` for invalid input, `409` when no active price book is
configured. All errors share a consistent shape.

---

## Database migrations

Schema migrations use **node-pg-migrate** and run as a **pipeline step** during
deploy (before the new version serves traffic). Migrations are backward-oriented
so migrate-then-deploy is safe.

**Creating a new migration** (timestamped format for correct ordering):

```bash
npx node-pg-migrate create my_migration_name
```

> **Note:** node-pg-migrate v8.0.4's `create` subcommand has a packaging bug
> (`import.meta.dirname` resolves to `undefined` in its bundled output, breaking
> `path.join`). The `up` command used by the deploy pipeline is unaffected. If
> `create` fails locally, scaffold the file manually following the existing
> `migrations/` format, or pin a fixed version once released.

---

## Deployment

Pushing to `main` triggers the pipeline: **verify → build image → push to GHCR →
deploy to OCI**. The deploy runs migrations, starts the service, validates
readiness (`/ready` with DB connectivity), and rolls back automatically if the
new version isn't healthy.

The container is **non-root**, ships **production-only dependencies**, and holds
**no secrets** — everything is injected at runtime. See
[`docs/adr/`](docs/adr/) for the environment/config strategy.

---

## Roadmap

- [x] Service skeleton — env validation, health check, graceful shutdown
- [x] Domain layer migrated verbatim, guarded by tests
- [x] Application layer — use cases + repository ports (typed `Result`)
- [x] PostgreSQL persistence + readiness probe + schema migrations
- [x] Integration tests (Testcontainers) + numeric parity across all layers
- [x] Multi-stage, non-root container + local `docker-compose`
- [x] CI/CD pipeline to Oracle Cloud
- [x] Handoff documentation + ADRs
- [ ] Observability — distributed tracing + metrics (OpenTelemetry)
- [ ] Staging environment with promotion gates

---

## License

MIT
