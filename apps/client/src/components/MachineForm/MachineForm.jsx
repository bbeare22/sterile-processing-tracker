import { useEffect } from "react";
import { useForm } from "react-hook-form";

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function MachineForm({
  title = "Add Machine",
  initialValues,
  onCancel,
  onSubmit,
  submitting,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      model: "",
      type: "washer",
      status: "active",
      location: "",
      lastDescaleAt: "",
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        name: initialValues.name || "",
        model: initialValues.model || "",
        type: initialValues.type || "washer",
        status:
          initialValues.status === "out_of_service"
            ? "inactive"
            : initialValues.status || "active",
        location: initialValues.location || "",
        lastDescaleAt: toLocalInput(initialValues.lastDescaleAt),
      });
    }
  }, [initialValues, reset]);

  function submit(data) {
    const payload = {
      ...data,
      lastDescaleAt: data.lastDescaleAt
        ? new Date(data.lastDescaleAt).toISOString()
        : "",
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(submit)} style={card}>
      <h2 style={cardTitle}>{title}</h2>

      <div style={field}>
        <label style={label}>Name</label>
        <input
          style={input}
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && <div style={errText}>{errors.name.message}</div>}
      </div>

      <div style={field}>
        <label style={label}>Model</label>
        <input style={input} {...register("model")} />
      </div>

      <div style={row2}>
        <div style={field}>
          <label style={label}>Type</label>
          <select style={input} {...register("type")}>
            <option value="washer">Washer</option>
            <option value="sterilizer">Sterilizer</option>
            <option value="ultrasonic">Ultrasonic</option>
          </select>
        </div>

        <div style={field}>
          <label style={label}>Status</label>
          <select style={input} {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Location</label>
        <input style={input} {...register("location")} />
      </div>

      <div style={field}>
        <label style={label}>Last Descale (optional)</label>
        <input
          type="datetime-local"
          style={input}
          {...register("lastDescaleAt")}
        />
      </div>

      <div style={actions}>
        <button type="submit" disabled={submitting} style={btnPrimary}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} style={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ---- Inline styles: sized safely, no overflow ---- */
const card = {
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

const cardTitle = { margin: 0, fontSize: "1.1rem" };

const field = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const row2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  minWidth: 0,
};

const label = { fontSize: 14, opacity: 0.9 };

const input = {
  width: "100%",
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "#0e1525",
  color: "var(--color-text)",
  boxSizing: "border-box",
};

const actions = { display: "flex", gap: 10, marginTop: 8 };

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

const errText = { color: "var(--color-danger)", fontSize: 12 };
