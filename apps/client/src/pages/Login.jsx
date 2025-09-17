import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login({ email, password });
      nav("/"); // go home on success
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div style={wrap}>
      <h1>Log in</h1>
      {err && <div style={errBox}>{err}</div>}
      <form onSubmit={onSubmit} style={form}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />
        <button style={btn}>Log in</button>
      </form>
      <div style={{ marginTop: 12 }}>
        No account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}

const wrap = { maxWidth: 420, margin: "40px auto" };
const form = { display: "grid", gap: 12 };
const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "#0e1525",
  color: "var(--color-text)",
};
const btn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--color-brand)",
  background: "var(--color-brand)",
  color: "#fff",
  cursor: "pointer",
};
const errBox = {
  border: "1px solid var(--color-danger)",
  padding: "8px 10px",
  borderRadius: 12,
  marginBottom: 12,
  color: "var(--color-danger)",
};
