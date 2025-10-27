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
  const [cyclesTodayArr, setCyclesTodayArr] = useState([]);
  const [recentCycles, setRecentCycles] = useState([]);
  const [pendingSpores, setPendingSpores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');

        const now = new Date();
        const startToday = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
        );
        const endToday = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
        );
        const iso = (d) => d.toISOString();

        const [mRes, maRes, cRes, spRes] = await Promise.all([
          apiFetch('/api/machines'),
          apiFetch(
            `/api/maintenance?start=${encodeURIComponent(
              iso(startToday)
            )}&end=${encodeURIComponent(iso(endToday))}&limit=5`
          ),
          apiFetch(
            `/api/cycles?start=${encodeURIComponent(
              iso(startToday)
            )}&end=${encodeURIComponent(iso(endToday))}&limit=5`
          ),
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
        setCyclesTodayArr(cJson.cycles || []);
        setPendingSpores(spJson.spores || []);

        let rcList = [];
        let rcRes = await apiFetch('/api/cycles?limit=200');
        if (!rcRes.ok) rcRes = await apiFetch('/api/cycles');

        if (rcRes.ok) {
          const rcJson = await rcRes.json();
          rcList = rcJson.cycles || [];
        }

        const sorted = rcList
          .slice()
          .sort((a, b) => {
            const da = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const db = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return db - da;
          })
          .slice(0, 10);

        setRecentCycles(sorted);
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

      const cyclesToday = cyclesTodayArr.length;
      const failedCyclesToday = cyclesTodayArr.filter((c) => c.result === 'fail').length;

      const pendingSporesCount = pendingSpores.length;

      return {
        activeMachines,
        overdueDescales,
        cyclesToday,
        failedCyclesToday,
        pendingSporesCount,
      };
    }, [machines, cyclesTodayArr, pendingSpores]);

  return (
    <>
      <h1 className="dashboard__title">Dashboard</h1>

      {/* KPI row */}
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
        <div className="dashboard__grid">
          {/* 1) Recent Cycles (last 10) */}
          <Card title="Recent Cycles (Last 10)">
            {recentCycles.length ? (
              <ul className="dashboard__list">
                {recentCycles.map((c) => (
                  <li key={c._id} className="dashboard__listItem">
                    <span
                      className={`${common.dot} ${
                        c.result === 'fail' ? common['dot--down'] : common['dot--ok']
                      }`}
                    />
                    <span className="dashboard__mutedWrap">
                      <strong>{c.machineId?.name || 'Unknown'}</strong>
                      &nbsp;— Load {c.loadNumber || '—'} ({c.result || '—'}) &nbsp;•{' '}
                      {c.startedAt ? formatDateTime(c.startedAt) : '—'}
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
              <div className="dashboard__empty">No cycles yet.</div>
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

          {/* 3) Recent Maintenance (today) */}
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
            {machines.filter(
              (m) => m.type === 'washer' && daysSince(m.lastDescaleAt) > DESCALE_THRESHOLD_DAYS
            ).length ? (
              <ul className="dashboard__list">
                {machines
                  .filter(
                    (m) =>
                      m.type === 'washer' && daysSince(m.lastDescaleAt) > DESCALE_THRESHOLD_DAYS
                  )
                  .map((m) => {
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
