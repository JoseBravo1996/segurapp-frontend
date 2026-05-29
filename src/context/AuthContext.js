import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as segurappApi from '../services/segurappApi';
import { ApiError } from '../services/apiClient';
import { clearToken, getToken, setToken } from '../services/authStorage';
import { setUnauthorizedHandler } from '../services/authEvents';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = useCallback(async () => {
    await clearToken();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setIsAuthenticated(false);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      setIsAuthenticated(!!token);
      setIsReady(true);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { token } = await segurappApi.login(email, password);
    await setToken(token);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(async (payload) => {
    await segurappApi.register(payload);
  }, []);

  return (
    <AuthContext.Provider value={{ isReady, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export { ApiError };
