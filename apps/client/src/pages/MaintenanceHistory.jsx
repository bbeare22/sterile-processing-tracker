import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Skeleton from "../components/Skeleton/Skeleton";
import { formatDateTime } from "../utils/date";
import { toCSV, downloadFile } from "../utils/csv";
import { apiFetch } from "../utils/api";

export default function MaintenanceHistory() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // fetch machine (for title)
        const mRes = await apiFetch(`/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        // fetch maintenance list
        const r = await apiFetch(
          `/api/maintenance?machineId=${id}&limit=${limit}`
        );
        if (!r.ok) throw new Error(`Maintenance HTTP ${r.status}`);
        const j = await r.json();
        setRows(j.maintenance || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, limit]);

  function exportCSV() {
    if (!Array.isArray(rows) || rows.length === 0) {
      const csv = toCSV([]);
      downloadFile(
        csv,
        `${machine?.name || "machine"}-maintenance.csv`,
        "text/csv"
      );
      return;
    }

    const csvRows = rows.map((r) => ({
      Machine: machine?.name || "",
      Type: r.type,
      PerformedAt: r.performedAt ? new Date(r.performedAt).toISOString() : "",
      VolumeMl: r.volumeUsedMl ?? "",
      Notes: r.notes || "",
    }));

    const csv = toCSV(csvRows);
    downloadFile(
      csv,
      `${machine?.name || "machine"}-maintenance.csv`,
      "text/csv"
    );
  }

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
        <h1 style={{ marginBottom: 16 }}>
          {machine ? `Maintenance — ${machine.name}` : "Maintenance History"}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={btn}>
            Export CSV
          </button>
          <Link to={`/machines/${id}`} style={link}>
            Back to machine
          </Link>
          <Link
            to={`/maintenance?machineId=${id}`}
            style={{ ...link, marginLeft: 0 }}
          >
            Log maintenance
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
              <th style={th}>Type</th>
              <th style={th}>Performed At</th>
              <th style={th}>Volume (mL)</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skel-${i}`} style={tr}>
                  <td
                    colSpan={4}
                    style={{ ...td, paddingTop: 10, paddingBottom: 10 }}
                  >
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", gap: 16 }}>
                        <Skeleton w="18%" h={14} />
                        <Skeleton w="24%" h={14} />
                        <Skeleton w="12%" h={14} />
                      </div>
                      <Skeleton w="40%" h={12} />
                    </div>
                  </td>
                </tr>
              ))
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r._id} style={tr}>
                  <td style={td}>{r.type}</td>
                  <td style={td}>{formatDateTime(r.performedAt)}</td>
                  <td style={td}>{Number(r.volumeUsedMl || 0)}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {r.notes || "—"}
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

      {!loading && rows.length >= limit && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setLimit((n) => n + 20)} style={btn}>
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
const btn = {
  padding: "10px 14px",
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
