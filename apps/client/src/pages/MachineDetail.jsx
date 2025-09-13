import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function MachineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    setLoading(true);
    setErr("");
    fetch(`${base}/api/machines`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d) => {
        const found = (d.machines || []).find((x) => x._id === id);
        setM(found || null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (err)
    return (
      <div style={{ color: "var(--color-danger)" }}>Failed to load: {err}</div>
    );
  if (!m)
    return (
      <div>
        <h1>Machine not found</h1>
        <Link to="/machines" style={link}>
          Back to list
        </Link>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>{m.name}</h1>
        <Link to="/machines" style={link}>
          Back to list
        </Link>
      </div>

      <div style={panel}>
        <div>
          <strong>ID:</strong> {m._id}
        </div>
        <div>
          <strong>Model:</strong> {m.model}
        </div>
        <div>
          <strong>Type:</strong> {m.type}
        </div>
        <div>
          <strong>Location:</strong> {m.location}
        </div>
        <div>
          <strong>Status:</strong> {m.status}
        </div>
        <div>
          <strong>Last Descale:</strong> {formatDate(m.lastDescaleAt)}
        </div>
      </div>
    </div>
  );
}

const panel = {
  display: "grid",
  gap: 10,
  padding: "24px",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-soft)",
};
const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "8px 12px",
};
