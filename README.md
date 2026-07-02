# Pricing Service

Pricing microservice extracted from an inherited legacy monolith (abandoned client project). The monolith carries known technical debt and is out of scope; this work focuses on the extraction, containerization, and operational readiness of the pricing service.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

## Verify

```bash
curl localhost:3001/health
# → {"status":"ok"}
```

## Scripts

| Script              | Purpose                                         |
|---------------------|-------------------------------------------------|
| `npm run dev`       | Start dev server with hot-reload (tsx watch)    |
| `npm run build`     | Compile TypeScript to dist/                     |
| `npm start`         | Run compiled dist/main.js                       |
| `npm test`          | Run all tests                                   |
| `npm run test:unit` | Run unit tests only                             |
| `npm run lint`      | Lint source files                               |
| `npm run typecheck` | Type-check without emitting                     |
