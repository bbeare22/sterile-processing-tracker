import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useToast } from "../components/Toast/ToastProvider";
import "./maintenance.css";

export default function Maintenance() {
  const { show } = useToast();
  const [params] = useSearchParams();

  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState({
    machineId: "",
    type: "descale",
    performedAt: new Date().toISOString(),
    volumeUsedMl: "",
    notes: "",
    performedBy: "", // NEW: initials field
  });
  const [submitting, setSubmitting] = useState(false);

  const selectedMachine = useMemo(
    () => machines.find((m) => m._id === form.machineId),
    [machines, form.machineId]
  );

  const allowedTypes = useMemo(() => {
    if (!selectedMachine) return [];
    if (selectedMachine.type === "sterilizer") {
      return [
        { value: "daily_inspection", label: "Daily inspection" },
        { value: "cleaning", label: "Quarterly cleaning" },
      ];
    }
    return [{ value: "descale", label: "Descale" }];
  }, [selectedMachine]);

  const showVolume =
    selectedMachine &&
    selectedMachine.type !== "sterilizer" &&
    form.type === "descale";

  useEffect(() => {
    async function load() {
      const r = await apiFetch("/api/machines");
      const j = await r.json();
      setMachines(j.machines || []);

      const preset = params.get("machineId");
      if (preset) {
        setForm((f) => ({ ...f, machineId: preset }));
      }
    }
    load();
  }, [params]);

  useEffect(() => {
    if (!selectedMachine) return;
    const first = allowedTypes[0]?.value;
    if (first && !allowedTypes.find((t) => t.value === form.type)) {
      setForm((f) => ({ ...f, type: first }));
    }
  }, [selectedMachine, allowedTypes]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);

      const payload = {
        machineId: form.machineId,
        type: form.type,
        performedAt: new Date(form.performedAt).toISOString(),
        notes: form.notes?.trim() || "",
        performedBy: form.performedBy?.trim() || "", // send initials
      };
      if (showVolume) {
        payload.volumeUsedMl = Number(form.volumeUsedMl || 0);
      }

      const r = await apiFetch("/api/maintenance", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }

      setForm((f) => ({
        ...f,
        type: allowedTypes[0]?.value || "descale",
        volumeUsedMl: "",
        notes: "",
        performedBy: "", // reset initials
      }));
      show("Maintenance saved ✔", { tone: "ok" });
    } catch (e2) {
      show(e2.message || "Failed to save maintenance", {
        tone: "danger",
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
            onChange={(e) =>
              setForm((f) => ({ ...f, machineId: e.target.value }))
            }
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
            {!selectedMachine && (
              <option value="">Select a machine first</option>
            )}
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

        {/* Volume */}
        {showVolume && (
          <div className="maint__row2">
            <div className="maint__field">
              <label className="maint__label">Volume (mL)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g., 500"
                value={form.volumeUsedMl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, volumeUsedMl: e.target.value }))
                }
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
                    : "auto-calculated"
                }
                readOnly
                className="maint__input"
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
          />
        </div>

        {/* Performed By */}
        <div className="maint__field">
          <label className="maint__label">Performed By (Initials)</label>
          <input
            placeholder="e.g., BB"
            value={form.performedBy}
            onChange={(e) =>
              setForm((f) => ({ ...f, performedBy: e.target.value }))
            }
            className="maint__input"
            required
          />
        </div>

        <div className="maint__actions">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn--primary"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                type: allowedTypes[0]?.value || "descale",
                volumeUsedMl: "",
                notes: "",
                performedBy: "",
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

/* ------- helpers ------- */
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
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
