import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import './cycles-history.css';

export default function CyclesHistory() {
  const { id } = useParams();

  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Month export controls (match Spore Queue look)
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(now.getUTCMonth() + 1);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');

        const mRes = await apiFetch(`/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        const r = await apiFetch(`/api/cycles?machineId=${id}`);
        if (!r.ok) throw new Error(`Cycles HTTP ${r.status}`);
        const j = await r.json();

        const list = (j.cycles || []).slice().sort((a, b) => {
          const da = a.startedAt ? new Date(a.startedAt).getTime() : 0;
          const db = b.startedAt ? new Date(b.startedAt).getTime() : 0;
          return db - da;
        });
        setRows(list);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function exportCSVMonth() {
    try {
      const serverOrigin = window.location.origin.replace(':5173', ':3001');
      const params = new URLSearchParams({
        kind: 'cycles',
        year: String(exportYear),
        month: String(exportMonth),
        machineId: id,
      });
      const url = `${serverOrigin}/api/reports/csv?${params.toString()}`;

      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const fname = `cycles-${machine?.name || id}-${exportYear}-${String(exportMonth).padStart(
        2,
        '0'
      )}.csv`;

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
    <div className="cycles">
      {/* Header bar — title on left, month export controls on right */}
      <div className="cycles__header">
        <h1 className="cycles__title">Cycles — {machine ? machine.name : '…'}</h1>

        <div className="cycles__actions" style={{ marginLeft: 'auto', gap: 10 }}>
          {/* Reuse Spore Queue styles for visual match */}
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

          <Link to={`/machines/${id}`} className="cycles__linkBtn">
            Back to machine
          </Link>
          <Link to={`/cycles?machineId=${id}`} className="cycles__linkBtn">
            Log cycle
          </Link>
        </div>
      </div>

      {err && <div className="cycles__error">Failed to load: {err}</div>}

      {/* Table */}
      <div className="cycles__tableWrap">
        <table className="cycles__table">
          <thead className="cycles__thead">
            <tr>
              <th className="cycles__th">Load #</th>
              <th className="cycles__th">Started</th>
              <th className="cycles__th">Completed</th>
              <th className="cycles__th">Result</th>
              <th className="cycles__th">Items</th>
              <th className="cycles__th">Load Staff</th>
              <th className="cycles__th">Unload Staff</th>
              <th className="cycles__th">Verified By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="cycles__td cycles__td--muted" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r._id} className="cycles__tr">
                  <td className="cycles__td">{r.loadNumber || '—'}</td>
                  <td className="cycles__td">{r.startedAt ? formatDateTime(r.startedAt) : '—'}</td>
                  <td className="cycles__td">
                    {r.completedAt ? formatDateTime(r.completedAt) : '—'}
                  </td>
                  <td className="cycles__td">{r.result || '—'}</td>
                  <td className="cycles__td cycles__td--muted">{r.items || '—'}</td>
                  <td className="cycles__td">{r.loadStaff || '—'}</td>
                  <td className="cycles__td">{r.unloadStaff || '—'}</td>
                  <td className="cycles__td">{r.spore?.verifiedBy || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="cycles__td cycles__td--muted" colSpan={8}>
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
