/**
 * NexusAuth React Provider
 *
 * SECURITY TRADE-OFF — localStorage token storage:
 *
 * Tokens (access + refresh) are stored in localStorage. This exposes them to
 * any JavaScript running on the page, including XSS attacks. If a third-party
 * library is compromised or user input is not properly sanitized, an attacker
 * could steal tokens via document.localStorage.
 *
 * For production with high sensitivity, consider:
 *   - Storing the refresh token in an httpOnly cookie (requires a proxy endpoint
 *     on the backend to exchange the cookie for an access token)
 *   - Keeping only the access token in memory (lost on page refresh, but never
 *     accessible to XSS)
 *   - Using a service worker to intercept and attach tokens to API requests
 *
 * This SDK uses localStorage for simplicity and developer experience. The
 * trade-off is documented here as a conscious decision — consumers of this SDK
 * should evaluate their threat model before using it in production.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { NexusAuthClient } from '../client';
import { AuthTokens, NexusUser, UserProfile, SessionInfo } from '../types';

const STORAGE_KEY = 'nexus_auth_tokens';
const REFRESH_THRESHOLD_MS = 30 * 1000; // refresh 30s before expiry

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  baseUrl: string;
  children: React.ReactNode;
}

export function AuthProvider({ baseUrl, children }: AuthProviderProps) {
  const clientRef = useRef(new NexusAuthClient({ baseUrl }));
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    loading: true,
    error: null,
  });

  const loadTokens = useCallback((): AuthTokens | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const saveTokens = useCallback((tokens: AuthTokens | null) => {
    if (tokens) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearAuth = useCallback(() => {
    saveTokens(null);
    setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  }, [saveTokens]);

  const refreshUser = useCallback(async () => {
    const tokens = loadTokens();
    if (!tokens) return;

    try {
      const user = await clientRef.current.me(tokens.accessToken);
      setState((prev) => ({ ...prev, user, isAuthenticated: true, loading: false }));
    } catch {
      clearAuth();
    }
  }, [loadTokens, clearAuth]);

  const scheduleRefresh = useCallback((tokens: AuthTokens) => {
    try {
      const payload = JSON.parse(
        atob(tokens.accessToken.split('.')[1]),
      );
      const expMs = payload.exp * 1000;
      const delay = expMs - Date.now() - REFRESH_THRESHOLD_MS;

      if (delay <= 0) return;

      setTimeout(async () => {
        try {
          const newTokens = await clientRef.current.refresh(tokens.refreshToken);
          saveTokens(newTokens);
          setState((prev) => ({ ...prev, tokens: newTokens }));
          scheduleRefresh(newTokens);
        } catch {
          clearAuth();
        }
      }, delay);
    } catch {
      // invalid token format
    }
  }, [saveTokens, clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tokens = await clientRef.current.login(email, password);
      saveTokens(tokens);
      const user = await clientRef.current.me(tokens.accessToken);
      setState({
        user,
        tokens,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      scheduleRefresh(tokens);
    } catch (err: any) {
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        loading: false,
        error: err.message || 'Login failed',
      });
      throw err;
    }
  }, [saveTokens, scheduleRefresh]);

  const logout = useCallback(async () => {
    const tokens = loadTokens();
    if (tokens) {
      try {
        await clientRef.current.logout(tokens.accessToken, tokens.refreshToken);
      } catch {
        // ignore errors on logout
      }
    }
    clearAuth();
  }, [loadTokens, clearAuth]);

  useEffect(() => {
    const tokens = loadTokens();
    if (!tokens) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    refreshUser();
    scheduleRefresh(tokens);
  }, [loadTokens, refreshUser, scheduleRefresh]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
