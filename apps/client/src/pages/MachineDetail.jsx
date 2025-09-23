import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/date";
import "./machinedetail.css";

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

  if (err) return <div className="md__error">Failed to load: {err}</div>;

  if (!m)
    return (
      <div>
        <h1>Machine not found</h1>
        <Link to="/machines" className="md__linkBtn">
          Back to list
        </Link>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div className="md__header">
        <h1 className="md__title">{m.name}</h1>
        <div className="md__actions">
          <Link to="/machines" className="md__linkBtn">
            Back to list
          </Link>
          <Link to={`/maintenance?machineId=${m._id}`} className="md__linkBtn">
            Log maintenance
          </Link>
          {m.type === "sterilizer" && (
            <Link to={`/cycles?machineId=${m._id}`} className="md__linkBtn">
              Log cycle
            </Link>
          )}
        </div>
      </div>

      {/* Machine facts */}
      <div className="md__panel">
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
      <h2 className="md__sectionTitle">Recent Maintenance</h2>
      <div className="md__tableWrap">
        <table className="md__table">
          <thead className="md__thead">
            <tr>
              <th className="md__th">Type</th>
              <th className="md__th">Performed At</th>
              <th className="md__th">Volume (mL)</th>
              <th className="md__th">Notes</th>
            </tr>
          </thead>
          <tbody>
            {maint.length ? (
              maint.map((row) => (
                <tr key={row._id} className="md__tr">
                  <td className="md__td">{row.type}</td>
                  <td className="md__td">{formatDateTime(row.performedAt)}</td>
                  <td className="md__td">{Number(row.volumeUsedMl || 0)}</td>
                  <td className="md__td md__td--muted">{row.notes || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="md__td md__td--empty">
                  No maintenance yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="md__underTable">
        <Link to={`/machines/${id}/maintenance`} className="md__linkBtn">
          View all maintenance
        </Link>
      </div>

      {/* Cycle history (sterilizer only) */}
      {m.type === "sterilizer" && (
        <>
          <h2 className="md__sectionTitle">Recent Cycles</h2>
          <div className="md__tableWrap">
            <table className="md__table">
              <thead className="md__thead">
                <tr>
                  <th className="md__th">Load #</th>
                  <th className="md__th">Started</th>
                  <th className="md__th">Completed</th>
                  <th className="md__th">Result</th>
                  <th className="md__th">Items</th>
                </tr>
              </thead>
              <tbody>
                {cycles.length ? (
                  cycles.map((r) => (
                    <tr key={r._id} className="md__tr">
                      <td className="md__td">{r.loadNumber || "—"}</td>
                      <td className="md__td">{formatDateTime(r.startedAt)}</td>
                      <td className="md__td">
                        {r.completedAt ? formatDateTime(r.completedAt) : "—"}
                      </td>
                      <td className="md__td">{r.result}</td>
                      <td className="md__td md__td--muted">{r.items || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="md__td md__td--empty">
                      No cycles yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="md__underTable">
            <Link to={`/machines/${id}/cycles`} className="md__linkBtn">
              View all cycles
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
