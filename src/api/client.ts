import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
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

// Rotate/login/revoke never go through the 401 retry below, so rotate can't retry itself.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/token/issue', '/auth/token/rotate', '/auth/token/revoke', '/csrf'];
const isAuthEndpoint = (url?: string) => !!url && AUTH_ENDPOINTS.some((p) => url.includes(p));

let cachedCsrfToken: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;

// Shared like rotate below, so concurrent requests needing a token don't each fetch their own.
function fetchCsrfToken(): Promise<string | null> {
  if (!csrfFetchPromise) {
    csrfFetchPromise = apiClient
      .get('/csrf')
      .then((response) => {
        cachedCsrfToken = (response.headers['x-csrf-token'] as string) || null;
        return cachedCsrfToken;
      })
      .finally(() => {
        csrfFetchPromise = null;
      });
  }
  return csrfFetchPromise;
}

function ensureCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return Promise.resolve(cachedCsrfToken);
  return fetchCsrfToken();
}

// Called from main.tsx so GET /csrf runs before the first render, not just lazily.
export const primeCsrfToken = ensureCsrfToken;

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

// Our own retry markers, stamped onto the config object replayed via apiClient(originalRequest).
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retriedAfter401?: boolean;
  _retriedAfter419?: boolean;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('/csrf')) {
      cachedCsrfToken = (response.headers['x-csrf-token'] as string) || cachedCsrfToken;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 401: one shared rotate, one retry per request. Excluded here, not in 419 below.
    if (status === 401) {
      if (isAuthEndpoint(originalRequest.url)) {
        return Promise.reject(error);
      }
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

    // 419: refetch CSRF and retry once, for every request including auth endpoints.
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
