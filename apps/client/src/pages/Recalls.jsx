import { useEffect, useMemo, useState } from 'react';
import Skeleton from '../components/Skeleton/Skeleton';
import { apiFetch } from '../utils/api';
import './recalls.css';

function formatDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '';
  const y = yyyymmdd.slice(0, 4),
    m = yyyymmdd.slice(4, 6),
    d = yyyymmdd.slice(6, 8);
  return `${m}/${d}/${y}`;
}

export default function Recalls() {
  const [brand, setBrand] = useState('STERIS');
  const [limit, setLimit] = useState(25);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const path = useMemo(() => {
    const params = new URLSearchParams({ brand, limit: String(limit) });
    return `/api/external/recalls?${params.toString()}`;
  }, [brand, limit]);

  const fetchRecalls = () => {
    setLoading(true);
    setErr('');
    apiFetch(path)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setRows(d.rows || []);
        setLastUpdated(new Date());
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRecalls, [path]);

  return (
    <>
      <h1 className="rec__title">Recalls</h1>

      {/* Controls */}
      <div className="rec__controls">
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand keyword (e.g., STERIS, AMSCO)"
          className="rec__input"
          aria-label="Brand filter"
        />
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="rec__input"
          aria-label="Limit"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button onClick={fetchRecalls} className="rec__btn">
          Refresh
        </button>
        <div className="rec__meta">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </div>
      </div>

      {/* Content */}
      <div className="rec__tableWrap">
        <table className="rec__table">
          <thead className="rec__thead">
            <tr>
              <th className="rec__th">Product</th>
              <th className="rec__th">Reason</th>
              <th className="rec__th">Firm</th>
              <th className="rec__th">Status</th>
              <th className="rec__th">Class</th>
              <th className="rec__th">Report Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows />}
            {!loading &&
              !err &&
              rows.length > 0 &&
              rows.map((r) => (
                <tr key={r.recallNumber} className="rec__tr">
                  <td className="rec__td">{r.product}</td>
                  <td className="rec__td rec__muted">{r.reason}</td>
                  <td className="rec__td">{r.recallingFirm}</td>
                  <td className="rec__td">{r.status}</td>
                  <td className="rec__td">{r.classification}</td>
                  <td className="rec__td">{formatDate(r.reportDate)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Empty state & error */}
        {!loading && !err && rows.length === 0 && (
          <div className="rec__empty">
            <div className="rec__emptyTitle">No recalls found</div>
            <div className="rec__emptySub">
              Try a different brand keyword (e.g., <code>AMSCO</code>).
            </div>
            <button onClick={fetchRecalls} className="rec__btn">
              Try Again
            </button>
          </div>
        )}

        {!loading && err && (
          <div className="rec__empty">
            <div className="rec__error">Failed to load: {err}</div>
            <button onClick={fetchRecalls} className="rec__btn">
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Skeleton rows ---------- */
function SkeletonRows({ count = 6 }) {
  const rows = Array.from({ length: count });
  return (
    <>
      {rows.map((_, i) => (
        <tr key={i} className="rec__tr">
          <td className="rec__td">
            <Skeleton w="90%" />
          </td>
          <td className="rec__td">
            <Skeleton w="95%" />
          </td>
          <td className="rec__td">
            <Skeleton w="60%" />
          </td>
          <td className="rec__td">
            <Skeleton w="50%" />
          </td>
          <td className="rec__td">
            <Skeleton w="40%" />
          </td>
          <td className="rec__td">
            <Skeleton w="50%" />
          </td>
        </tr>
      ))}
    </>
  );
}
