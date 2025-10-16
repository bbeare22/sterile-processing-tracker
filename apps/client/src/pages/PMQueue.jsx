import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useToast } from '../components/Toast/ToastProvider';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import './pm-queue.css';

const PAGE_SIZE = 25;

export default function PMQueue() {
  const { show } = useToast();

  // filters
  const [status, setStatus] = useState('pending'); // pending | completed | skipped | all
  const [q, setQ] = useState('');
  const [dueSoonOnly, setDueSoonOnly] = useState(false); // next 7 days

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  // modals
  const [completeFor, setCompleteFor] = useState(null);
  const [skipFor, setSkipFor] = useState(null);
  const [submitBusy, setSubmitBusy] = useState(false);

  // form fields
  const [initials, setInitials] = useState('');
  const [notes, setNotes] = useState('');

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (dueSoonOnly) params.set('dueSoon', '1');
    params.set('limit', String(limit));
    return `/api/pm/tasks?${params.toString()}`;
  }, [status, dueSoonOnly, limit]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        setLoading(true);
        setErr('');
        const r = await apiFetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setRows(j.tasks || []);
      } catch (e) {
        if (!cancel) setErr(e.message || 'Failed to load PM tasks');
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [path]);

  // client search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((t) => {
      const m = t.machineId || {};
      const plan = t.plan || {};
      const hay = [t._id, m.name, m.location, plan.title, plan.type, plan.interval, t.status]
        .map((x) => String(x || '').toLowerCase())
        .join(' • ');
      return hay.includes(needle);
    });
  }, [rows, q]);

  function openComplete(t) {
    setCompleteFor(t);
    setSkipFor(null);
    setInitials('');
    setNotes('');
  }
  function openSkip(t) {
    setSkipFor(t);
    setCompleteFor(null);
    setInitials('');
    setNotes('');
  }
  function closeModals() {
    setCompleteFor(null);
    setSkipFor(null);
    setInitials('');
    setNotes('');
  }

  async function submitComplete(e) {
    e.preventDefault();
    if (!completeFor?._id) return;
    try {
      setSubmitBusy(true);
      const r = await apiFetch(`/api/pm/tasks/${completeFor._id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completedBy: initials, notes }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      // update row in list
      setRows((prev) => prev.map((x) => (x._id === j.task._id ? j.task : x)));
      show('PM marked completed ✔', { tone: 'ok' });
      closeModals();
    } catch (e) {
      show(e.message || 'Failed to complete PM task', {
        tone: 'danger',
        ms: 8000,
      });
    } finally {
      setSubmitBusy(false);
    }
  }

  async function submitSkip(e) {
    e.preventDefault();
    if (!skipFor?._id) return;
    try {
      setSubmitBusy(true);
      const r = await apiFetch(`/api/pm/tasks/${skipFor._id}/skip`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      setRows((prev) => prev.map((x) => (x._id === j.task._id ? j.task : x)));
      show('PM task skipped', { tone: 'ok' });
      closeModals();
    } catch (e) {
      show(e.message || 'Failed to skip PM task', { tone: 'danger', ms: 8000 });
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div className="pmq">
      <div className="pmq__header">
        <h1 className="pmq__title">PM Tasks</h1>
        <div className="pmq__filters">
          <select
            className="pmq__input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            title="Status"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
            <option value="all">All</option>
          </select>

          <label className="pmq__checkbox">
            <input
              type="checkbox"
              checked={dueSoonOnly}
              onChange={(e) => setDueSoonOnly(e.target.checked)}
            />
            Due in next 7 days
          </label>

          <input
            className="pmq__input"
            placeholder="Search machine / plan / location"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {err && <div className="pmq__error">Failed to load: {err}</div>}
      {loading && <div className="pmq__loading">Loading…</div>}

      {!loading && !err && (
        <div className="pmq__tableWrap">
          <table className="pmq__table">
            <thead className="pmq__thead">
              <tr>
                <th className="pmq__th">Machine</th>
                <th className="pmq__th">Plan</th>
                <th className="pmq__th">Due</th>
                <th className="pmq__th">Status</th>
                <th className="pmq__th">Notes</th>
                <th className="pmq__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((t) => {
                  const m = t.machineId || {};
                  const plan = t.plan || {};
                  const due = t.dueAt ? formatDateTime(t.dueAt) : '—';
                  const statusChip =
                    t.status === 'pending'
                      ? 'pmq__chip--warn'
                      : t.status === 'completed'
                        ? 'pmq__chip--ok'
                        : 'pmq__chip--muted';

                  return (
                    <tr key={t._id} className="pmq__tr">
                      <td className="pmq__td">
                        <div className="pmq__tdMain">
                          <strong>{m.name || 'Unknown'}</strong>
                          <span className="pmq__muted">{m.location || '—'}</span>
                        </div>
                      </td>
                      <td className="pmq__td">
                        <div className="pmq__tdMain">
                          <strong>{plan.title || plan.type || '—'}</strong>
                          <span className="pmq__muted">
                            {plan.interval ? `Every ${plan.interval}` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="pmq__td">{due}</td>
                      <td className="pmq__td">
                        <span className={`pmq__chip ${statusChip}`}>{t.status}</span>
                      </td>
                      <td className="pmq__td pmq__td--muted">{t.notes || '—'}</td>
                      <td className="pmq__td">
                        <div className="pmq__actions">
                          <Link className="pmq__link" to={`/machines/${m._id || ''}`}>
                            View machine
                          </Link>
                          {t.status === 'pending' && (
                            <>
                              <button className="pmq__btnPrimary" onClick={() => openComplete(t)}>
                                Complete
                              </button>
                              <button className="pmq__btn" onClick={() => openSkip(t)}>
                                Skip
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="pmq__td" colSpan={6} style={{ opacity: 0.7 }}>
                    No PM tasks match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length >= limit && (
        <div style={{ marginTop: 12 }}>
          <button className="pmq__btn" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
            Load more
          </button>
        </div>
      )}

      {/* Complete Modal */}
      {completeFor && (
        <div className="pmq__modal">
          <div className="pmq__modalCard">
            <h3>Complete PM Task</h3>
            <form onSubmit={submitComplete} className="pmq__form">
              <label className="pmq__label">Initials</label>
              <input
                className="pmq__input"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                required
              />
              <label className="pmq__label">Notes (optional)</label>
              <textarea
                rows={3}
                className="pmq__input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="pmq__actions">
                <button className="pmq__btnPrimary" disabled={submitBusy}>
                  {submitBusy ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="pmq__btn" onClick={closeModals}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skip Modal */}
      {skipFor && (
        <div className="pmq__modal">
          <div className="pmq__modalCard">
            <h3>Skip PM Task</h3>
            <form onSubmit={submitSkip} className="pmq__form">
              <label className="pmq__label">Reason / Notes</label>
              <textarea
                rows={4}
                className="pmq__input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
              <div className="pmq__actions">
                <button className="pmq__btnPrimary" disabled={submitBusy}>
                  {submitBusy ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="pmq__btn" onClick={closeModals}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
