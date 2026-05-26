import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

/** @typedef {{ id: string; fullName: string; email: string; role: string }} User */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {User | null} */ (null));
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me');
      const u = res?.data?.user;
      if (u && u.id && u.email) {
        setUser({
          id: String(u.id),
          fullName: String(u.fullName || ''),
          email: String(u.email),
          role: String(u.role || 'customer'),
        });
      } else {
        setUser(null);
        clearToken();
      }
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshMe();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const login = useCallback(async (email, password, remember = true) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
      skipAuth: true,
    });
    const token = res?.token;
    if (!token || typeof token !== 'string') {
      throw new Error('Sunucu yanıtı geçersiz.');
    }
    setToken(token, { remember });
    const u = res?.data?.user;
    const normalized =
      u?.id && u?.email
        ? {
            id: String(u.id),
            fullName: String(u.fullName || ''),
            email: String(u.email),
            role: String(u.role || 'customer'),
          }
        : null;
    if (normalized) {
      setUser(normalized);
    } else {
      await refreshMe();
    }
    return normalized;
  }, [refreshMe]);

  const register = useCallback(async (payload, remember = true) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    });
    const token = res?.token;
    if (!token || typeof token !== 'string') {
      throw new Error('Sunucu yanıtı geçersiz.');
    }
    setToken(token, { remember });
    const u = res?.data?.user;
    if (u && u.id && u.email) {
      setUser({
        id: String(u.id),
        fullName: String(u.fullName || ''),
        email: String(u.email),
        role: String(u.role || 'customer'),
      });
    } else {
      await refreshMe();
    }
  }, [refreshMe]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
