import { http, HttpResponse } from 'msw';
import type { Webhook, MeResponse } from '../types/api';

let isSessionActive = false;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
const FIXED_CSRF_TOKEN = 'mock-fixed-csrf-token-12345';

// 27 seed webhooks (within the 25-30 range)
const mockWebhooks: Webhook[] = Array.from({ length: 27 }, (_, index) => ({
  id: `webhook-${index + 1}`,
  name: `Webhook ${index + 1} (${index % 2 === 0 ? 'Production' : 'Staging'})`,
  url: `https://api.example.com/hooks/endpoint-${index + 1}`,
  active: index % 3 !== 0,
  created_at: new Date(Date.now() - index * 86400000).toISOString(),
}));

const MOCK_EMAIL = 'admin@smart-sender.test';
const MOCK_PASSWORD = 'password123';
const mockUser: MeResponse = {
  id: 'user-1',
  email: MOCK_EMAIL,
  first_name: 'Admin',
  last_name: 'User',
  name: 'Admin User',
};

// Error envelope matching the API contract
function errorResponse(
  status: number,
  type: string,
  message: string,
  payload: Record<string, string[]> | null = null
) {
  return HttpResponse.json({ error: { type, message, payload } }, { status });
}

// 30s session lifetime
const startSessionTimer = () => {
  if (sessionTimer) clearTimeout(sessionTimer);
  isSessionActive = true;
  sessionTimer = setTimeout(() => {
    isSessionActive = false;
  }, 30000);
};

function checkCsrf(request: Request) {
  return request.headers.get('X-CSRF-TOKEN') === FIXED_CSRF_TOKEN;
}

export const handlers = [
  // GET /csrf -> 204 + X-CSRF-TOKEN header
  http.get('*/csrf', () => {
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-CSRF-TOKEN': FIXED_CSRF_TOKEN },
    });
  }),

  // POST /auth/login -> captcha + credentials -> device_session_token
  http.post('*/auth/login', async ({ request }) => {
    if (!checkCsrf(request)) {
      return errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.');
    }
    if (!request.headers.get('X-Captcha-Token')) {
      return errorResponse(422, 'ValidationException', 'The given data was invalid.', {
        captcha: ['The captcha token is required.'],
      });
    }

    const body: any = await request.json().catch(() => ({}));
    if (body.email !== MOCK_EMAIL || body.password !== MOCK_PASSWORD) {
      return errorResponse(422, 'ValidationException', 'The given data was invalid.', {
        email: ['Invalid credentials.'],
      });
    }

    return HttpResponse.json({ device_session_token: 'mock-device-session-token-abc' }, { status: 200 });
  }),

  // POST /auth/token/issue -> starts the session
  http.post('*/auth/token/issue', async ({ request }) => {
    if (!checkCsrf(request)) {
      return errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.');
    }
    const body: any = await request.json().catch(() => ({}));
    if (!body.device_session_token) {
      return errorResponse(422, 'ValidationException', 'The given data was invalid.', {
        device_session_token: ['The device session token is required.'],
      });
    }

    startSessionTimer();
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /auth/token/rotate -> +30s; 400 before issue / after revoke
  http.post('*/auth/token/rotate', ({ request }) => {
    if (!checkCsrf(request)) {
      return errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.');
    }
    if (!isSessionActive) {
      return errorResponse(400, 'BadRequestException', 'Session is not active.');
    }
    startSessionTimer();
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /auth/token/revoke -> ends the session
  http.post('*/auth/token/revoke', ({ request }) => {
    if (!checkCsrf(request)) {
      return errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.');
    }
    isSessionActive = false;
    if (sessionTimer) clearTimeout(sessionTimer);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/v1/me', () => {
    if (!isSessionActive) {
      return errorResponse(401, 'AuthenticationException', 'Unauthenticated.');
    }
    return HttpResponse.json(mockUser, { status: 200 });
  }),

  // GET /v1/webhooks -> paginated + searchable list
  http.get('*/v1/webhooks', ({ request }) => {
    if (!isSessionActive) {
      return errorResponse(401, 'AuthenticationException', 'Unauthenticated.');
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const search = (url.searchParams.get('search') || '').toLowerCase();

    const filtered = mockWebhooks.filter((w) => w.name.toLowerCase().includes(search));
    const total = filtered.length;
    const lastPage = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    return HttpResponse.json(
      {
        data: paginatedData,
        paging: {
          pages: { current: page, last: lastPage },
          results: { total, limitation: limit },
        },
      },
      { status: 200 }
    );
  }),

  http.get('*/v1/webhooks/:id', ({ params }) => {
    if (!isSessionActive) {
      return errorResponse(401, 'AuthenticationException', 'Unauthenticated.');
    }
    const webhook = mockWebhooks.find((w) => w.id === params.id);
    if (!webhook) {
      return errorResponse(404, 'NotFoundException', 'Webhook not found.');
    }
    return HttpResponse.json(webhook, { status: 200 });
  }),

  // PUT /v1/webhooks/{id} -> validate + update
  http.put('*/v1/webhooks/:id', async ({ params, request }) => {
    if (!isSessionActive) {
      return errorResponse(401, 'AuthenticationException', 'Unauthenticated.');
    }
    if (!checkCsrf(request)) {
      return errorResponse(419, 'TokenMismatchException', 'CSRF token mismatch.');
    }

    const { id } = params;
    const body: any = await request.json().catch(() => ({}));
    const errors: Record<string, string[]> = {};

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      errors.name = ['The name field is required.'];
    }
    if (!body.url || !/^https?:\/\/.+/i.test(body.url)) {
      errors.url = ['The url must be a valid URL.'];
    }
    if (Object.keys(errors).length > 0) {
      return errorResponse(422, 'ValidationException', 'The given data was invalid.', errors);
    }

    const webhook = mockWebhooks.find((w) => w.id === id);
    if (!webhook) {
      return errorResponse(404, 'NotFoundException', 'Webhook not found.');
    }

    webhook.name = body.name;
    webhook.url = body.url;
    return HttpResponse.json(webhook, { status: 200 });
  }),
];
