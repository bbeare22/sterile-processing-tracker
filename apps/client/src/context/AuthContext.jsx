import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // restore user/token on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
  }, []);

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
    const { token, user } = await r.json();
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  }

  async function login({ email, password }) {
    const r = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    const { token, user } = await r.json();
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
