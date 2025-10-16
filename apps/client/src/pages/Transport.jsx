import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/Toast/ToastProvider';
import { apiFetch } from '../utils/api';
import { formatDateTime } from '../utils/date';
import './spore-queue.css'; // reuse same compact UI

export default function Transport() {
  const { show } = useToast();

  // tab: "trips" | "fuel"
  const [tab, setTab] = useState('trips');

  // export / month selection (top-right)
  const now = new Date();
  const [exportYear, setExportYear] = useState(now.getUTCFullYear());
  const [exportMonth, setExportMonth] = useState(now.getUTCMonth() + 1);

  // list data
  const [trips, setTrips] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  // create forms
  const [tripOpen, setTripOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);

  // Trip form
  const [tDriver, setTDriver] = useState('');
  const [tDestination, setTDestination] = useState('');
  const [tStartMileage, setTStartMileage] = useState('');
  const [tDepartAt, setTDepartAt] = useState(localInputNow());
  const [tReturnAt, setTReturnAt] = useState(localInputNow());
  const [tReturnMileage, setTReturnMileage] = useState('');
  const [tWashGas, setTWashGas] = useState(false);
  const [tReceipt, setTReceipt] = useState(false);
  const [tReviewed, setTReviewed] = useState(false);
  const [tCountM, setTCountM] = useState(false);
  const [tCountR, setTCountR] = useState(false);
  const [tCountE, setTCountE] = useState(false);
  const [tCopySheets, setTCopySheets] = useState(''); // yes/no/""
  const [tGasReceipt, setTGasReceipt] = useState(''); // yes/na/""
  const [tTechSig, setTTechSig] = useState('');
  const [tSupSig, setTSupSig] = useState('');
  const [tNotes, setTNotes] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);

  // Fuel form
  const [fDate, setFDate] = useState(localInputNow());
  const [fMileage, setFMilage] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fGallons, setFGallons] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fVendor, setFVendor] = useState('');
  const [fSig, setFSig] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);

  const path = useMemo(() => `/api/transports`, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const r = await apiFetch(path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) {
          setTrips(j.trips || []);
          setFuels(j.fuels || []);
        }
      } catch (e) {
        if (!cancel) setErr(e.message || 'Failed to load transport');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [path]);

  /* ---------- filter & KPI helpers ---------- */
  const monthStart = useMemo(
    () => new Date(Date.UTC(exportYear, exportMonth - 1, 1, 0, 0, 0, 0)),
    [exportYear, exportMonth]
  );
  const monthEnd = useMemo(
    () =>
      exportMonth === 12
        ? new Date(Date.UTC(exportYear + 1, 0, 1, 0, 0, 0, 0))
        : new Date(Date.UTC(exportYear, exportMonth, 1, 0, 0, 0, 0)),
    [exportYear, exportMonth]
  );

  const tripsInMonth = useMemo(
    () =>
      trips.filter((t) => {
        const d = t?.date ? new Date(t.date) : null;
        return d && d >= monthStart && d < monthEnd;
      }),
    [trips, monthStart, monthEnd]
  );

  const fuelsInMonth = useMemo(
    () =>
      fuels.filter((f) => {
        const d = f?.date ? new Date(f.date) : null;
        return d && d >= monthStart && d < monthEnd;
      }),
    [fuels, monthStart, monthEnd]
  );

  // Text search (applied to visible table)
  const filteredTrips = useMemo(
    () =>
      filterByText(tripsInMonth, q, [
        'driver',
        'destination',
        'notes',
        'techSignature',
        'supervisorSignature',
      ]),
    [tripsInMonth, q]
  );

  const filteredFuels = useMemo(
    () => filterByText(fuelsInMonth, q, ['vendor', 'signature', 'notes']),
    [fuelsInMonth, q]
  );

  // KPIs (computed over month selection)
  const kpis = useMemo(() => {
    // trips
    let miles = 0;
    let hours = 0;
    for (const t of tripsInMonth) {
      const sm = Number(t.startMileage || 0);
      const rm = Number(t.returnMileage || 0);
      const delta = rm - sm;
      miles += delta > 0 ? delta : 0;

      const dep = t.departAt ? new Date(t.departAt).getTime() : 0;
      const ret = t.returnAt ? new Date(t.returnAt).getTime() : 0;
      const dur = ret - dep;
      if (dur > 0) hours += dur / 3_600_000; // ms → hours
    }

    // fuel
    let gallons = 0;
    let spend = 0;
    let sumPrice = 0;
    let priceCount = 0;

    for (const f of fuelsInMonth) {
      gallons += Number(f.gallons || 0);
      spend += Number(f.amount || 0);
      if (f.pricePerGallon != null) {
        sumPrice += Number(f.pricePerGallon);
        priceCount += 1;
      }
    }

    const avgPrice = priceCount ? sumPrice / priceCount : 0;
    const costPerMile = miles > 0 && spend > 0 ? spend / miles : 0;

    return {
      trips: tripsInMonth.length,
      miles,
      hours,
      gallons,
      spend,
      avgPrice,
      costPerMile,
    };
  }, [tripsInMonth, fuelsInMonth]);

  /* ---------- actions ---------- */
  async function exportCSV(kind) {
    try {
      const serverOrigin = window.location.origin.replace(':5173', ':3001');
      const u = new URL(
        `/api/reports/csv?kind=${kind}&year=${exportYear}&month=${exportMonth}`,
        serverOrigin
      );
      const res = await fetch(u.toString(), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fname = `${kind}-${exportYear}-${String(exportMonth).padStart(2, '0')}.csv`;
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

  async function saveTrip(e) {
    e.preventDefault();
    try {
      setSavingTrip(true);
      const b = {
        date: new Date(tDepartAt).toISOString(),
        driver: tDriver.trim(),
        destination: tDestination.trim(),
        startMileage: Number(tStartMileage || 0),
        departAt: new Date(tDepartAt).toISOString(),
        returnAt: new Date(tReturnAt).toISOString(),
        returnMileage: Number(tReturnMileage || 0),
        washOrGas: !!tWashGas,
        receiptFiled: !!tReceipt,
        reviewedSchedule: !!tReviewed,
        countTransportsMorning: !!tCountM,
        countTransportsReturn: !!tCountR,
        countTransportsEndOfDay: !!tCountE,
        copySheetsNeeded: tCopySheets,
        gasReceiptSubmitted: tGasReceipt,
        techSignature: tTechSig,
        supervisorSignature: tSupSig,
        notes: tNotes,
      };
      const r = await apiFetch('/api/transports/trip', {
        method: 'POST',
        body: JSON.stringify(b),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      setTrips((p) => [j.trip, ...p]);
      setTripOpen(false);
      show('Trip logged ✔', { tone: 'ok' });
    } catch (e2) {
      show(e2.message || 'Failed to save trip', { tone: 'danger', ms: 8000 });
    } finally {
      setSavingTrip(false);
    }
  }

  async function saveFuel(e) {
    e.preventDefault();
    try {
      setSavingFuel(true);
      const b = {
        date: new Date(fDate).toISOString(),
        mileage: Number(fMileage || 0),
        pricePerGallon: Number(fPrice || 0),
        gallons: fGallons ? Number(fGallons) : undefined,
        amount: fAmount ? Number(fAmount) : undefined,
        vendor: fVendor,
        signature: fSig,
        notes: fNotes,
      };
      const r = await apiFetch('/api/transports/fuel', {
        method: 'POST',
        body: JSON.stringify(b),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      setFuels((p) => [j.fuel, ...p]);
      setFuelOpen(false);
      show('Fuel logged ✔', { tone: 'ok' });
    } catch (e2) {
      show(e2.message || 'Failed to save fuel', { tone: 'danger', ms: 8000 });
    } finally {
      setSavingFuel(false);
    }
  }

  return (
    <div>
      {/* Header: title + export controls */}
      <div className="sq__header">
        <h1 className="sq__title">Transport</h1>
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
          {tab === 'trips' ? (
            <button className="sq__btnGhost" onClick={() => exportCSV('transport')}>
              Export CSV
            </button>
          ) : (
            <button className="sq__btnGhost" onClick={() => exportCSV('fuel')}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI strip (based on selected month) */}
      <div
        className="sq__filters"
        style={{
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 6,
          paddingTop: 8,
          paddingBottom: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <KPI label="Trips" value={kpis.trips} />
        <KPI label="Miles" value={fmtNum(kpis.miles, 0)} />
        <KPI label="Drive time (h)" value={fmtNum(kpis.hours, 1)} />
        <KPI label="Fuel (gal)" value={fmtNum(kpis.gallons, 2)} />
        <KPI label="Fuel spend" value={`$${fmtNum(kpis.spend, 2)}`} />
        <KPI label="Avg $/gal" value={kpis.avgPrice ? `$${fmtNum(kpis.avgPrice, 3)}` : '—'} />
        <KPI
          label="Cost / mile"
          value={kpis.costPerMile ? `$${fmtNum(kpis.costPerMile, 2)}` : '—'}
        />
      </div>

      {/* Filters / actions row */}
      <div className="sq__filters">
        <div
          className="sq__input"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            width: 'fit-content',
          }}
        >
          <button
            className={`sq__btn ${tab === 'trips' ? 'sq__btnPrimary' : ''}`}
            onClick={() => setTab('trips')}
          >
            Trips
          </button>
          <button
            className={`sq__btn ${tab === 'fuel' ? 'sq__btnPrimary' : ''}`}
            onClick={() => setTab('fuel')}
          >
            Fuel
          </button>
        </div>
        <input
          className="sq__input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {tab === 'trips' ? (
          <button className="sq__btn" onClick={() => setTripOpen(true)}>
            Log trip
          </button>
        ) : (
          <button className="sq__btn" onClick={() => setFuelOpen(true)}>
            Log fuel
          </button>
        )}
      </div>

      {err && <div className="sq__error">Failed to load: {err}</div>}
      {loading && <div className="sq__loading">Loading…</div>}

      {!loading && !err && tab === 'trips' && (
        <div className="sq__tableWrap">
          <table className="sq__table">
            <thead className="sq__thead">
              <tr>
                <th className="sq__th">Date</th>
                <th className="sq__th">Driver</th>
                <th className="sq__th">Destination</th>
                <th className="sq__th">Start</th>
                <th className="sq__th">Depart</th>
                <th className="sq__th">Return</th>
                <th className="sq__th">Return</th>
                <th className="sq__th">Flags</th>
                <th className="sq__th">Signatures</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.length ? (
                filteredTrips.map((r) => (
                  <tr key={r._id} className="sq__tr">
                    <td className="sq__td">{r.date ? formatDateTime(r.date) : '—'}</td>
                    <td className="sq__td">{r.driver || '—'}</td>
                    <td className="sq__td">{r.destination || '—'}</td>
                    <td className="sq__td">{r.startMileage ?? '—'}</td>
                    <td className="sq__td">{r.departAt ? formatDateTime(r.departAt) : '—'}</td>
                    <td className="sq__td">{r.returnAt ? formatDateTime(r.returnAt) : '—'}</td>
                    <td className="sq__td">{r.returnMileage ?? '—'}</td>
                    <td className="sq__td">
                      {(r.washOrGas ? 'Wash/Gas • ' : '') +
                        (r.receiptFiled ? 'Receipt • ' : '') +
                        (r.reviewedSchedule ? 'Reviewed • ' : '') +
                        (r.countTransportsMorning ? 'AM • ' : '') +
                        (r.countTransportsReturn ? 'Ret • ' : '') +
                        (r.countTransportsEndOfDay ? 'EOD • ' : '')}
                      {r.copySheetsNeeded ? `Copy:${r.copySheetsNeeded}` : ''}
                      {r.gasReceiptSubmitted ? ` • GasRec:${r.gasReceiptSubmitted}` : ''}
                    </td>
                    <td className="sq__td">
                      {(r.techSignature || '—') + ' / ' + (r.supervisorSignature || '—')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sq__td" colSpan={9} style={{ opacity: 0.7 }}>
                    No trips logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !err && tab === 'fuel' && (
        <div className="sq__tableWrap">
          <table className="sq__table">
            <thead className="sq__thead">
              <tr>
                <th className="sq__th">Date</th>
                <th className="sq__th">Mileage</th>
                <th className="sq__th">Price/Gal</th>
                <th className="sq__th">Gallons</th>
                <th className="sq__th">Amount</th>
                <th className="sq__th">Vendor</th>
                <th className="sq__th">Signature</th>
                <th className="sq__th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuels.length ? (
                filteredFuels.map((r) => (
                  <tr key={r._id} className="sq__tr">
                    <td className="sq__td">{r.date ? formatDateTime(r.date) : '—'}</td>
                    <td className="sq__td">{r.mileage ?? '—'}</td>
                    <td className="sq__td">{r.pricePerGallon ?? '—'}</td>
                    <td className="sq__td">{r.gallons ?? '—'}</td>
                    <td className="sq__td">{r.amount ?? '—'}</td>
                    <td className="sq__td">{r.vendor || '—'}</td>
                    <td className="sq__td">{r.signature || '—'}</td>
                    <td className="sq__td">{r.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sq__td" colSpan={8} style={{ opacity: 0.7 }}>
                    No fuel logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Trip modal */}
      {tripOpen && (
        <div className="sq__modal">
          <div className="sq__modalCard">
            <div className="sq__modalHeader">
              <h3>Log Trip</h3>
              <button className="sq__btnGhost" onClick={() => setTripOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={saveTrip} className="sq__verifyForm">
              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Driver</label>
                  <input
                    className="sq__input"
                    value={tDriver}
                    onChange={(e) => setTDriver(e.target.value)}
                    required
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Destination</label>
                  <input
                    className="sq__input"
                    value={tDestination}
                    onChange={(e) => setTDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sq__row3">
                <div className="sq__field">
                  <label className="sq__label">Start Mileage</label>
                  <input
                    type="number"
                    className="sq__input"
                    value={tStartMileage}
                    onChange={(e) => setTStartMileage(e.target.value)}
                    required
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Return Mileage</label>
                  <input
                    type="number"
                    className="sq__input"
                    value={tReturnMileage}
                    onChange={(e) => setTReturnMileage(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Depart Time</label>
                  <input
                    type="datetime-local"
                    className="sq__input"
                    value={tDepartAt}
                    onChange={(e) => setTDepartAt(e.target.value)}
                    required
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Return Time</label>
                  <input
                    type="datetime-local"
                    className="sq__input"
                    value={tReturnAt}
                    onChange={(e) => setTReturnAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sq__row3">
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tWashGas}
                    onChange={(e) => setTWashGas(e.target.checked)}
                  />{' '}
                  Wash/Gas
                </label>
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tReceipt}
                    onChange={(e) => setTReceipt(e.target.checked)}
                  />{' '}
                  Receipt filed
                </label>
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tReviewed}
                    onChange={(e) => setTReviewed(e.target.checked)}
                  />{' '}
                  Reviewed schedule
                </label>
              </div>
              <div className="sq__row3">
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tCountM}
                    onChange={(e) => setTCountM(e.target.checked)}
                  />{' '}
                  Count Morning
                </label>
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tCountR}
                    onChange={(e) => setTCountR(e.target.checked)}
                  />{' '}
                  Count Return
                </label>
                <label className="sq__checkbox">
                  <input
                    type="checkbox"
                    checked={tCountE}
                    onChange={(e) => setTCountE(e.target.checked)}
                  />{' '}
                  Count End of day
                </label>
              </div>

              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Copy Sheets Needed</label>
                  <select
                    className="sq__input"
                    value={tCopySheets}
                    onChange={(e) => setTCopySheets(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="sq__field">
                  <label className="sq__label">Gas Receipt Submitted</label>
                  <select
                    className="sq__input"
                    value={tGasReceipt}
                    onChange={(e) => setTGasReceipt(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
              </div>

              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Tech Signature</label>
                  <input
                    className="sq__input"
                    value={tTechSig}
                    onChange={(e) => setTTechSig(e.target.value)}
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Supervisor Signature</label>
                  <input
                    className="sq__input"
                    value={tSupSig}
                    onChange={(e) => setTSupSig(e.target.value)}
                  />
                </div>
              </div>

              <div className="sq__field">
                <label className="sq__label">Notes</label>
                <input
                  className="sq__input"
                  value={tNotes}
                  onChange={(e) => setTNotes(e.target.value)}
                />
              </div>

              <div className="sq__actionsBar">
                <button className="sq__btnPrimary" disabled={savingTrip}>
                  {savingTrip ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="sq__btnGhost" onClick={() => setTripOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel modal */}
      {fuelOpen && (
        <div className="sq__modal">
          <div className="sq__modalCard">
            <div className="sq__modalHeader">
              <h3>Log Fuel Purchase</h3>
              <button className="sq__btnGhost" onClick={() => setFuelOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={saveFuel} className="sq__verifyForm">
              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Date/Time</label>
                  <input
                    type="datetime-local"
                    className="sq__input"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    required
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Mileage</label>
                  <input
                    type="number"
                    className="sq__input"
                    value={fMileage}
                    onChange={(e) => setFMilage(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="sq__row3">
                <div className="sq__field">
                  <label className="sq__label">Price/Gallon</label>
                  <input
                    type="number"
                    step="0.001"
                    className="sq__input"
                    value={fPrice}
                    onChange={(e) => setFPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Gallons (optional)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="sq__input"
                    value={fGallons}
                    onChange={(e) => setFGallons(e.target.value)}
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Amount (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="sq__input"
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="sq__row2">
                <div className="sq__field">
                  <label className="sq__label">Vendor</label>
                  <input
                    className="sq__input"
                    value={fVendor}
                    onChange={(e) => setFVendor(e.target.value)}
                  />
                </div>
                <div className="sq__field">
                  <label className="sq__label">Signature</label>
                  <input
                    className="sq__input"
                    value={fSig}
                    onChange={(e) => setFSig(e.target.value)}
                  />
                </div>
              </div>
              <div className="sq__field">
                <label className="sq__label">Notes</label>
                <input
                  className="sq__input"
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                />
              </div>

              <div className="sq__actionsBar">
                <button className="sq__btnPrimary" disabled={savingFuel}>
                  {savingFuel ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="sq__btnGhost" onClick={() => setFuelOpen(false)}>
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

/* ---------- helpers ---------- */
function localInputNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function filterByText(list, q, keys) {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((x) =>
    keys
      .map((k) => String(x?.[k] ?? '').toLowerCase())
      .join(' • ')
      .includes(needle)
  );
}

function fmtNum(n, digits = 0) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function KPI({ label, value }) {
  return (
    <div
      className="sq__input"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 120,
      }}
      title={label}
    >
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
