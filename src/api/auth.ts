import { apiClient } from './client';
import type { MeResponse } from '../types/api';

interface LoginResponse {
  device_session_token: string;
}

export function login(email: string, password: string, fingerprint: string) {
  return apiClient.post<LoginResponse>(
    '/auth/login',
    { email, password, fingerprint },
    // The mock accepts any non-empty value — no real captcha widget is required.
    { headers: { 'X-Captcha-Token': 'mock-captcha-non-empty-value' } }
  );
}

export function issueSession(deviceSessionToken: string, fingerprint: string) {
  return apiClient.post<void>('/auth/token/issue', { device_session_token: deviceSessionToken, fingerprint });
}

export function revokeSession(fingerprint: string) {
  return apiClient.post<void>('/auth/token/revoke', { fingerprint });
}

export function getMe() {
  return apiClient.get<MeResponse>('/v1/me');
}
