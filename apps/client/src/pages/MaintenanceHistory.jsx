import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Skeleton from "../components/Skeleton/Skeleton";
import { formatDateTime } from "../utils/date";
import { toCSV, downloadFile } from "../utils/csv";
import { apiFetch } from "../utils/api";
import "./maintenance-history.css";

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
      PerformedBy: r.performedBy || "",
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
      <div className="mh__header">
        <h1 className="mh__title">
          {machine ? `Maintenance — ${machine.name}` : "Maintenance History"}
        </h1>
        <div className="mh__actions">
          <button onClick={exportCSV} className="mh__btn">
            Export CSV
          </button>
          <Link to={`/machines/${id}`} className="mh__linkBtn">
            Back to machine
          </Link>
          <Link to={`/maintenance?machineId=${id}`} className="mh__linkBtn">
            Log maintenance
          </Link>
        </div>
      </div>

      {err && <div className="mh__error">Failed to load: {err}</div>}

      {/* Table */}
      <div className="mh__tableWrap">
        <table className="mh__table">
          <thead className="mh__thead">
            <tr>
              <th className="mh__th">Type</th>
              <th className="mh__th">Performed At</th>
              <th className="mh__th">Volume (mL)</th>
              <th className="mh__th">Notes</th>
              <th className="mh__th">Performed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skel-${i}`} className="mh__tr">
                  <td colSpan={5} className="mh__td mh__td--padTight">
                    <div className="mh__skeletonRow">
                      <div className="mh__skeletonCols">
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
                <tr key={r._id} className="mh__tr">
                  <td className="mh__td">{r.type}</td>
                  <td className="mh__td">{formatDateTime(r.performedAt)}</td>
                  <td className="mh__td">{Number(r.volumeUsedMl || 0)}</td>
                  <td className="mh__td mh__td--muted">{r.notes || "—"}</td>
                  <td className="mh__td">{r.performedBy || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="mh__td mh__td--empty">
                  No maintenance yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length >= limit && (
        <div className="mh__loadMoreWrap">
          <button onClick={() => setLimit((n) => n + 20)} className="mh__btn">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
