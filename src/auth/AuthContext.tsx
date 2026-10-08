import React, { useState, useCallback, useEffect } from 'react';
import { apiClient, setDeviceSessionToken } from '../api/client';
import { getOrCreateFingerprint } from './fingerprint';
import { registerForceLogoutHandler } from './sessionBridge';
import { AuthContext } from './AuthContextBase';
import type { MeResponse } from '../types/api';

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

    try {
      await apiClient.post('/auth/token/issue', { device_session_token, fingerprint });
    } catch (err) {
      // issue failed — the token was never actually activated into a session, don't keep it around.
      setDeviceSessionToken(null);
      throw err;
    }

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
