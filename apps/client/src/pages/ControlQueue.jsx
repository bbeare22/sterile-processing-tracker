import { useEffect, useMemo, useState } from 'react';
import ModalWithForm from '../components/ModalWithForm/ModalWithForm';
import { useToast } from '../components/Toast/ToastProvider';
import { apiFetch } from '../utils/api';
import { formatDateTime, formatLocalInputDateTime, localInputToISO } from '../utils/date';
import './spore-queue.css';

export default function ControlQueue() {
  const { show } = useToast();

  // list filters
  const [status, setStatus] = useState('pending'); // pending | verified | all
  const [q, setQ] = useState('');

  // month export controls
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(now.getUTCMonth() + 1);

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cIncubator, setCIncubator] = useState('');
  const [cLot, setCLot] = useState('');
  const [cWell, setCWell] = useState('');
  const [cIncubatedAt, setCIncubatedAt] = useState(
    formatLocalInputDateTime(new Date()) // ← local wall-clock string
  );
  const [cNotes, setCNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // verify modal
  const [verifyFor, setVerifyFor] = useState(null);
  const [verifyBy, setVerifyBy] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const path = useMemo(() => {
    const p = new URLSearchParams();
    p.set('status', status);
    return `/api/controls?${p.toString()}`;
  }, [status]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const r = await apiFetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setRows(j.controls || []);
      } catch (e) {
        if (!cancel) setErr(e.message || 'Failed to load controls');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [path]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [r.incubatorId, r.well, r.lot, r.result, r.verifiedBy, r.notes]
        .map((x) => String(x || '').toLowerCase())
        .join(' • ');
      return hay.includes(needle);
    });
  }, [rows, q]);

  async function exportCSVMonth() {
    try {
      const serverOrigin = window.location.origin.replace(':5173', ':3001');
      const u = new URL(
        `/api/reports/csv?kind=control&year=${exportYear}&month=${exportMonth}`,
        serverOrigin
      );
      const res = await fetch(u.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fname = `control-${exportYear}-${String(exportMonth).padStart(2, '0')}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      show(e.message || 'Export failed', { tone: 'danger', ms: 8000 });
    }
  }

  async function createControl(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const r = await apiFetch('/api/controls', {
        method: 'POST',
        body: JSON.stringify({
          incubatorId: cIncubator,
          lot: cLot,
          well: cWell,
          // convert local datetime-local string → ISO for API
          incubatedAt: cIncubatedAt ? localInputToISO(cIncubatedAt) : undefined,
          notes: cNotes,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      setRows((prev) => [j.control, ...prev]);
      setCreateOpen(false);
      setCIncubator('');
      setCLot('');
      setCWell('');
      setCIncubatedAt(formatLocalInputDateTime(new Date())); // refresh to *now* local
      setCNotes('');
      show('Control BI logged ✔', { tone: 'ok' });
    } catch (e2) {
      show(e2.message || 'Failed to log control', { tone: 'danger', ms: 8000 });
    } finally {
      setSaving(false);
    }
  }

  async function submitVerify(e) {
    e.preventDefault();
    if (!verifyFor?._id) return;
    try {
      setVerifySubmitting(true);
      const r = await apiFetch(`/api/controls/${verifyFor._id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ result: 'positive', verifiedBy: verifyBy }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      setRows((prev) => prev.map((x) => (x._id === j.control._id ? j.control : x)));
      setVerifyFor(null);
      setVerifyBy('');
      show('Control verified ✔', { tone: 'ok' });
    } catch (e2) {
      show(e2.message || 'Failed to verify', { tone: 'danger', ms: 8000 });
    } finally {
      setVerifySubmitting(false);
    }
  }

  return (
    <div>
      <div className="sq__header">
        <h1 className="sq__title">Control BIs</h1>

        {/* Export controls */}
        <div className="sq__filters" style={{ marginLeft: 'auto' }}>
          <input
            className="sq__input"
            type="number"
            min={2000}
            max={2100}
            value={exportYear}
            onChange={(e) => setExportYear(Number(e.target.value))}
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
        </div>
      </div>

      {/* Filters / actions row */}
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
          placeholder="Search (incubator, lot, well, verifier)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <button className="sq__btn" onClick={() => setCreateOpen(true)}>
          Log control
        </button>
      </div>

      {err && <div className="sq__error">Failed to load: {err}</div>}
      {loading && <div className="sq__loading">Loading…</div>}

      {!loading && !err && (
        <div className="sq__tableWrap">
          <table className="sq__table">
            <thead className="sq__thead">
              <tr>
                <th className="sq__th">Incubator</th>
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
                  const pending = !r.result;
                  return (
                    <tr key={r._id} className="sq__tr">
                      <td className="sq__td">{r.incubatorId || '—'}</td>
                      <td className="sq__td">{r.well || '—'}</td>
                      <td className="sq__td">{r.lot || '—'}</td>
                      <td className="sq__td">
                        {r.incubatedAt ? formatDateTime(r.incubatedAt) : '—'}
                      </td>
                      <td className="sq__td">{r.result || (pending ? 'pending' : '—')}</td>
                      <td className="sq__td">
                        {r.verifiedAt || r.verifiedBy ? (
                          <span>
                            {r.verifiedBy ? <strong>{r.verifiedBy}</strong> : '—'}
                            {r.verifiedAt ? ` — ${formatDateTime(r.verifiedAt)}` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="sq__td">
                        <div className="sq__actions">
                          {pending && (
                            <button className="sq__btn" onClick={() => setVerifyFor(r)}>
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
                  <td className="sq__td" colSpan={7} style={{ opacity: 0.7 }}>
                    No controls match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <ModalWithForm title="Log Control BI" onClose={() => setCreateOpen(false)}>
          <form onSubmit={createControl} className="sq__verifyForm">
            <div className="sq__field">
              <label className="sq__label">Incubator ID</label>
              <input
                className="sq__input"
                value={cIncubator}
                onChange={(e) => setCIncubator(e.target.value)}
                placeholder="e.g., INC-01"
              />
            </div>

            <div className="sq__field">
              <label className="sq__label">Well #</label>
              <input
                className="sq__input"
                value={cWell}
                onChange={(e) => setCWell(e.target.value)}
                placeholder="e.g., 1"
              />
            </div>

            <div className="sq__field">
              <label className="sq__label">Lot #</label>
              <input
                className="sq__input"
                value={cLot}
                onChange={(e) => setCLot(e.target.value)}
                placeholder="e.g., 20261018"
              />
            </div>

            <div className="sq__field">
              <label className="sq__label">Incubated At</label>
              <input
                type="datetime-local"
                className="sq__input"
                value={cIncubatedAt} // local string
                onChange={(e) => setCIncubatedAt(e.target.value)}
                required
              />
            </div>

            <div className="sq__field">
              <label className="sq__label">Notes (optional)</label>
              <input
                className="sq__input"
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
              />
            </div>

            <div className="sq__actionsBar">
              <button className="sq__btnPrimary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="sq__btnGhost" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </ModalWithForm>
      )}

      {/* Verify modal */}
      {verifyFor && (
        <ModalWithForm title="Verify Control BI" onClose={() => setVerifyFor(null)}>
          <form onSubmit={submitVerify} className="sq__verifyForm">
            <div className="sq__field">
              <label className="sq__label">Result</label>
              <input className="sq__input" value="Positive" readOnly />
            </div>

            <div className="sq__field">
              <label className="sq__label">Verified By</label>
              <input
                className="sq__input"
                placeholder="Initials"
                value={verifyBy}
                onChange={(e) => setVerifyBy(e.target.value)}
                required
              />
            </div>

            <div className="sq__actionsBar">
              <button className="sq__btnPrimary" disabled={verifySubmitting}>
                {verifySubmitting ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="sq__btnGhost" onClick={() => setVerifyFor(null)}>
                Cancel
              </button>
            </div>
          </form>
        </ModalWithForm>
      )}
    </div>
  );
}
