import { useEffect, useState } from "react";

function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4),
    m = yyyymmdd.slice(4, 6),
    d = yyyymmdd.slice(6, 8);
  return `${m}/${d}/${y}`;
}

export default function Recalls() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL; // http://localhost:3001
    const url = `${base}/api/external/recalls?brand=STERIS&limit=25`;

    fetch(url)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d) => setRows(d.rows || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading recalls…</div>;
  if (err) return <div>Failed to load recalls: {err}</div>;
  if (!rows.length) return <div>No recalls found.</div>;

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Recalls</h1>
      <div
        style={{
          overflow: "auto",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead style={{ background: "#0e1525", position: "sticky", top: 0 }}>
            <tr>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>
                Product
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>
                Reason
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>Firm</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>
                Status
              </th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>Class</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>
                Report Date
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.recallNumber}
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <td style={{ padding: "12px 16px" }}>{r.product}</td>
                <td
                  style={{
                    padding: "12px 16px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {r.reason}
                </td>
                <td style={{ padding: "12px 16px" }}>{r.recallingFirm}</td>
                <td style={{ padding: "12px 16px" }}>{r.status}</td>
                <td style={{ padding: "12px 16px" }}>{r.classification}</td>
                <td style={{ padding: "12px 16px" }}>
                  {formatDate(r.reportDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
