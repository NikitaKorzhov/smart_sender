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

describe('rotate deduplication on concurrent 401s', () => {
  it('calls rotate exactly once for two concurrent 401s and both requests succeed', async () => {
    // No real session needed here — the interceptor just needs something to rotate.
    setDeviceSessionToken('irrelevant-for-this-test');

    let rotateCalls = 0;
    let meCalls = 0;
    let webhooksCalls = 0;

    server.use(
      // First call to each endpoint -> 401 (simulated expired session),
      // second call (after rotate) -> success.
      http.get('*/v1/me', () => {
        meCalls += 1;
        if (meCalls === 1) {
          return HttpResponse.json({ error: { type: 'AuthenticationException', message: '', payload: null } }, { status: 401 });
        }
        return HttpResponse.json({ id: 'u1', email: 'a@b.c', first_name: 'A', last_name: 'B', name: 'A B' });
      }),
      http.get('*/v1/webhooks', () => {
        webhooksCalls += 1;
        if (webhooksCalls === 1) {
          return HttpResponse.json({ error: { type: 'AuthenticationException', message: '', payload: null } }, { status: 401 });
        }
        return HttpResponse.json({
          data: [],
          paging: { pages: { current: 1, last: 1 }, results: { total: 0, limitation: 10 } },
        });
      }),
      http.post('*/auth/token/rotate', () => {
        rotateCalls += 1;
        return new HttpResponse(null, { status: 200 });
      })
    );

    const [meResponse, webhooksResponse] = await Promise.all([
      apiClient.get('/v1/me'),
      apiClient.get('/v1/webhooks', { params: { page: 1, limit: 10, search: '' } }),
    ]);

    expect(meResponse.status).toBe(200);
    expect(webhooksResponse.status).toBe(200);
    expect(rotateCalls).toBe(1);
  });
});
