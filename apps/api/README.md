# @nhr/api

NHR Solution REST API. **Phase 0: scaffold only.**

## What exists

- Express 5 app with request ids, structured logging, Helmet, CORS, rate limiting
- `GET /health`, `/health/live`, `/health/ready`
- One error envelope for the whole API, matching `@nhr/shared`
- Smoke tests

## What does not exist yet

No database, no Redis, no auth, no data endpoints. The frontend in `ui_kits/`
still runs entirely on localStorage and does not call this API. That is
deliberate — Phase 0 changes no behaviour.

## Run

```bash
npm install
cp .env.example .env     # from the repository root
npm run dev --workspace @nhr/api
```

Then:

```bash
curl http://localhost:4000/health | jq
```

## Layout

```
src/
  index.ts           port binding, graceful shutdown
  app.ts             middleware and route assembly (importable by tests)
  config/env.ts      env loading, validation, connection-string assembly
  lib/logger.ts      pino with a wide redaction list
  middleware/        requestId, errors
  routes/health.ts   health, liveness, readiness
tests/
  health.test.ts
```

Phase 2 adds `db/`, Phase 3 adds `modules/<domain>/` and `domain/` for the
ported calculation logic.

## Conventions

- **Cursor pagination, never offset.** Offset drifts when rows are inserted
  mid-list, which happens constantly in a live HR system.
- **One error shape**, with per-field messages, because the UI renders errors
  inline against the input.
- **Never log request bodies** on auth, payroll or document routes. The
  redaction list in `lib/logger.ts` enforces this; keep it wide.
- **`not_configured` is not `down`.** A health check that lies gets ignored.
