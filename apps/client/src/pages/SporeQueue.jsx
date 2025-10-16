import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ModalWithForm from '../components/ModalWithForm/ModalWithForm';
import { useToast } from '../components/Toast/ToastProvider';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import './spore-queue.css';

const PAGE_SIZE = 25;

export default function SporeQueue() {
  const { show } = useToast();

  // filters
  const [status, setStatus] = useState('pending'); // pending | verified | all
  const [incubatorId, setIncubatorId] = useState('');
  const [q, setQ] = useState('');

  // month export controls (top-right)
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(now.getUTCMonth() + 1); // 1..12
  const [basis, setBasis] = useState('incubated'); // or "verified"

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  // verify modal
  const [verifyFor, setVerifyFor] = useState(null); // row to verify
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyResult, setVerifyResult] = useState('negative');
  const [verifyBy, setVerifyBy] = useState('');

  // Build query path for API
  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (incubatorId.trim()) params.set('incubatorId', incubatorId.trim());
    params.set('limit', String(limit));
    return `/api/spores?${params.toString()}`;
  }, [status, incubatorId, limit]);

  // Load
  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        setLoading(true);
        setErr('');
        const r = await apiFetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setRows(j.spores || []);
      } catch (e) {
        if (!cancel) setErr(e.message || 'Failed to load spore queue');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [path]);

  // Client-side search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const m = r.machineId || {};
      const sp = r.spore || {};
      const hay = [
        r._id,
        m.name,
        m.location,
        r.loadNumber,
        sp.lot,
        sp.well,
        sp.incubatorId,
        sp.result,
        sp.verifiedBy,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' • ');
      return hay.includes(needle);
    });
  }, [rows, q]);

  function openVerify(row) {
    setVerifyFor(row);
    setVerifyResult(row?.spore?.result || 'negative');
    setVerifyBy('');
  }
  function closeVerify() {
    setVerifyFor(null);
    setVerifyResult('negative');
    setVerifyBy('');
  }

  async function submitVerify(e) {
    e.preventDefault();
    if (!verifyFor?._id) return;
    try {
      setVerifySubmitting(true);
      const r = await apiFetch(`/api/spores/${verifyFor._id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          result: verifyResult,
          verifiedBy: verifyBy,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();

      // Update row in place
      setRows((prev) => prev.map((x) => (x._id === j.cycle._id ? j.cycle : x)));
      show('Spore verified ✔', { tone: 'ok' });
      closeVerify();
    } catch (e) {
      show(e.message || 'Failed to verify spore', { tone: 'danger', ms: 8000 });
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function exportCSVMonth() {
    try {
      // Build API URL to server (port-swap 5173 -> 3001 in dev)
      const serverOrigin = window.location.origin.replace(':5173', ':3001');
      const u = new URL(
        `/api/reports/csv?kind=spores&year=${exportYear}&month=${exportMonth}&basis=${basis}`,
        serverOrigin
      );

      const res = await fetch(u.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const fname = `spores-${exportYear}-${String(exportMonth).padStart(2, '0')}-${basis}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      show(e.message || 'Failed to export CSV', { tone: 'danger', ms: 8000 });
    }
  }

  return (
    <div>
      {/* Header row with title (left) and Export controls (right) */}
      <div className="sq__header">
        <h1 className="sq__title">Spore Queue</h1>

        {/* Compact month export controls on the far right */}
        <div className="sq__filters" style={{ marginLeft: 'auto' }}>
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
          <select
            className="sq__input"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            title="Basis"
          >
            <option value="incubated">By Incubated date</option>
            <option value="verified">By Verified date</option>
          </select>
          <button className="sq__btnGhost" onClick={exportCSVMonth}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters row under the header (unchanged) */}
      <div className="sq__filters">
        <select
          className="sq__input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          title="Status"
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="all">All</option>
        </select>

        <input
          className="sq__input"
          placeholder="Incubator ID"
          value={incubatorId}
          onChange={(e) => setIncubatorId(e.target.value)}
        />

        <input
          className="sq__input"
          placeholder="Search (machine, load #, lot, well, verifier)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {err && <div className="sq__error">Failed to load: {err}</div>}
      {loading && <div className="sq__loading">Loading…</div>}

      {!loading && !err && (
        <div className="sq__tableWrap">
          <table className="sq__table">
            <thead className="sq__thead">
              <tr>
                <th className="sq__th">Machine</th>
                <th className="sq__th">Started</th>
                <th className="sq__th">Load #</th>
                <th className="sq__th">Well</th>
                <th className="sq__th">Lot</th>
                <th className="sq__th">Incubated</th>
                <th className="sq__th">Result</th>
                <th className="sq__th">Verified</th>
                <th className="sq__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => {
                  const sp = r.spore || {};
                  const pending = !sp.result || sp.result === '';
                  return (
                    <tr key={r._id} className="sq__tr">
                      <td className="sq__td">
                        <div className="sq__tdMain">
                          <strong>{r.machineId?.name || 'Unknown'}</strong>
                          <span className="sq__muted">{r.machineId?.location || '—'}</span>
                        </div>
                      </td>
                      <td className="sq__td">{r.startedAt ? formatDateTime(r.startedAt) : '—'}</td>
                      <td className="sq__td">{r.loadNumber || '—'}</td>
                      <td className="sq__td">{sp.well || '—'}</td>
                      <td className="sq__td">{sp.lot || '—'}</td>
                      <td className="sq__td">
                        {sp.incubatedAt ? formatDateTime(sp.incubatedAt) : '—'}
                      </td>
                      <td className="sq__td">{sp.result ? sp.result : sp.ran ? 'pending' : '—'}</td>
                      <td className="sq__td">
                        {sp.verifiedAt || sp.verifiedBy ? (
                          <span>
                            {sp.verifiedBy ? <strong>{sp.verifiedBy}</strong> : '—'}
                            {sp.verifiedAt ? ` — ${formatDateTime(sp.verifiedAt)}` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="sq__td">
                        <div className="sq__actions">
                          <Link className="sq__link" to={`/machines/${r.machineId?._id || ''}`}>
                            View machine
                          </Link>
                          {sp.ran && pending && (
                            <button className="sq__btn" onClick={() => openVerify(r)}>
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="sq__td" colSpan={9} style={{ opacity: 0.7 }}>
                    No spores match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length >= limit && (
        <div style={{ marginTop: 12 }}>
          <button className="sq__btnGhost" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            Load more
          </button>
        </div>
      )}

      {/* Verify modal */}
      {verifyFor && (
        <ModalWithForm title="Verify Spore Readout" onClose={closeVerify}>
          <form onSubmit={submitVerify} className="sq__verifyForm">
            <div className="sq__field">
              <label className="sq__label">Result</label>
              <select
                className="sq__input"
                value={verifyResult}
                onChange={(e) => setVerifyResult(e.target.value)}
              >
                <option value="negative">Negative</option>
                <option value="positive">Positive</option>
              </select>
            </div>

            <div className="sq__field">
              <label className="sq__label">Verified By</label>
              <input
                className="sq__input"
                placeholder="Initials or printed name"
                value={verifyBy}
                onChange={(e) => setVerifyBy(e.target.value)}
                required
              />
            </div>

            <div className="sq__actionsBar">
              <button className="sq__btnPrimary" disabled={verifySubmitting}>
                {verifySubmitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="sq__btnGhost" onClick={closeVerify}>
                Cancel
              </button>
            </div>
          </form>
        </ModalWithForm>
      )}
    </div>
  );
}
