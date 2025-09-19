import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDateTime } from "../utils/date";

export default function MachineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [maint, setMaint] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // machine
        const mRes = await fetch(`${base}/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setM(mJson.machine || null);

        // recent maintenance for this machine
        const maRes = await fetch(
          `${base}/api/maintenance?machineId=${id}&limit=10`
        );
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        const maJson = await maRes.json();
        setMaint(maJson.maintenance || []);

        // recent cycles for THIS machine (filter fixed)
        const cRes = await fetch(`${base}/api/cycles?machineId=${id}&limit=10`);
        if (!cRes.ok) throw new Error(`Cycles HTTP ${cRes.status}`);
        const cJson = await cRes.json();
        setCycles(cJson.cycles || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>{m.name}</h1>
        <div>
          <Link to="/machines" style={link}>
            Back to list
          </Link>
          <Link
            to={`/maintenance?machineId=${m._id}`}
            style={{ ...link, marginLeft: 8 }}
          >
            Log maintenance
          </Link>
          {m.type === "sterilizer" && (
            <Link
              to={`/cycles/log?machineId=${m._id}`}
              style={{ ...link, marginLeft: 8 }}
            >
              Log cycle
            </Link>
          )}
        </div>
      </div>

      {/* Meta */}
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
      </div>

      {/* Recent Sterilizer Cycles (if sterilizer) */}
      {m.type === "sterilizer" && (
        <>
          <h2 style={{ margin: "20px 0 12px" }}>Recent Sterilizer Cycles</h2>
          <div style={tableWrap}>
            <table style={table}>
              <thead style={thead}>
                <tr>
                  <th style={th}>Started</th>
                  <th style={th}>Completed</th>
                  <th style={th}>Load #</th>
                  <th style={th}>Result</th>
                  <th style={th}>Items</th>
                  <th style={th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {cycles.length ? (
                  cycles.map((c) => (
                    <tr key={c._id} style={tr}>
                      <td style={td}>{formatDateTime(c.startedAt)}</td>
                      <td style={td}>{formatDateTime(c.completedAt)}</td>
                      <td style={td}>{c.loadNumber || "—"}</td>
                      <td style={td}>{c.result}</td>
                      <td style={td}>{c.itemsText || "—"}</td>
                      <td style={td}>{c.notes || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ ...td, opacity: 0.7 }}>
                      No cycles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to={`/machines/${m._id}/cycles`} style={link}>
              View all cycles
            </Link>
          </div>
        </>
      )}

      {/* Recent Maintenance */}
      <h2 style={{ margin: "20px 0 12px" }}>Recent Maintenance</h2>
      <div style={tableWrap}>
        <table style={table}>
          <thead style={thead}>
            <tr>
              <th style={th}>Type</th>
              <th style={th}>Performed At</th>
              <th style={th}>Volume (mL)</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {maint.length ? (
              maint.map((row) => (
                <tr key={row._id} style={tr}>
                  <td style={td}>{row.type}</td>
                  <td style={td}>{formatDateTime(row.performedAt)}</td>
                  <td style={td}>{Number(row.volumeUsedMl || 0)}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {row.notes || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ ...td, opacity: 0.7 }}>
                  No maintenance yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <Link to={`/machines/${m._id}/maintenance`} style={link}>
          View all maintenance
        </Link>
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
const tableWrap = {
  overflow: "auto",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-soft)",
};
const table = { width: "100%", borderCollapse: "separate", borderSpacing: 0 };
const thead = { background: "#0e1525", position: "sticky", top: 0 };
const th = { textAlign: "left", padding: "12px 16px" };
const tr = { borderTop: "1px solid var(--color-border)" };
const td = { padding: "12px 16px" };
