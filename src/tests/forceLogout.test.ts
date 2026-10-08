// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { apiClient, setDeviceSessionToken } from '../api/client';
import { registerForceLogoutHandler } from '../auth/sessionBridge';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('forced logout', () => {
  it('triggers on a second consecutive 401 after a successful rotate', async () => {
    setDeviceSessionToken('irrelevant-for-this-test');
    let forceLogoutCalls = 0;
    registerForceLogoutHandler(() => {
      forceLogoutCalls += 1;
    });

    server.use(
      http.get('*/v1/me', () =>
        HttpResponse.json({ error: { type: 'AuthenticationException', message: '', payload: null } }, { status: 401 })
      ),
      http.post('*/auth/token/rotate', () => new HttpResponse(null, { status: 200 }))
    );

    await expect(apiClient.get('/v1/me')).rejects.toBeTruthy();

    expect(forceLogoutCalls).toBe(1);
  });

  it('triggers when rotate itself fails', async () => {
    setDeviceSessionToken('irrelevant-for-this-test');
    let forceLogoutCalls = 0;
    registerForceLogoutHandler(() => {
      forceLogoutCalls += 1;
    });

    server.use(
      http.get('*/v1/me', () =>
        HttpResponse.json({ error: { type: 'AuthenticationException', message: '', payload: null } }, { status: 401 })
      ),
      http.post('*/auth/token/rotate', () =>
        HttpResponse.json({ error: { type: 'BadRequestException', message: '', payload: null } }, { status: 400 })
      )
    );

    await expect(apiClient.get('/v1/me')).rejects.toBeTruthy();

    expect(forceLogoutCalls).toBe(1);
  });
});
