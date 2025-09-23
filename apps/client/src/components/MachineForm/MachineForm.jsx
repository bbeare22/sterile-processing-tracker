import { useEffect } from "react";
import { useForm } from "react-hook-form";
import "./machine-form.css";

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
    <form className="mf" onSubmit={handleSubmit(submit)}>
      <h2 className="mf__title">{title}</h2>

      <div className="mf__field">
        <label className="mf__label">Name</label>
        <input
          className="mf__input"
          {...register("name", { required: "Name is required" })}
        />
        {errors.name && <div className="mf__error">{errors.name.message}</div>}
      </div>

      <div className="mf__field">
        <label className="mf__label">Model</label>
        <input className="mf__input" {...register("model")} />
      </div>

      <div className="mf__row">
        <div className="mf__field">
          <label className="mf__label">Type</label>
          <select className="mf__input" {...register("type")}>
            <option value="washer">Washer</option>
            <option value="sterilizer">Sterilizer</option>
            <option value="ultrasonic">Ultrasonic</option>
          </select>
        </div>

        <div className="mf__field">
          <label className="mf__label">Status</label>
          <select className="mf__input" {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="mf__field">
        <label className="mf__label">Location</label>
        <input className="mf__input" {...register("location")} />
      </div>

      <div className="mf__field">
        <label className="mf__label">Last Descale (optional)</label>
        <input
          type="datetime-local"
          className="mf__input"
          {...register("lastDescaleAt")}
        />
      </div>

      <div className="mf__actions">
        <button
          type="submit"
          disabled={submitting}
          className="mf__btn mf__btn--primary"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mf__btn mf__btn--ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
