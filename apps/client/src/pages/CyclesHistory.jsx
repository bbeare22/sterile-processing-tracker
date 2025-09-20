import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { formatDateTime } from "../utils/date";
import { toCSV, downloadFile } from "../utils/csv";

export default function CyclesHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // machine (title)
        const mRes = await fetch(`${base}/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        // cycles (all for this machine)
        const r = await fetch(`${base}/api/cycles?machineId=${id}`);
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
  }, [id]);

  function exportCSV() {
    const data = (rows || []).map((c) => ({
      "Load #": c.loadNumber || "",
      Started: c.startedAt ? formatDateTime(c.startedAt) : "",
      Completed: c.completedAt ? formatDateTime(c.completedAt) : "",
      Result: c.result || "",
      Items: c.items || "",
      Notes: c.notes || "",
      "Clinic/Dept": c.clinicName || "",
      "Load Staff": c.loadStaff || "",
      "Unload Staff": c.unloadStaff || "",
      "Sterile & Dry (min)": c.sterileDryMinutes ?? "",
      "Max Temp/Pressure": c.maxTempPressure || "",
      "Spore Ran": c.spore?.ran ? "yes" : "no",
      "Spore Well": c.spore?.well || "",
      "Spore Lot": c.spore?.lot || "",
      "Spore Exp": c.spore?.expireDate
        ? formatDateTime(c.spore.expireDate)
        : "",
      "Spore Incubated": c.spore?.incubatedAt
        ? formatDateTime(c.spore.incubatedAt)
        : "",
      "Spore Result": c.spore?.result || "",
      "Spore Verified By": c.spore?.verifiedBy || "",
    }));

    const csv = toCSV(data);
    const name = `cycles-${machine?.name || id}.csv`;
    downloadFile(csv, name, "text/csv");
  }

  return (
    <div>
      {/* Header Bar */}
      <div style={headerBar}>
        <h1 style={{ margin: 0 }}>Cycles — {machine ? machine.name : "…"}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={btnGhost}>
            Export CSV
          </button>
          <Link to={`/machines/${id}`} style={linkBtn}>
            Back to machine
          </Link>
          <Link to={`/cycles?machineId=${id}`} style={linkBtn}>
            Log cycle
          </Link>
        </div>
      </div>

      {err && (
        <div style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          Failed to load: {err}
        </div>
      )}

      {/* Table */}
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
            {loading ? (
              <tr>
                <td colSpan={5} style={{ ...td, opacity: 0.7 }}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r._id} style={tr}>
                  <td style={td}>{r.loadNumber || "—"}</td>
                  <td style={td}>{formatDateTime(r.startedAt)}</td>
                  <td style={td}>{formatDateTime(r.completedAt)}</td>
                  <td style={td}>{r.result || "—"}</td>
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
    </div>
  );
}

/* ---- styles (matches MaintenanceHistory look) ---- */
const headerBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const linkBtn = {
  color: "#cbd5e1",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "8px 12px",
};

const btnGhost = {
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
