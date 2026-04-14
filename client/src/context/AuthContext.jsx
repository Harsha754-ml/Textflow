import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginApi, setAuthToken, setUnauthorizedHandler } from '../api/client';

const TOKEN_KEY = 'sms_dashboard_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyToken = useCallback((nextToken) => {
    if (nextToken) {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }

    setAuthToken(nextToken || null);
    setToken(nextToken || null);
  }, []);

  const logout = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setIsInitializing(false);
      return;
    }

    try {
      setAuthToken(token);
      const response = await getMe();
      setUser(response.user || null);
    } catch {
      logout();
    } finally {
      setIsInitializing(false);
    }
  }, [token, logout]);

  useEffect(() => {
    void fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (username, password) => {
    const response = await loginApi(username, password);
    applyToken(response.token);
    setUser(response.user || null);
    return response;
  }, [applyToken]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isInitializing,
    login,
    logout,
  }), [token, user, isInitializing, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
