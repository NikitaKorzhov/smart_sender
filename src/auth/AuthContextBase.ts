import { createContext } from 'react';
import type { MeResponse } from '../types/api';

export interface AuthContextValue {
  user: MeResponse | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called on an unrecoverable 401 or a rotate failure — no network request. */
  forceLogout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
