import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { mlToOz, ozToMl, round } from "../utils/units";

export default function Maintenance() {
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitErr, setSubmitErr] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      machineId: "",
      type: "descale",
      performedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      notes: "",
      volumeMl: "",
      volumeOz: "",
    },
  });

  // Load machines for dropdown
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    setLoadingMachines(true);
    fetch(`${base}/api/machines`)
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
      const base = import.meta.env.VITE_API_URL;
      const payload = {
        machineId: data.machineId,
        type: data.type,
        volumeUsedMl: Number(data.volumeMl || 0),
        performedAt: new Date(data.performedAt).toISOString(),
        notes: data.notes || "",
      };
      const res = await fetch(`${base}/api/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setSubmitMsg("Saved maintenance record ✔");
      reset({
        machineId: "",
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
      setSubmitErr(String(err.message || err));
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Log Maintenance</h1>

      {submitMsg && <Banner tone="ok" text={submitMsg} />}
      {submitErr && <Banner tone="danger" text={submitErr} />}

      <form onSubmit={handleSubmit(onSubmit)} style={formShell}>
        {/* Machine select */}
        <div>
          <label htmlFor="machineId">Machine</label>
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
        <div>
          <label htmlFor="type">Type</label>
          <select id="type" {...register("type")} style={inputStyle}>
            <option value="descale">Descale</option>
            <option value="cleaning">Cleaning</option>
            <option value="repair">Repair</option>
            <option value="qa">QA</option>
          </select>
        </div>

        {/* Date/time */}
        <div>
          <label htmlFor="performedAt">Performed At</label>
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
        <div
          style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
        >
          <div>
            <label htmlFor="volumeMl">Volume (mL)</label>
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
          <div>
            <label htmlFor="volumeOz">Volume (oz)</label>
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
        <div>
          <label htmlFor="notes">Notes (optional)</label>
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
  const border =
    tone === "danger" ? "var(--color-danger)" : "var(--color-accent)";
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

const formShell = {
  display: "grid",
  gap: 16,
  maxWidth: 640,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "var(--shadow-soft)",
};
const inputStyle = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "#0e1525",
  color: "var(--color-text)",
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
