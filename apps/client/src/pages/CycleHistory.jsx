import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatDateTime } from "../utils/date";
import { toCSV, downloadFile } from "../utils/csv";

export default function CycleHistory() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    async function load() {
      try {
        setLoading(true);
        setErr("");

        const mRes = await fetch(`${base}/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        const r = await fetch(
          `${base}/api/cycles?machineId=${id}&limit=${limit}`
        );
        if (!r.ok) throw new Error(`Cycles HTTP ${r.status}`);
        const j = await r.json();
        setRows(j.cycles || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, limit]);

  function exportCSV() {
    const data = rows.map((c) => ({
      Machine: machine?.name || c.machineId?.name || "",
      LoadNumber: c.loadNumber || "",
      Result: c.result,
      StartedAt: c.startedAt,
      CompletedAt: c.completedAt,
      Items: c.itemsText || "",
      Notes: c.notes || "",
    }));
    const csv = toCSV(data);
    downloadFile(
      csv,
      `${(machine?.name || "cycles").replace(/\s+/g, "_")}_cycles.csv`,
      "text/csv"
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>
          {machine ? `Cycles — ${machine.name}` : "Cycles"}
        </h1>
        <div>
          <Link to={`/machines/${id}`} style={link}>
            Back to machine
          </Link>
          <button onClick={exportCSV} style={{ ...linkBtn, marginLeft: 8 }}>
            Export CSV
          </button>
        </div>
      </div>

      {err && (
        <div style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          Failed to load: {err}
        </div>
      )}

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
            {loading ? (
              <tr>
                <td colSpan={6} style={td}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((c) => (
                <tr key={c._id} style={tr}>
                  <td style={td}>{formatDateTime(c.startedAt)}</td>
                  <td style={td}>{formatDateTime(c.completedAt)}</td>
                  <td style={td}>{c.loadNumber || "—"}</td>
                  <td style={td}>{c.result}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {c.itemsText || "—"}
                  </td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {c.notes || "—"}
                  </td>
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

      {!loading && rows.length >= limit && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setLimit((n) => n + 20)} style={linkBtn}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "8px 12px",
};
const linkBtn = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  cursor: "pointer",
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
