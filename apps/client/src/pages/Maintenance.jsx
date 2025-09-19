import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { mlToOz, ozToMl, round } from "../utils/units";
import { useLocation } from "react-router-dom";
import { useToast } from "../components/Toast/ToastProvider";
import { apiFetch } from "../utils/api";

export default function Maintenance() {
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const preselectedId = params.get("machineId");
  const { show } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      machineId: preselectedId || "",
      type: "descale",
      performedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      notes: "",
      volumeMl: "",
      volumeOz: "",
    },
  });

  useEffect(() => {
    setLoadingMachines(true);
    apiFetch(`/api/machines`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d) => setMachines(d.machines || []))
      .catch(() => setMachines([]))
      .finally(() => setLoadingMachines(false));
  }, []);

  // Sync mL <-> oz
  const volumeMl = watch("volumeMl");
  const volumeOz = watch("volumeOz");

  useEffect(() => {
    if (volumeMl === "" || isNaN(Number(volumeMl))) return;
    setValue("volumeOz", round(mlToOz(volumeMl), 2), { shouldValidate: true });
  }, [volumeMl, setValue]);

  useEffect(() => {
    if (volumeOz === "" || isNaN(Number(volumeOz))) return;
    setValue("volumeMl", Math.round(ozToMl(volumeOz)), {
      shouldValidate: true,
    });
  }, [volumeOz, setValue]);

  const onSubmit = async (data) => {
    setSubmitMsg("");
    setSubmitErr("");
    try {
      const payload = {
        machineId: data.machineId,
        type: data.type,
        volumeUsedMl: Number(data.volumeMl || 0),
        performedAt: new Date(data.performedAt).toISOString(),
        notes: data.notes || "",
      };
      const res = await apiFetch(`/api/maintenance`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      await res.json();
      setSubmitMsg("Saved maintenance record ✔");
      show("Saved maintenance record ✔", { tone: "ok" });

      reset({
        machineId: preselectedId || "",
        type: "descale",
        performedAt: new Date(
          Date.now() - new Date().getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16),
        notes: "",
        volumeMl: "",
        volumeOz: "",
      });
    } catch (err) {
      const msg = String(err.message || err);
      setSubmitErr(msg);
      show(msg, { tone: "danger", ms: 5000 });
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Log Maintenance</h1>

      {submitMsg && <Banner tone="ok" text={submitMsg} />}
      {submitErr && <Banner tone="danger" text={submitErr} />}

      <form onSubmit={handleSubmit(onSubmit)} style={formCard}>
        {/* Machine select */}
        <div style={field}>
          <label htmlFor="machineId" style={label}>
            Machine
          </label>
          <select
            id="machineId"
            {...register("machineId", { required: "Please select a machine." })}
            style={inputStyle}
            disabled={loadingMachines}
          >
            <option value="">
              {loadingMachines ? "Loading…" : "Select a machine"}
            </option>
            {machines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} — {m.location}
              </option>
            ))}
          </select>
          {errors.machineId && <FieldError msg={errors.machineId.message} />}
        </div>

        {/* Type */}
        <div style={field}>
          <label htmlFor="type" style={label}>
            Type
          </label>
          <select id="type" {...register("type")} style={inputStyle}>
            <option value="descale">Descale</option>
            <option value="cleaning">Cleaning</option>
            <option value="repair">Repair</option>
            <option value="qa">QA</option>
          </select>
        </div>

        {/* Date/time */}
        <div style={field}>
          <label htmlFor="performedAt" style={label}>
            Performed At
          </label>
          <input
            id="performedAt"
            type="datetime-local"
            {...register("performedAt", { required: "Date/time is required." })}
            style={inputStyle}
          />
          {errors.performedAt && (
            <FieldError msg={errors.performedAt.message} />
          )}
        </div>

        {/* Volume (mL / oz) */}
        <div style={row2}>
          <div style={field}>
            <label htmlFor="volumeMl" style={label}>
              Volume (mL)
            </label>
            <input
              id="volumeMl"
              inputMode="numeric"
              placeholder="e.g., 500"
              {...register("volumeMl", {
                validate: (v) =>
                  v === "" || !isNaN(Number(v)) || "Enter a number",
              })}
              style={inputStyle}
            />
            {errors.volumeMl && <FieldError msg={errors.volumeMl.message} />}
          </div>
          <div style={field}>
            <label htmlFor="volumeOz" style={label}>
              Volume (oz)
            </label>
            <input
              id="volumeOz"
              inputMode="decimal"
              placeholder="auto-calculated"
              {...register("volumeOz", {
                validate: (v) =>
                  v === "" || !isNaN(Number(v)) || "Enter a number",
              })}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={field}>
          <label htmlFor="notes" style={label}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register("notes")}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={isSubmitting} style={btnPrimary}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => reset()} style={btnGhost}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 6 }}>
      {msg}
    </div>
  );
}
function Banner({ tone = "ok", text }) {
  const color =
    tone === "danger" ? "var(--color-danger)" : "var(--color-accent)";
  const border = color;
  return (
    <div
      style={{
        marginBottom: 12,
        border: `1px solid ${border}`,
        background: "#0e1525",
        borderRadius: 12,
        padding: "10px 12px",
        color,
      }}
    >
      {text}
    </div>
  );
}

/* ----- Layout-safe styles (match MachineForm) ----- */
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

const field = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

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
