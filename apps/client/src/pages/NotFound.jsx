import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={outer}>
      <div style={card}>
        <h1 style={h1}>404 — Page Not Found</h1>
        <p style={p}>
          Oops! The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link to="/" style={btn}>
          ⬅ Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

const outer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "60vh",
};

const card = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  boxShadow: "var(--shadow-soft)",
  padding: "40px",
  maxWidth: "480px",
  textAlign: "center",
};

const h1 = {
  marginBottom: "16px",
  fontSize: "1.75rem",
};

const p = {
  marginBottom: "24px",
  color: "var(--color-text-muted)",
};

const btn = {
  display: "inline-block",
  padding: "10px 16px",
  borderRadius: "12px",
  border: "1px solid var(--color-brand)",
  background: "var(--color-brand)",
  color: "#fff",
  textDecoration: "none",
  transition: "background 0.2s, border-color 0.2s",
};
