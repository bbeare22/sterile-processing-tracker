import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { mlToOz, ozToMl, round } from "../utils/units";

export default function Maintenance() {
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
      performedAt: new Date().toISOString().slice(0, 16),
      notes: "",
      volumeMl: "",
      volumeOz: "",
    },
  });

  // Keep mL and oz in sync
  const volumeMl = watch("volumeMl");
  const volumeOz = watch("volumeOz");

  // When mL changes, update oz (but avoid loops when both change)
  useEffect(() => {
    if (volumeMl === "" || isNaN(Number(volumeMl))) return;
    setValue("volumeOz", round(mlToOz(volumeMl), 2), { shouldValidate: true });
  }, [volumeMl, setValue]);

  // When oz changes, update mL
  useEffect(() => {
    if (volumeOz === "" || isNaN(Number(volumeOz))) return;
    setValue("volumeMl", Math.round(ozToMl(volumeOz)), {
      shouldValidate: true,
    });
  }, [volumeOz, setValue]);

  const onSubmit = async (data) => {
    // Mock submit for now
    console.log("Maintenance submit:", data);
    alert("Saved (mock): " + JSON.stringify(data, null, 2));
    reset();
  };

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Log Maintenance</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: "grid",
          gap: 16,
          maxWidth: 640,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        {/* Machine ID (free text for now) */}
        <div>
          <label htmlFor="machineId">Machine ID / Name</label>
          <input
            id="machineId"
            placeholder="e.g., AMSCO-5000-01"
            {...register("machineId", {
              required: "Please enter the machine id or name.",
            })}
            style={inputStyle}
          />
          {errors.machineId && <FieldError msg={errors.machineId.message} />}
        </div>

        {/* Type (fixed to descale for MVP) */}
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
                required: "Volume in mL is required.",
                validate: (v) => !isNaN(Number(v)) || "Enter a number",
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
            {/* No error necessary if left blank; it auto-fills */}
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
