// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { apiClient, setDeviceSessionToken } from '../api/client';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('419 CSRF retry', () => {
  it('refetches the CSRF token once and retries the request', async () => {
    setDeviceSessionToken('irrelevant-for-this-test');

    let csrfCalls = 0;
    let putCalls = 0;

    server.use(
      http.get('*/csrf', () => {
        csrfCalls += 1;
        return new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': `token-${csrfCalls}` } });
      }),
      http.put('*/v1/webhooks/:id', () => {
        putCalls += 1;
        if (putCalls === 1) {
          return HttpResponse.json({ error: { type: 'TokenMismatchException', message: '', payload: null } }, { status: 419 });
        }
        return HttpResponse.json({ id: 'webhook-1', name: 'x', url: 'https://x.test', active: true, created_at: '' });
      })
    );

    const response = await apiClient.put('/v1/webhooks/webhook-1', { name: 'x', url: 'https://x.test' });

    expect(response.status).toBe(200);
    expect(putCalls).toBe(2);
    expect(csrfCalls).toBe(2);
  });
});
