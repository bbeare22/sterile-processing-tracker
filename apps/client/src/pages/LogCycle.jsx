import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { apiFetch } from "../utils/api";
import { useToast } from "../components/Toast/ToastProvider";

export default function LogCycle() {
  const { show } = useToast();
  const [machines, setMachines] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      machineId: "",
      loadNumber: "",
      startedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      completedAt: "",
      result: "pass",
      itemsText: "",
      notes: "",
    },
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const m = await apiFetch("/api/machines");
        const mj = await m.json();
        const ster = (mj.machines || []).filter((x) => x.type === "sterilizer");
        setMachines(ster);

        if (ster[0]?._id) {
          await fetchCycles(ster[0]._id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function fetchCycles(machineId) {
    const r = await apiFetch(`/api/cycles?machineId=${machineId}&limit=20`);
    const j = await r.json();
    setRows(j.cycles || []);
  }

  async function onSubmit(data) {
    try {
      const items = data.itemsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        machineId: data.machineId,
        loadNumber: data.loadNumber,
        startedAt: new Date(data.startedAt).toISOString(),
        completedAt: data.completedAt
          ? new Date(data.completedAt).toISOString()
          : null,
        result: data.result,
        items,
        notes: data.notes || "",
      };

      const r = await apiFetch("/api/cycles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${r.status}`);
      }
      const j = await r.json();
      show("Cycle saved ✔", { tone: "ok" });
      reset({
        machineId: data.machineId,
        loadNumber: "",
        startedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16),
        completedAt: "",
        result: "pass",
        itemsText: "",
        notes: "",
      });
      await fetchCycles(data.machineId);
    } catch (e) {
      show(e.message || "Failed to save", { tone: "danger", ms: 5000 });
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Log Sterilizer Cycle</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={formCard}>
        <div style={field}>
          <label style={label}>Sterilizer</label>
          <select
            {...register("machineId", { required: "Select a sterilizer" })}
            style={input}
            onChange={(e) => fetchCycles(e.target.value)}
          >
            <option value="">
              {loading ? "Loading…" : "Select a sterilizer"}
            </option>
            {machines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} — {m.location}
              </option>
            ))}
          </select>
          {errors.machineId && <Err msg={errors.machineId.message} />}
        </div>

        <div style={row2}>
          <div style={field}>
            <label style={label}>Load Number</label>
            <input
              {...register("loadNumber")}
              style={input}
              placeholder="Optional"
            />
          </div>
          <div style={field}>
            <label style={label}>Result</label>
            <select {...register("result")} style={input}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="abort">Abort</option>
            </select>
          </div>
        </div>

        <div style={row2}>
          <div style={field}>
            <label style={label}>Started At</label>
            <input
              type="datetime-local"
              {...register("startedAt", { required: true })}
              style={input}
            />
          </div>
          <div style={field}>
            <label style={label}>Completed At</label>
            <input
              type="datetime-local"
              {...register("completedAt")}
              style={input}
            />
          </div>
        </div>

        <div style={field}>
          <label style={label}>Contents (one per line)</label>
          <textarea
            {...register("itemsText")}
            rows={4}
            style={input}
            placeholder={`e.g.\nOrtho set A\nLap set B\nPeel-packs x6`}
          />
        </div>

        <div style={field}>
          <label style={label}>Notes</label>
          <textarea {...register("notes")} rows={3} style={input} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={isSubmitting} style={btnPrimary}>
            {isSubmitting ? "Saving…" : "Save"}
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
            style={btnGhost}
          >
            Reset
          </a>
        </div>
      </form>

      <h2 style={{ margin: "20px 0 12px" }}>Recent Cycles</h2>
      <div style={tableWrap}>
        <table style={table}>
          <thead style={thead}>
            <tr>
              <th style={th}>When</th>
              <th style={th}>Load #</th>
              <th style={th}>Result</th>
              <th style={th}>Items</th>
              <th style={th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((c) => (
                <tr key={c._id} style={tr}>
                  <td style={td}>{new Date(c.startedAt).toLocaleString()}</td>
                  <td style={td}>{c.loadNumber || "—"}</td>
                  <td style={td}>{c.result}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {(c.items || []).join(", ") || "—"}
                  </td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {c.notes || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ ...td, opacity: 0.7 }}>
                  No cycles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Err({ msg }) {
  return (
    <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 6 }}>
      {msg}
    </div>
  );
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
const tableWrap = {
  overflow: "auto",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-soft)",
};
const table = { width: "100%", borderCollapse: "separate", borderSpacing: 0 };
const thead = { background: "#0e1525", position: "sticky", top: 0 };
const th = { textAlign: "left", padding: "12px 16px" };
const tr = { borderTop: "1px solid var(--color-border)" };
const td = { padding: "12px 16px" };
