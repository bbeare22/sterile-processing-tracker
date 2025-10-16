import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/Toast/ToastProvider';
import './maintenance.css';

export default function Maintenance() {
  const { show } = useToast();
  const [params] = useSearchParams();

  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({
    machineId: '',
    type: 'descale',
    performedAt: new Date().toISOString(),
    volumeUsedMl: '',
    notes: '',
    performedBy: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // --- daily verify (washer) state ---
  const [daily, setDaily] = useState({
    r1: [false, false, false, false, false],
    r2: [false, false, false, false, false],
    debris: false,
  });

  // --- weekly washer tasks state ---
  const [weekly, setWeekly] = useState({
    sprayArms: false,
    tubingFloat: false,
    doorSeal: false,
    deconDescale: false,
  });

  const selectedMachine = useMemo(
    () => machines.find((m) => m._id === form.machineId),
    [machines, form.machineId]
  );

  const allowedTypes = useMemo(() => {
    if (!selectedMachine) return [];
    if (selectedMachine.type === 'sterilizer') {
      return [
        { value: 'daily_inspection', label: 'Daily inspection' },
        { value: 'cleaning', label: 'Quarterly cleaning' },
      ];
    }
    if (selectedMachine.type === 'washer') {
      return [
        { value: 'descale', label: 'Descale' },
        {
          value: 'washer_daily_verify',
          label: 'Daily washer verify (racks + screen)',
        },
        { value: 'washer_weekly_tasks', label: 'Weekly washer tasks' },
      ];
    }
    return [{ value: 'descale', label: 'Descale' }];
  }, [selectedMachine]);

  const showVolume =
    selectedMachine && selectedMachine.type !== 'sterilizer' && form.type === 'descale';

  // helpers to reset sub-forms
  function resetDaily() {
    setDaily({
      r1: [false, false, false, false, false],
      r2: [false, false, false, false, false],
      debris: false,
    });
  }
  function resetWeekly() {
    setWeekly({
      sprayArms: false,
      tubingFloat: false,
      doorSeal: false,
      deconDescale: false,
    });
  }

  // build summaries for notes
  function dailySummary() {
    const ok = (arr) =>
      arr
        .map((b, i) => (b ? `${i + 1}` : null))
        .filter(Boolean)
        .join('/');
    const r1 = ok(daily.r1);
    const r2 = ok(daily.r2);
    return `Daily verify — Rack1: [${r1 || 'none'}], Rack2: [${
      r2 || 'none'
    }], Debris screen: ${daily.debris ? 'cleaned' : 'not cleaned'}`;
  }
  function weeklySummary() {
    const picked = [
      weekly.sprayArms && 'Clean/Inspect spray arms',
      weekly.tubingFloat && 'Inspect chemical tubing & float',
      weekly.doorSeal && 'Clean/Disinfect door seal',
      weekly.deconDescale && 'Run decontam/descale cycle',
    ].filter(Boolean);
    return `Weekly washer tasks — ${picked.length ? picked.join('; ') : 'none selected'}`;
  }

  // load machines & preselect
  useEffect(() => {
    async function load() {
      const r = await apiFetch('/api/machines');
      const j = await r.json();
      setMachines(j.machines || []);
      const preset = params.get('machineId');
      if (preset) setForm((f) => ({ ...f, machineId: preset }));
    }
    load();
  }, [params]);

  // ensure valid type for machine
  useEffect(() => {
    if (!selectedMachine) return;
    const first = allowedTypes[0]?.value;
    if (first && !allowedTypes.find((t) => t.value === form.type)) {
      setForm((f) => ({ ...f, type: first, volumeUsedMl: '' }));
      resetDaily();
      resetWeekly();
    }
  }, [selectedMachine, allowedTypes]); // eslint-disable-line

  // when type changes, clear irrelevant fields/sections
  useEffect(() => {
    if (form.type !== 'descale' && form.volumeUsedMl) {
      setForm((f) => ({ ...f, volumeUsedMl: '' }));
    }
    if (form.type !== 'washer_daily_verify') resetDaily();
    if (form.type !== 'washer_weekly_tasks') resetWeekly();
  }, [form.type]);

  const dailyAllChecked =
    form.type !== 'washer_daily_verify' ||
    (daily.r1.every(Boolean) && daily.r2.every(Boolean) && daily.debris === true);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);

      // compose notes with checklist summaries (keeps server contract)
      let composedNotes = (form.notes || '').trim();
      if (form.type === 'washer_daily_verify') {
        const chunk = dailySummary();
        composedNotes = composedNotes ? `${composedNotes}\n${chunk}` : chunk;
      } else if (form.type === 'washer_weekly_tasks') {
        const chunk = weeklySummary();
        composedNotes = composedNotes ? `${composedNotes}\n${chunk}` : chunk;
      }

      const payload = {
        machineId: form.machineId,
        type: form.type,
        performedAt: new Date(form.performedAt).toISOString(),
        notes: composedNotes,
        performedBy: form.performedBy?.trim() || '',
      };
      if (showVolume) payload.volumeUsedMl = Number(form.volumeUsedMl || 0);

      const r = await apiFetch('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }

      // reset form
      setForm((f) => ({
        ...f,
        type: allowedTypes[0]?.value || 'descale',
        volumeUsedMl: '',
        notes: '',
        performedBy: '',
      }));
      resetDaily();
      resetWeekly();
      show('Maintenance saved ✔', { tone: 'ok' });
    } catch (e2) {
      show(e2.message || 'Failed to save maintenance', {
        tone: 'danger',
        ms: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="maint__title">Log Maintenance</h1>

      <form onSubmit={onSubmit} className="maint__card">
        {/* Machine */}
        <div className="maint__field">
          <label className="maint__label">Machine</label>
          <select
            value={form.machineId}
            onChange={(e) => setForm((f) => ({ ...f, machineId: e.target.value }))}
            className="maint__input"
            required
          >
            <option value="" disabled>
              Select a machine
            </option>
            {machines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div className="maint__field">
          <label className="maint__label">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="maint__input"
            disabled={!selectedMachine}
            required
          >
            {!selectedMachine && <option value="">Select a machine first</option>}
            {allowedTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Performed At */}
        <div className="maint__field">
          <label className="maint__label">Performed At</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(form.performedAt)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                performedAt: localInputToISO(e.target.value),
              }))
            }
            className="maint__input"
            required
          />
        </div>

        {/* Volume (Descale only) */}
        {showVolume && (
          <div className="maint__row2">
            <div className="maint__field">
              <label className="maint__label">Volume (mL)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g., 500"
                value={form.volumeUsedMl}
                onChange={(e) => setForm((f) => ({ ...f, volumeUsedMl: e.target.value }))}
                className="maint__input"
                required
              />
            </div>
            <div className="maint__field">
              <label className="maint__label">Volume (oz)</label>
              <input
                value={
                  form.volumeUsedMl
                    ? (Number(form.volumeUsedMl) / 29.5735).toFixed(1)
                    : 'auto-calculated'
                }
                readOnly
                className="maint__input"
              />
            </div>
          </div>
        )}

        {/* ===== Daily washer verify (checklist) ===== */}
        {form.type === 'washer_daily_verify' && (
          <div className="maint__fieldset">
            <div className="maint__legend">Daily washer verify</div>
            <div className="maint__grid">
              <ChecklistRack
                title="Rack 1"
                values={daily.r1}
                onChange={(idx, val) =>
                  setDaily((d) => {
                    const next = [...d.r1];
                    next[idx] = val;
                    return { ...d, r1: next };
                  })
                }
              />
              <ChecklistRack
                title="Rack 2"
                values={daily.r2}
                onChange={(idx, val) =>
                  setDaily((d) => {
                    const next = [...d.r2];
                    next[idx] = val;
                    return { ...d, r2: next };
                  })
                }
              />
            </div>
            <div className="maint__field">
              <label className="maint__checkbox">
                <input
                  type="checkbox"
                  checked={daily.debris}
                  onChange={(e) => setDaily((d) => ({ ...d, debris: e.target.checked }))}
                />
                <span>Clean debris screen</span>
              </label>
            </div>
            {!dailyAllChecked && (
              <div className="maint__hint">
                Check all shelves (1–5 on both racks) and debris screen to save.
              </div>
            )}
          </div>
        )}

        {/* ===== Weekly washer tasks (checklist) ===== */}
        {form.type === 'washer_weekly_tasks' && (
          <div className="maint__fieldset">
            <div className="maint__legend">Weekly washer tasks</div>
            <div className="maint__checks">
              <CheckRow
                label="Clean & inspect washer spray arms"
                checked={weekly.sprayArms}
                onChange={(v) => setWeekly((w) => ({ ...w, sprayArms: v }))}
              />
              <CheckRow
                label="Inspect chemical tubing for damage & dosing float for free motion"
                checked={weekly.tubingFloat}
                onChange={(v) => setWeekly((w) => ({ ...w, tubingFloat: v }))}
              />
              <CheckRow
                label="Clean/Disinfect door seal"
                checked={weekly.doorSeal}
                onChange={(v) => setWeekly((w) => ({ ...w, doorSeal: v }))}
              />
              <CheckRow
                label="Run decontam/descaler cycle"
                checked={weekly.deconDescale}
                onChange={(v) => setWeekly((w) => ({ ...w, deconDescale: v }))}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="maint__field">
          <label className="maint__label">Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="maint__input maint__input--textarea"
            placeholder={
              form.type === 'washer_daily_verify'
                ? 'Any additional notes (the checklist summary will be included automatically)'
                : form.type === 'washer_weekly_tasks'
                  ? 'Any additional notes (checked tasks will be summarized automatically)'
                  : ''
            }
          />
        </div>

        {/* Performed By */}
        <div className="maint__field">
          <label className="maint__label">Performed By (Initials)</label>
          <input
            placeholder="e.g., BB"
            value={form.performedBy}
            onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))}
            className="maint__input"
            required
          />
        </div>

        <div className="maint__actions">
          <button
            type="submit"
            disabled={submitting || !dailyAllChecked}
            className="btn btn--primary"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                type: allowedTypes[0]?.value || 'descale',
                volumeUsedMl: '',
                notes: '',
                performedBy: '',
              }))
            }
            className="btn btn--ghost"
          >
            Reset
          </button>
        </div>
      </form>
    </>
  );
}

/* ===== small presentational helpers ===== */
function ChecklistRack({ title, values, onChange }) {
  return (
    <div className="maint__rack">
      <div className="maint__rackTitle">{title}</div>
      <div className="maint__rackCols">
        {values.map((v, i) => (
          <label key={i} className="maint__checkbox">
            <input type="checkbox" checked={v} onChange={(e) => onChange(i, e.target.checked)} />
            <span>{`${i + 1}ᵗʰ shelf`}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="maint__checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* ------- datetime helpers ------- */
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
function localInputToISO(local) {
  const d = new Date(local);
  return d.toISOString();
}
