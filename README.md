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
npm test        # automated tests
```

## Test credentials

- Email: `admin@smart-sender.test`
- Password: `password123`

## Key decisions

- 401s are recovered by a single shared rotate call: concurrent requests that hit an expired session wait on the same `/auth/token/rotate` promise instead of each triggering their own. The CSRF token fetch (initial and on a 419 retry) is shared the same way.
- `device_session_token` lives in memory only (never `localStorage`/the URL); `fingerprint` is the only thing persisted, in `localStorage`.
- The URL is the single source of truth for `page`/`search` in the webhook list — no local state duplicates it, so reloads and browser back/forward restore the list correctly.
- Visiting `/webhooks` without a session (direct link or after a reload) redirects to `/login` while preserving the original path and query; signing in again returns the user to that exact page/search instead of a default view.

## Tests

- `rotateDedup.test.ts` — the mandatory one: two concurrent 401s share a single rotate.
- `csrfRetry.test.ts` — a 419 refetches the CSRF token and retries once.
- `forceLogout.test.ts` — a second consecutive 401, and a failed rotate, both end the session.

## Known gaps

- Saving an edit patches the affected row in place instead of refetching the whole list, so the table doesn't flash a loading state on every save. If the edit makes the row stop matching the active search, it's dropped from the view and `results.total`/pagination are adjusted locally — a page that was exactly full isn't backfilled from the next page without a real reload.
