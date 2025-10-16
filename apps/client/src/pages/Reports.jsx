import { useMemo, useState } from 'react';
import { downloadWithAuth } from '../utils/download';

let useToast;
try {
  // eslint-disable-next-line import/no-unresolved
  ({ useToast } = require('../components/Toast/ToastProvider'));
} catch {}

import './reports.css';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function useSafeToast() {
  // Normalize to (type, message: string)
  try {
    const toast = useToast?.();
    const show = toast?.show;
    if (typeof show === 'function') {
      return (type, message) => {
        try {
          // Try common signatures gracefully
          if (show.length >= 2) return show(type, String(message));
          return show(String(message)); // single-arg implementations
        } catch {
          console[type === 'error' ? 'error' : 'log'](message);
        }
      };
    }
  } catch {}
  return (type, message) => console[type === 'error' ? 'error' : 'log'](message);
}

export default function Reports() {
  const notify = useSafeToast();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1..12
  const [busy, setBusy] = useState(false);

  async function onDownloadPDF() {
    if (busy) return;
    setBusy(true);
    try {
      const name = `spt-report-${year}-${pad2(month)}.pdf`;
      const qs = `?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`;

      // Try multiple likely server paths to avoid 404s due to mount differences
      await downloadWithAuth(
        [
          `/api/reports/monthly${qs}`, // most common
          `/reports/monthly${qs}`, // some servers mount without /api
          `/api/report/monthly${qs}`, // singular fallback
        ],
        { filename: name }
      );

      notify('success', `Downloaded ${name}`);
    } catch (e) {
      notify('error', `Download failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reports">
      <header className="reports__header">
        <h1 className="reports__title">Reports</h1>
        <p className="reports__subtitle">
          Generate the monthly PDF summary for compliance and records.
        </p>
      </header>

      <section className="reports__card" aria-labelledby="report-filters">
        <h2 id="report-filters" className="sr-only">
          Report Filters
        </h2>

        <div className="reports__grid">
          <label className="reports__field">
            <span className="reports__label">Month</span>
            <select
              className="reports__input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="reports__field">
            <span className="reports__label">Year</span>
            <input
              className="reports__input"
              type="number"
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min="2000"
              max="2100"
              step="1"
            />
          </label>
        </div>

        <div className="reports__actions">
          <button
            className="btn reports__btn"
            type="button"
            onClick={onDownloadPDF}
            disabled={busy}
          >
            {busy ? 'Preparing...' : 'Download Monthly PDF'}
          </button>
        </div>

        <p className="reports__hint">
          The report includes machines, maintenance, cycles, and audit snapshots for the selected
          month.
        </p>
      </section>
    </div>
  );
}
