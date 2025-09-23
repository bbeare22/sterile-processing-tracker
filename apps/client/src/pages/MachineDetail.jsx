import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/date";

export default function MachineDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [maint, setMaint] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        const [mRes, maRes, cyRes] = await Promise.all([
          apiFetch(`/api/machines/${id}`),
          apiFetch(`/api/maintenance?machineId=${id}&limit=10`),
          apiFetch(`/api/cycles?machineId=${id}&limit=10`),
        ]);

        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        if (!cyRes.ok) throw new Error(`Cycles HTTP ${cyRes.status}`);

        const mJson = await mRes.json();
        const maJson = await maRes.json();
        const cyJson = await cyRes.json();

        setM(mJson.machine || null);
        setMaint(maJson.maintenance || []);
        setCycles(cyJson.cycles || []);
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
              to={`/cycles?machineId=${m._id}`}
              style={{ ...link, marginLeft: 8 }}
            >
              Log cycle
            </Link>
          )}
        </div>
      </div>

      {/* Machine facts */}
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
        {m.type === "washer" && (
          <div>
            <strong>Last Descale:</strong>{" "}
            {m.lastDescaleAt ? formatDateTime(m.lastDescaleAt) : "—"}
          </div>
        )}
      </div>

      {/* Maintenance history */}
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
      <div style={{ marginTop: 8 }}>
        <Link to={`/machines/${id}/maintenance`} style={link}>
          View all maintenance
        </Link>
      </div>

      {/* Cycle history (sterilizer only) */}
      {m.type === "sterilizer" && (
        <>
          <h2 style={{ margin: "20px 0 12px" }}>Recent Cycles</h2>
          <div style={tableWrap}>
            <table style={table}>
              <thead style={thead}>
                <tr>
                  <th style={th}>Load #</th>
                  <th style={th}>Started</th>
                  <th style={th}>Completed</th>
                  <th style={th}>Result</th>
                  <th style={th}>Items</th>
                </tr>
              </thead>
              <tbody>
                {cycles.length ? (
                  cycles.map((r) => (
                    <tr key={r._id} style={tr}>
                      <td style={td}>{r.loadNumber || "—"}</td>
                      <td style={td}>{formatDateTime(r.startedAt)}</td>
                      <td style={td}>
                        {r.completedAt ? formatDateTime(r.completedAt) : "—"}
                      </td>
                      <td style={td}>{r.result}</td>
                      <td style={{ ...td, color: "var(--color-text-muted)" }}>
                        {r.items || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ ...td, opacity: 0.7 }}>
                      No cycles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8 }}>
            <Link to={`/machines/${id}/cycles`} style={link}>
              View all cycles
            </Link>
          </div>
        </>
      )}
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
