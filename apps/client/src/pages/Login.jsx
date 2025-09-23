import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../components/Toast/ToastProvider";
import "./login.css";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { show } = useToast();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login({ email, password });
      show("Welcome back!", { tone: "ok" });
      nav("/");
    } catch (e) {
      const msg = String(e.message || e) || "Login failed";
      setErr(msg);
      show(msg, { tone: "danger", ms: 5000 });
    }
  }

  return (
    <div className="login__wrap">
      <h1 className="login__title">Log in</h1>

      {err && (
        <div className="login__error" role="alert">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="login__form">
        <input
          className="login__input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          required
        />
        <input
          className="login__input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
          required
        />
        <button className="login__btn">Log in</button>
      </form>

      <div className="login__footer">
        No account?{" "}
        <Link to="/register" className="login__link">
          Register
        </Link>
      </div>
    </div>
  );
}
