import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast/ToastProvider";

export default function Register() {
  const { register: reg } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [sterilizationNumber, setSterilizationNumber] = useState("");
  const [err, setErr] = useState("");
  const { show } = useToast();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await reg({ email, password, name, employeeId, sterilizationNumber });
      show("Account created!", { tone: "ok" });
      nav("/");
    } catch (e) {
      setErr(String(e.message || e));
      show(e.message || "Registration failed", { tone: "danger", ms: 5000 });
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Create account</h1>
      {err && (
        <div
          style={{
            border: "1px solid var(--color-danger)",
            padding: "8px 10px",
            borderRadius: 12,
            marginBottom: 12,
            color: "var(--color-danger)",
          }}
        >
          {err}
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder="Password (min 6)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />
        <input
          placeholder="Employee ID"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={input}
        />
        <input
          placeholder="Sterilization Number"
          value={sterilizationNumber}
          onChange={(e) => setSterilizationNumber(e.target.value)}
          style={input}
        />
        <button style={btn}>Register</button>
      </form>
      <div style={{ marginTop: 12 }}>
        Have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}

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
