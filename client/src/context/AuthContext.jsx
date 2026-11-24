import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, clearSessionHint, hasSessionHint, refreshSession, setAccessToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const applySession = useCallback(
    (data) => {
      // Drop guest/previous-account caches so personalised fields (votes, membership,
      // notifications) always come from the session that is now active.
      queryClient.clear();
      setAccessToken(data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;
    if (!hasSessionHint()) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    refreshSession()
      .then((data) => {
        if (active) applySession(data);
      })
      .catch(() => {
        if (active) setAccessToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applySession]);

  const login = useCallback(
    async (identifier, password) => {
      const data = await api('/auth/login', { method: 'POST', body: { identifier, password } });
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const data = await api('/auth/register', { method: 'POST', body: payload });
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Local session is cleared regardless of network state.
    }
    queryClient.clear();
    setAccessToken(null);
    setToken(null);
    setUser(null);
    clearSessionHint();
  }, [queryClient]);

  const updateUser = useCallback((patch) => {
    setUser((previous) => (previous ? { ...previous, ...patch } : previous));
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, updateUser }),
    [user, token, loading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
