import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // restore user on page load
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
  }, [token]);

  async function register({
    email,
    password,
    name,
    employeeId,
    sterilizationNumber,
  }) {
    const r = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        name,
        employeeId,
        sterilizationNumber,
      }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    const { token: t, user: u } = await r.json();
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function login({ email, password }) {
    const r = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    const { token: t, user: u } = await r.json();
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider
      value={{ user, token, isAuthed: !!token, register, login, logout }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
