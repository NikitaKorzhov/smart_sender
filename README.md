# Smart Sender — Webhooks

A small SPA: sign in → webhook list (pagination, search) → edit a webhook.
Built for the Smart Sender Senior Frontend Engineer take-home assignment.

## Stack

- React + TypeScript (strict mode)
- MSW — mock API per the assignment's contract
- react-router-dom, axios
- vitest — automated test

## Architecture

```
src/
  types/       — shared API contract types
  mocks/       — MSW handlers + in-memory data
  api/         — axios instance, interceptors (CSRF, 401-rotate, 419-retry), typed error parsing
  auth/        — AuthContext, fingerprint utility, sessionBridge
  pages/       — LoginPage, WebhooksPage + the colocated useWebhookList data hook
  components/  — WebhookEditModal and other UI components
  tests/       — automated tests
```

## Running it

```bash
npm install
npm run dev    # dev server
npm test        # automated test
```

## Test credentials

_TODO._

## Key decisions

_TODO: rotate deduplication, in-memory-only token storage, URL as the source of truth for the list, etc._

## Known gaps

_TODO, if anything is left unfinished._
