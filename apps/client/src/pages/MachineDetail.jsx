import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Skeleton from "../components/Skeleton/Skeleton";
import { formatDateTime } from "../utils/date";
import { apiFetch } from "../utils/api";

export default function MachineDetail() {
  const { id } = useParams();

  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Maintenance
  const [maint, setMaint] = useState([]);
  const [loadingMaint, setLoadingMaint] = useState(true);

  // Cycles (sterilizer only)
  const [cycles, setCycles] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // fetch machine
        const mRes = await apiFetch(`/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        const machine = mJson.machine || null;
        setM(machine);

        // fetch recent maintenance for this machine
        setLoadingMaint(true);
        const maRes = await apiFetch(
          `/api/maintenance?machineId=${id}&limit=10`
        );
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        const maJson = await maRes.json();
        setMaint(maJson.maintenance || []);
        setLoadingMaint(false);

        // if sterilizer, fetch recent cycles
        if (machine && machine.type === "sterilizer") {
          setLoadingCycles(true);
          const cRes = await apiFetch(`/api/cycles?machineId=${id}&limit=10`);
          if (!cRes.ok) throw new Error(`Cycles HTTP ${cRes.status}`);
          const cJson = await cRes.json();
          setCycles(cJson.cycles || []);
          setLoadingCycles(false);
        } else {
          setCycles([]);
          setLoadingCycles(false);
        }
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

  const isSterilizer = m.type === "sterilizer";

  return (
    <div>
      {/* Header and actions */}
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
            title="Log maintenance for this machine"
          >
            Log maintenance
          </Link>
          {isSterilizer && (
            <Link
              to={`/cycles?machineId=${m._id}`}
              style={{ ...link, marginLeft: 8 }}
              title="Log sterilizer cycle"
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
        {/* Only show last descale for washers */}
        {m.type === "washer" && (
          <div>
            <strong>Last Descale:</strong> {formatDateTime(m.lastDescaleAt)}
          </div>
        )}
      </div>

      {/* Sterilizer cycles (only for sterilizers) */}
      {isSterilizer && (
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
                {loadingCycles ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`cy-skel-${i}`} style={tr}>
                      <td
                        colSpan={6}
                        style={{ ...td, paddingTop: 10, paddingBottom: 10 }}
                      >
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "flex", gap: 16 }}>
                            <Skeleton w="22%" h={14} />
                            <Skeleton w="22%" h={14} />
                            <Skeleton w="12%" h={14} />
                            <Skeleton w="10%" h={14} />
                          </div>
                          <Skeleton w="40%" h={12} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : cycles.length ? (
                  cycles.map((c) => (
                    <tr key={c._id} style={tr}>
                      <td style={td}>{formatDateTime(c.startedAt)}</td>
                      <td style={td}>
                        {c.completedAt ? formatDateTime(c.completedAt) : "—"}
                      </td>
                      <td style={td}>{c.loadNumber || "—"}</td>
                      <td style={td}>{c.result}</td>
                      <td style={{ ...td, color: "var(--color-text-muted)" }}>
                        {(c.items || []).join(", ") || "—"}
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
        </>
      )}

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
            {loadingMaint ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`ma-skel-${i}`} style={tr}>
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
            ) : maint.length ? (
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

      {/* Optional: link to full history page */}
      <div style={{ marginTop: 12 }}>
        <Link to={`/machines/${id}/maintenance`} style={link}>
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
