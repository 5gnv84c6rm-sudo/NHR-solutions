# NHR Solution — Phase 0 setup

Monorepo scaffold. **The working prototype is untouched** and still runs from
`ui_kits/` on localStorage.

## Read this first

This project is a **design system**. An in-browser compiler sweeps every `.js`,
`.ts` and `.tsx` file in it into `_ds_bundle.js` and transforms the result as
browser JSX. Node backend source cannot survive that: `import.meta` in
`env.ts` broke the bundle and stopped all 59 design-system cards rendering.

So the Phase 0 **source** now lives in [`PHASE_0_SCAFFOLD.md`](./PHASE_0_SCAFFOLD.md)
as text, unchanged, ready to write out. The config files the compiler ignores
(`package.json`, `tsconfig*.json`, `.env.example`, `docker-compose.yml`, the
dotfiles and the READMEs) are still live here.

The commands below work once the scaffold source has been written out into a
normal repository. **Do not do that inside this project** — it will break the
design system again.

## Prerequisites

- Node 22+
- Docker Desktop (for Postgres and Redis)

## First run

```bash
# 1. environment — names only in .env.example, fill in your own values
cp .env.example .env

# 2. set a local Postgres password (the container refuses to start without one)
#    POSTGRES_PASSWORD=<something>

# 3. install
npm install

# 4. everything at once
npm run dev
```

## Running each piece

**Backend** — http://localhost:4000

```bash
npm run dev:api
curl http://localhost:4000/health | jq
```

**Frontend scaffold** — http://localhost:5173

```bash
npm run dev:web
```

This is the empty Vite shell, not the app. It reports whether the API is
reachable.

**The actual prototype** — unchanged

Open `ui_kits/preview.html`, or any page under `ui_kits/website/` and
`ui_kits/app/`, directly in a browser. No build step, no server. All data still
in localStorage.

**Postgres and Redis**

```bash
npm run infra:up       # start
npm run infra:logs     # follow logs
npm run infra:down     # stop, keep data
npm run infra:reset    # stop and DESTROY volumes
```

No schema is created. Phase 2 adds migrations.

Check they are up:

```bash
docker compose ps
psql "postgresql://nhr:<password>@localhost:5432/nhr_dev" -c 'select version();'
redis-cli ping
```

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Layout

```
apps/api         Express 5 API — health endpoint only
apps/web         Vite + React scaffold — placeholder page
packages/shared  types, constants, permissions, HTTP contract
ui_kits/         THE LIVE PROTOTYPE — do not touch in Phase 0/1 planning
components/      design system sources (compiled to _ds_bundle.js)
tokens/          CSS custom properties
```

## Ground rules for later phases

- `ui_kits/` is the specification. Where it and `BACKEND_SPEC.md` disagree, the
  prototype wins.
- Phase 1 is a **mechanical** conversion — no feature changes, so a break is
  known to be tooling rather than logic.
- The localStorage stores are not replaced until Phase 3, and one module at a
  time.
- No credentials in source, ever. `.env.example` carries names only.
