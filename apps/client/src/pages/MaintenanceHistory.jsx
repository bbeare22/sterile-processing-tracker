import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import Skeleton from '../components/Skeleton/Skeleton';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import './maintenance-history.css';

export default function MaintenanceHistory() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(20);

  // Month export controls (match Spore Queue)
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(now.getUTCMonth() + 1); // 1..12

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');

        // fetch machine (for title)
        const mRes = await apiFetch(`/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        // fetch maintenance list
        const r = await apiFetch(`/api/maintenance?machineId=${id}&limit=${limit}`);
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

  async function exportCSVMonth() {
    try {
      const serverOrigin = window.location.origin.replace(':5173', ':3001');
      const params = new URLSearchParams({
        kind: 'maintenance',
        year: String(exportYear),
        month: String(exportMonth),
        machineId: id, // per-machine export
      });
      const url = `${serverOrigin}/api/reports/csv?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const fname = `maintenance-${machine?.name || id}-${exportYear}-${String(
        exportMonth
      ).padStart(2, '0')}.csv`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert(e.message || 'Failed to export CSV');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mh__header">
        <h1 className="mh__title">
          {machine ? `Maintenance — ${machine.name}` : 'Maintenance History'}
        </h1>

        {/* Top-right export controls (reuse Spore Queue styles for match) */}
        <div className="mh__actions" style={{ marginLeft: 'auto', gap: 10 }}>
          <input
            className="sq__input"
            type="number"
            min={2000}
            max={2100}
            value={exportYear}
            onChange={(e) => setExportYear(Number(e.target.value || now.getUTCFullYear()))}
            title="Year"
            style={{ width: 100 }}
          />
          <select
            className="sq__input"
            value={exportMonth}
            onChange={(e) => setExportMonth(Number(e.target.value))}
            title="Month"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </select>
          <button className="sq__btnGhost" onClick={exportCSVMonth}>
            Export CSV
          </button>

          {/* Keep original nav actions */}
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
                  <td className="mh__td mh__td--muted">{r.notes || '—'}</td>
                  <td className="mh__td">{r.performedBy || '—'}</td>
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
