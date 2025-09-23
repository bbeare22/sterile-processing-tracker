import { useEffect, useMemo, useState } from "react";
import Skeleton from "../components/Skeleton/Skeleton";
import { apiFetch } from "../utils/api";

function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || "";
  const y = yyyymmdd.slice(0, 4),
    m = yyyymmdd.slice(4, 6),
    d = yyyymmdd.slice(6, 8);
  return `${m}/${d}/${y}`;
}

export default function Recalls() {
  const [brand, setBrand] = useState("STERIS");
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const path = useMemo(() => {
    const params = new URLSearchParams({ brand, limit: String(limit) });
    return `/api/external/recalls?${params.toString()}`;
  }, [brand, limit]);

  // Fetch recalls via apiFetch
  const fetchRecalls = () => {
    setLoading(true);
    setErr("");
    apiFetch(path)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d) => {
        setRows(d.rows || []);
        setLastUpdated(new Date());
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRecalls, [path]);

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Recalls</h1>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand keyword (e.g., STERIS, AMSCO)"
          style={input}
          aria-label="Brand filter"
        />
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={input}
          aria-label="Limit"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button onClick={fetchRecalls} style={btn}>
          Refresh
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12 }}>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </div>
      </div>

      {/* Content */}
      <div style={tableWrap}>
        <table style={table}>
          <thead style={thead}>
            <tr>
              <th style={th}>Product</th>
              <th style={th}>Reason</th>
              <th style={th}>Firm</th>
              <th style={th}>Status</th>
              <th style={th}>Class</th>
              <th style={th}>Report Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows />}
            {!loading &&
              !err &&
              rows.length > 0 &&
              rows.map((r) => (
                <tr key={r.recallNumber} style={tr}>
                  <td style={td}>{r.product}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {r.reason}
                  </td>
                  <td style={td}>{r.recallingFirm}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td}>{r.classification}</td>
                  <td style={td}>{formatDate(r.reportDate)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Empty state & error */}
        {!loading && !err && rows.length === 0 && (
          <div style={empty}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>
              No recalls found
            </div>
            <div style={{ opacity: 0.75, marginBottom: 12 }}>
              Try a different brand keyword (e.g., <code>AMSCO</code>).
            </div>
            <button onClick={fetchRecalls} style={btn}>
              Try Again
            </button>
          </div>
        )}

        {!loading && err && (
          <div style={empty}>
            <div
              style={{
                color: "var(--color-danger)",
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              Failed to load: {err}
            </div>
            <button onClick={fetchRecalls} style={btn}>
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Skeleton rows ---------- */
function SkeletonRows({ count = 6 }) {
  const rows = Array.from({ length: count });
  return (
    <>
      {rows.map((_, i) => (
        <tr key={i} style={tr}>
          <td style={td}>
            <Skeleton w="90%" />
          </td>
          <td style={td}>
            <Skeleton w="95%" />
          </td>
          <td style={td}>
            <Skeleton w="60%" />
          </td>
          <td style={td}>
            <Skeleton w="50%" />
          </td>
          <td style={td}>
            <Skeleton w="40%" />
          </td>
          <td style={td}>
            <Skeleton w="50%" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* ---------- styles ---------- */
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
const empty = {
  display: "grid",
  placeItems: "center",
  gap: 8,
  padding: "24px",
};
