import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/Card/Card';
import KPI from '../components/KPI/KPI';
import common from '../components/common.module.css';
import { apiFetch } from '../utils/api';
import { daysSince, formatDateTime } from '../utils/date';
import './dashboard.css';

const DESCALE_THRESHOLD_DAYS = 7;

export default function Dashboard() {
  const navigate = useNavigate();

  const [machines, setMachines] = useState([]);
  const [maint, setMaint] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [pendingSpores, setPendingSpores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');

        // ---- Build a UTC "today" window for start/end ----
        const now = new Date();
        const start = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
        );
        const end = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
        );
        const iso = (d) => d.toISOString();

        const [mRes, maRes, cRes, spRes] = await Promise.all([
          apiFetch('/api/machines'),
          // Recent maintenance TODAY (start/end window)
          apiFetch(
            `/api/maintenance?start=${encodeURIComponent(
              iso(start)
            )}&end=${encodeURIComponent(iso(end))}&limit=5`
          ),
          // Recent cycles TODAY (start/end window; works with your updated cycles route)
          apiFetch(
            `/api/cycles?start=${encodeURIComponent(
              iso(start)
            )}&end=${encodeURIComponent(iso(end))}&limit=5`
          ),
          // Pending spores list for the dashboard card (keep it small)
          apiFetch('/api/spores?status=pending&limit=5'),
        ]);

        if (!mRes.ok) throw new Error(`Machines HTTP ${mRes.status}`);
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        if (!cRes.ok) throw new Error(`Cycles HTTP ${cRes.status}`);
        if (!spRes.ok) throw new Error(`Spores HTTP ${spRes.status}`);

        const mJson = await mRes.json();
        const maJson = await maRes.json();
        const cJson = await cRes.json();
        const spJson = await spRes.json();

        setMachines(mJson.machines || []);
        setMaint(maJson.maintenance || []);
        setCycles(cJson.cycles || []);
        setPendingSpores(spJson.spores || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { activeMachines, overdueDescales, cyclesToday, failedCyclesToday, pendingSporesCount } =
    useMemo(() => {
      const activeMachines = machines.filter((m) => m.status === 'active').length;

      // Only washers should appear in overdue descales
      const overdueDescales = machines.filter(
        (m) => m.type === 'washer' && daysSince(m.lastDescaleAt) > DESCALE_THRESHOLD_DAYS
      );

      const cyclesToday = cycles.length;
      const failedCyclesToday = cycles.filter((c) => c.result === 'fail').length;

      const pendingSporesCount = pendingSpores.length; // simple count (dashboard KPI)

      return {
        activeMachines,
        overdueDescales,
        cyclesToday,
        failedCyclesToday,
        pendingSporesCount,
      };
    }, [machines, cycles, pendingSpores]);

  return (
    <>
      <h1 className="dashboard__title">Dashboard</h1>

      {/* KPI row (includes Pending Spore Readouts count) */}
      <div className="dashboard__kpis">
        <KPI label="Cycles Today" value={cyclesToday} tone="ok" />
        <KPI
          label="Failed Cycles"
          value={failedCyclesToday}
          tone={failedCyclesToday > 0 ? 'warn' : 'ok'}
        />
        <KPI
          label="Overdue Descales"
          value={overdueDescales.length}
          tone={overdueDescales.length ? 'danger' : 'ok'}
        />
        <KPI
          label="Pending Spore Readouts"
          value={pendingSporesCount}
          tone={pendingSporesCount ? 'warn' : 'ok'}
        />
        <KPI label="Active Machines" value={activeMachines} tone="ok" />
      </div>

      {loading && <div className="dashboard__loading">Loading data…</div>}
      {err && <div className="dashboard__error">Failed to load: {err}</div>}

      {!loading && !err && (
        // Layout order:
        // Top row: Recent Cycles (left) • Pending Spore Readouts (right)
        // Bottom row: Recent Maintenance (left) • Overdue Descales (right)
        <div className="dashboard__grid">
          {/* 1) Recent Cycles */}
          <Card title="Recent Cycles">
            {cycles.length ? (
              <ul className="dashboard__list">
                {cycles.map((c) => (
                  <li key={c._id} className="dashboard__listItem">
                    <span
                      className={`${common.dot} ${
                        c.result === 'fail' ? common['dot--down'] : common['dot--ok']
                      }`}
                    />
                    <span className="dashboard__mutedWrap">
                      <strong>{c.machineId?.name || 'Unknown'}</strong>
                      &nbsp;— Load {c.loadNumber || '—'} ({c.result}) &nbsp;•{' '}
                      {formatDateTime(c.startedAt)}
                    </span>
                    <Link
                      to={`/machines/${c.machineId?._id || ''}`}
                      className="dashboard__link"
                      style={{ marginLeft: 'auto' }}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard__empty">No cycles today.</div>
            )}
          </Card>

          {/* 2) Pending Spore Readouts */}
          <Card title="Pending Spore Readouts">
            {pendingSpores.length ? (
              <ul className="dashboard__list">
                {pendingSpores.map((c) => {
                  const sp = c.spore || {};
                  return (
                    <li key={c._id} className="dashboard__listItem">
                      <span className={`${common.dot} ${common['dot--warn']}`} />
                      <span className="dashboard__mutedWrap">
                        <strong>{c.machineId?.name || 'Unknown'}</strong>
                        &nbsp;— Load {c.loadNumber || '—'} • Lot {sp.lot || '—'} • Well{' '}
                        {sp.well || '—'} • Incubated{' '}
                        {sp.incubatedAt ? formatDateTime(sp.incubatedAt) : '—'}
                      </span>
                      <button
                        className="dashboard__chip"
                        onClick={() => navigate('/spores')}
                        title="Go to Spore Queue"
                      >
                        Verify
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="dashboard__empty">No pending spores 🎉</div>
            )}
          </Card>

          {/* 3) Recent Maintenance (TODAY via start/end) */}
          <Card title="Recent Maintenance">
            {maint.length ? (
              <ul className="dashboard__list">
                {maint.map((r) => (
                  <li key={r._id} className="dashboard__listItem">
                    <span className={`${common.dot} ${common['dot--ok']}`} />
                    <span className="dashboard__mutedWrap">
                      <strong>{r.machineId?.name || 'Unknown'}</strong>
                      &nbsp;— {r.type} • {formatDateTime(r.performedAt)}
                    </span>
                    <Link
                      to={`/machines/${r.machineId?._id || ''}`}
                      className="dashboard__link"
                      style={{ marginLeft: 'auto' }}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard__empty">No maintenance today.</div>
            )}
          </Card>

          {/* 4) Overdue Descales (washers only) */}
          <Card title="Overdue Descales">
            {overdueDescales.length ? (
              <ul className="dashboard__list">
                {overdueDescales.map((m) => {
                  const days = daysSince(m.lastDescaleAt);
                  const color =
                    days > 14
                      ? 'var(--color-danger)'
                      : days > 7
                        ? 'var(--color-warn)'
                        : 'var(--color-text)';
                  const dot = m.status === 'active' ? common['dot--ok'] : common['dot--down'];
                  return (
                    <li key={m._id} className="dashboard__listItem" style={{ color }}>
                      <span className={`${common.dot} ${dot}`} />
                      <Link to={`/machines/${m._id}`} className="dashboard__link">
                        {m.name}
                      </Link>
                      — {days} days
                      <Link
                        to={`/maintenance?machineId=${m._id}`}
                        className="dashboard__chip"
                        title="Log maintenance for this machine"
                      >
                        Log
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="dashboard__empty">All good. No overdue descales 🎉</div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
