# Pricing Service

A stateless HTTP microservice that computes pricing quotes from an active price
book. Extracted from an inherited legacy Next.js monolith as a standalone,
independently deployable service — with a deliberate focus on **Clean
Architecture**, **testability**, and **operational readiness**.

> **Status:** active development. The operational contract (config, health,
> signals, ports) is stable; internal layers are landing incrementally — see
> [Roadmap](#roadmap).

---

## Why this exists

This service was carved out of a monolith that owned everything — storefront, API
routes, pricing, persistence — and shipped as a single deployable. The pricing
logic already had clean internal boundaries, which made it a natural candidate to
extract into its own service: its own process, its own database, its own
deployment lifecycle.

The goal of the extraction was **faithfulness** — the pricing engine moved
verbatim, guarded by its existing test suite, so behavior is provably unchanged.
The monolith itself carries known technical debt and is intentionally out of
scope.

---

## Architecture

The service follows Clean Architecture with a strict dependency rule: **inner
layers know nothing about outer layers.**

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

- **Domain** — pure business logic (the quote engine, resolvers, types). No I/O,
  no framework, no database. Fully unit-testable in isolation.
- **Application** — use cases that orchestrate the domain, depending on
  repository **interfaces** (ports), never on concrete persistence.
- **Infrastructure** — the outside world: Fastify HTTP, the PostgreSQL adapter,
  environment configuration. Implements the ports the application defines.

`main.ts` is the single **composition root** — the only place concrete
implementations are wired together. This is what keeps the domain pure and every
layer testable: the use cases can be exercised with a fake repository, no
database required.

---

## Tech stack

- **Node.js 20+** · **TypeScript** (CommonJS)
- **Fastify 5** — HTTP framework (structured JSON logging via pino out of the box)
- **PostgreSQL** — persistence (pricing data)
- **Zod** — environment and input validation
- **Jest** — testing
- **Docker** — containerized, environment-agnostic deployment

---

## Project structure

```
pricing-service/
├── src/
│   ├── domain/
│   │   └── pricing/           # Pure business logic (no I/O)
│   │       ├── engine/        #   Quote computation
│   │       ├── resolvers/     #   Product → pricing category
│   │       └── types.ts       #   Domain types (PriceBook, Quote…)
│   ├── application/           # Use cases + repository ports
│   ├── infrastructure/
│   │   ├── config/            # Env validation (fail-fast at boot)
│   │   ├── db/                # PostgreSQL pool
│   │   ├── repositories/      # Port adapters (Postgres)
│   │   └── http/              # Fastify server + routes
│   └── main.ts                # Composition root + graceful shutdown
├── test/
│   └── integration/           # Tests against an ephemeral Postgres
├── Dockerfile
└── .github/workflows/ci.yml
```

---

## Getting started

### Prerequisites

- Node.js **20.6+** (the `--env-file` flag is used)
- PostgreSQL (local, or via Docker)

### Install & run

```bash
cp .env.example .env      # then fill in your local values
npm install
npm run dev               # starts on http://localhost:3001
```

### Verify

```bash
curl localhost:3001/health
# → {"status":"ok"}
```

The service **validates its environment at boot and exits immediately** if
anything required is missing — try removing `DATABASE_URL` from `.env` to see
the fail-fast guard in action.

---

## Configuration

All configuration comes from environment variables. **No secrets are committed
or baked into the image** — everything is injected at runtime.

| Variable | Required | Values | Default |
|---|---|---|---|
| `NODE_ENV` | no | `development` \| `staging` \| `production` \| `test` | `development` |
| `PORT` | no | positive integer | `3001` |
| `LOG_LEVEL` | no | `fatal` … `trace` | `info` |
| `DATABASE_URL` | **yes** | Postgres connection URL | — |

The same build artifact runs in every environment — only the injected
configuration differs.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run test:unit` | Fast tests (domain + application), no database |
| `npm run test:integration` | Tests against a real ephemeral Postgres |
| `npm run lint` | Lint |
| `npm run typecheck` | Type-check without emitting |

---

## Testing

Testability is treated as a design constraint, not an afterthought — **if a unit
can't be tested in isolation, that's a design smell to fix.** Tests are layered
to match the architecture:

- **Domain** — pure functions, tested directly. Fast, deterministic, no mocks.
- **Application** — use cases tested against a **fake repository**, proving
  orchestration with zero database.
- **Integration** — repository adapters tested against an ephemeral PostgreSQL
  instance, mirroring what CI runs as a service container.

```bash
npm run test:unit          # fast feedback, no infrastructure
npm run test:integration   # requires Postgres
```

---

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/quote` | Compute a pricing quote from the active price book |
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe (checks database connectivity) |

---

## Operational notes

- **Structured JSON logs** to stdout (level via `LOG_LEVEL`).
- **Graceful shutdown** on `SIGTERM`/`SIGINT` — drains connections and closes
  resources cleanly, safe for rolling deploys.
- **Stateless** — safe to run multiple replicas behind a load balancer.
- Binds `0.0.0.0` for container reachability; TLS terminates upstream.

---

## Roadmap

- [x] Service skeleton — env validation, health check, graceful shutdown
- [x] Domain layer migrated verbatim, guarded by tests
- [ ] Application layer — use cases + repository ports
- [ ] PostgreSQL persistence + readiness probe + schema migrations
- [ ] Integration test suite + container hardening
- [ ] Local `docker-compose` orchestration
- [ ] Handoff documentation + architecture decision records (ADRs)

---

## License

MIT
