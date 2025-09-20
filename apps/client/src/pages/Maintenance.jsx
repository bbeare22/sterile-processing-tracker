import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useToast } from "../components/Toast/ToastProvider";

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
      <h1 style={{ marginBottom: 16 }}>Log Maintenance</h1>
      <form onSubmit={onSubmit} style={formCard}>
        {/* Machine */}
        <div style={field}>
          <label style={label}>Machine</label>
          <select
            value={form.machineId}
            onChange={(e) =>
              setForm((f) => ({ ...f, machineId: e.target.value }))
            }
            style={inputStyle}
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

        {/* Type (driven by machine) */}
        <div style={field}>
          <label style={label}>Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            style={inputStyle}
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
        <div style={field}>
          <label style={label}>Performed At</label>
          <input
            type="datetime-local"
            value={toLocalInput(form.performedAt)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                performedAt: fromLocalInput(e.target.value),
              }))
            }
            style={inputStyle}
            required
          />
        </div>

        {/* Volume (only for descale-capable machines) */}
        {showVolume && (
          <div style={row2}>
            <div style={field}>
              <label style={label}>Volume (mL)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g., 500"
                value={form.volumeUsedMl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, volumeUsedMl: e.target.value }))
                }
                style={inputStyle}
                required
              />
            </div>
            <div style={field}>
              <label style={label}>Volume (oz)</label>
              <input
                value={
                  form.volumeUsedMl
                    ? (Number(form.volumeUsedMl) / 29.5735).toFixed(1)
                    : "auto-calculated"
                }
                readOnly
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={field}>
          <label style={label}>Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting} style={btnPrimary}>
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
              }))
            }
            style={btnGhost}
          >
            Reset
          </button>
        </div>
      </form>
    </>
  );
}

/* ------- helpers & styles ------- */
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local) {
  const d = new Date(local);
  return d.toISOString();
}

const formCard = {
  width: "100%",
  maxWidth: 720,
  boxSizing: "border-box",
  padding: 24,
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-soft)",
  display: "grid",
  gap: 16,
  overflow: "hidden",
};
const field = { display: "grid", gap: 8, minWidth: 0 };
const row2 = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
  gap: 16,
  minWidth: 0,
};
const label = { fontSize: 14, opacity: 0.9 };
const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "#0e1525",
  color: "var(--color-text)",
  boxSizing: "border-box",
};
const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--color-brand)",
  background: "var(--color-brand)",
  color: "#fff",
  cursor: "pointer",
};
const btnGhost = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  cursor: "pointer",
};
