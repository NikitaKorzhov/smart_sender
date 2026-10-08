import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient, setDeviceSessionToken } from '../api/client';
import { getOrCreateFingerprint } from './fingerprint';
import { registerForceLogoutHandler } from './sessionBridge';
import type { MeResponse } from '../types/api';

interface AuthContextValue {
  user: MeResponse | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called on an unrecoverable 401 or a rotate failure — no network request. */
  forceLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);

  const forceLogout = useCallback(() => {
    setDeviceSessionToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const fingerprint = getOrCreateFingerprint();

    const loginResponse = await apiClient.post(
      '/auth/login',
      { email, password, fingerprint },
      { headers: { 'X-Captcha-Token': 'mock-captcha-non-empty-value' } }
    );

    const { device_session_token } = loginResponse.data;
    setDeviceSessionToken(device_session_token);

    await apiClient.post('/auth/token/issue', { device_session_token, fingerprint });

    const me = await apiClient.get<MeResponse>('/v1/me');
    setUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    const fingerprint = getOrCreateFingerprint();
    try {
      await apiClient.post('/auth/token/revoke', { fingerprint });
    } finally {
      forceLogout();
    }
  }, [forceLogout]);

  // Lets api/client.ts (outside the React tree) trigger forceLogout.
  useEffect(() => {
    registerForceLogoutHandler(forceLogout);
  }, [forceLogout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
