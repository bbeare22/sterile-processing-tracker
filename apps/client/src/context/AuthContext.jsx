import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, register as apiRegister } from '../utils/auth';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || user) return;
    (async () => {
      try {
        setLoading(true);
        const { user: u } = await apiMe();
        if (u) {
          localStorage.setItem('user', JSON.stringify(u));
          setUser(u);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user]);

  async function register(payload) {
    setLoading(true);
    try {
      const { token: t, user: u } = await apiRegister(payload);
      if (t) localStorage.setItem('token', t);
      if (u) localStorage.setItem('user', JSON.stringify(u));
      setToken(t || '');
      setUser(u || null);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  }

  async function login(credentials) {
    setLoading(true);
    try {
      const { token: t, user: u } = await apiLogin(credentials);
      if (t) localStorage.setItem('token', t);
      if (u) localStorage.setItem('user', JSON.stringify(u));
      setToken(t || '');
      setUser(u || null);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    window.location.href = '/login';
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthed: !!token,
      loading,
      register,
      login,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
