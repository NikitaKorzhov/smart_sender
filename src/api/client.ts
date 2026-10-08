import axios from 'axios';
import { getOrCreateFingerprint } from '../auth/fingerprint';
import { triggerForceLogout } from '../auth/sessionBridge';

// device_session_token lives in memory only — never localStorage or the URL.
let memoryDeviceSessionToken: string | null = null;
export const setDeviceSessionToken = (token: string | null) => {
  memoryDeviceSessionToken = token;
};
export const getDeviceSessionToken = () => memoryDeviceSessionToken;

export const apiClient = axios.create({ baseURL: '' });

// X-Requested-With on every request, no exceptions.
apiClient.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

// Auth endpoints are excluded from the 401-retry logic below so that
// rotate/login/revoke can never recursively retry themselves.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/token/issue', '/auth/token/rotate', '/auth/token/revoke', '/csrf'];
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((p) => url.includes(p));

let cachedCsrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  const response = await apiClient.get('/csrf');
  cachedCsrfToken = (response.headers['x-csrf-token'] as string) || null;
  return cachedCsrfToken;
}

async function ensureCsrfToken(): Promise<string | null> {
  if (!cachedCsrfToken) await fetchCsrfToken();
  return cachedCsrfToken;
}

apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();
  if ((method === 'POST' || method === 'PUT') && !config.url?.includes('/csrf')) {
    const token = await ensureCsrfToken();
    if (token) config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});

// Shared rotate across concurrent 401s.
let refreshPromise: Promise<unknown> | null = null;

function rotateSessionOnce(): Promise<unknown> {
  if (!refreshPromise) {
    const fingerprint = getOrCreateFingerprint();
    refreshPromise = apiClient
      .post('/auth/token/rotate', { fingerprint })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('/csrf')) {
      cachedCsrfToken = (response.headers['x-csrf-token'] as string) || cachedCsrfToken;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // 401: one shared rotate, one retry per request
    if (status === 401) {
      if (originalRequest._retriedAfter401) {
        // A second 401 after a retry already happened -> end the session.
        triggerForceLogout();
        return Promise.reject(error);
      }
      originalRequest._retriedAfter401 = true;

      try {
        await rotateSessionOnce();
        return apiClient(originalRequest);
      } catch (rotateError) {
        triggerForceLogout();
        return Promise.reject(rotateError);
      }
    }

    // 419: refetch CSRF and retry once
    if (status === 419) {
      if (originalRequest._retriedAfter419) {
        return Promise.reject(error);
      }
      originalRequest._retriedAfter419 = true;

      cachedCsrfToken = null;
      await fetchCsrfToken();
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);
