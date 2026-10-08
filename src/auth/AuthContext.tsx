import React, { useState, useCallback, useEffect } from 'react';
import { setDeviceSessionToken } from '../api/client';
import { login as loginRequest, issueSession, revokeSession, getMe } from '../api/auth';
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

    const loginResponse = await loginRequest(email, password, fingerprint);
    const { device_session_token } = loginResponse.data;
    setDeviceSessionToken(device_session_token);

    try {
      await issueSession(device_session_token, fingerprint);
    } catch (err) {
      // issue failed — the token was never actually activated into a session, don't keep it around.
      setDeviceSessionToken(null);
      throw err;
    }

    const me = await getMe();
    setUser(me.data);
  }, []);

  const logout = useCallback(async () => {
    const fingerprint = getOrCreateFingerprint();
    try {
      await revokeSession(fingerprint);
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
