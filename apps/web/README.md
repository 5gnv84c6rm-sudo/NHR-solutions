# @nhr/web

NHR Solution web app. **Phase 0: empty Vite scaffold.**

The real application has not moved here yet. It still lives in `ui_kits/` and
still runs on localStorage — open `ui_kits/preview.html` in a browser as before.
Nothing about it changed.

## What this is for

Proving the toolchain: Vite builds, React renders, `@nhr/shared` resolves across
the workspace, and the dev proxy reaches the API.

## Run

```bash
npm run dev --workspace @nhr/web   # http://localhost:5173
```

The page renders with or without the API running; it reports which.

## Phase 1 plan

A strictly mechanical conversion, no feature changes:

1. Move `components/` and `tokens/` to `src/design-system/` unchanged
2. Convert `window.X = ...` globals to ES exports, one file at a time
3. Replace the React/Babel/Lucide CDN scripts with real dependencies
4. One `index.html` plus React Router, instead of 33 standalone HTML documents
5. **Stores stay on localStorage.** They are not touched until Phase 3.

Keeping Phase 1 mechanical means that if something breaks, it was the tooling
and not a logic edit.

## Dev proxy

`/v1` and `/health` proxy to `localhost:4000`, so the browser sees a single
origin in development. That matters for the cookie-based sessions arriving in
Phase 2: without the proxy, SameSite behaviour differs between local and
deployed, and those bugs only surface after a deploy.
