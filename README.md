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
  api/         — client.ts (axios instance + typed interceptors), auth.ts/webhooks.ts (typed per-domain calls), errors.ts (typed error parsing)
  auth/        — AuthContext/AuthContextBase/useAuth (split to keep Fast Refresh happy), fingerprint utility, sessionBridge
  pages/       — LoginPage/WebhooksPage (view only) + colocated hooks (useLoginForm, useWebhooksPage, useWebhookList) holding all state and API calls
  components/  — WebhookEditModal (view only) + colocated useWebhookEditForm hook
  tests/       — automated tests
```

## Running it

```bash
npm install
npm run dev    # dev server, http://localhost:5173 by default
npm test        # automated test
```

## Test credentials

- Email: `admin@smart-sender.test`
- Password: `password123`

## Key decisions

- 401s are recovered by a single shared rotate call: concurrent requests that hit an expired session wait on the same `/auth/token/rotate` promise instead of each triggering their own.
- `device_session_token` lives in memory only (never `localStorage`/the URL); `fingerprint` is the only thing persisted, in `localStorage`.
- The URL is the single source of truth for `page`/`search` in the webhook list — no local state duplicates it, so reloads and browser back/forward restore the list correctly.
- Visiting `/webhooks` without a session (direct link or after a reload) redirects to `/login` while preserving the original path and query; signing in again returns the user to that exact page/search instead of a default view.

## Known gaps

- Only the mandatory automated test (rotate deduplication on concurrent 401s) ships in the repo. A couple of extra scenarios — 419 → CSRF retry, forced logout on a second consecutive 401 — were manually verified during development but aren't part of the committed test suite.
- 419 retries aren't deduplicated across concurrent requests the way 401 rotates are: each concurrent 419 independently refetches the CSRF token. Low risk — refetching CSRF is idempotent and cheap, unlike rotate, which mutates session state server-side — so the extra coordination wasn't worth it at this scope.
