import { useEffect, useMemo, useState } from "react";
import MachineCard from "../components/MachineCard/MachineCard";
import MachineForm from "../components/MachineForm/MachineForm";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast/ToastProvider";
import { apiFetch } from "../utils/api";

export default function Machines() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { show } = useToast();

  // Load machines
  useEffect(() => {
    setLoading(true);
    setErr("");
    apiFetch(`/api/machines`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
      )
      .then((d) => setRows(d.machines || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((m) => {
      const matchesQ = [m.name, m.model, m.location, m._id].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q.toLowerCase())
      );
      const matchesType = type === "all" ? true : m.type === type;
      return matchesQ && matchesType;
    });
  }, [rows, q, type]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(m) {
    setEditing(m);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSave(formData) {
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        lastDescaleAt: formData.lastDescaleAt
          ? new Date(formData.lastDescaleAt).toISOString()
          : undefined,
      };

      const url = editing ? `/api/machines/${editing._id}` : `/api/machines`;
      const res = await apiFetch(url, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const j = await res.json();

      if (editing) {
        setRows((prev) =>
          prev.map((x) => (x._id === editing._id ? j.machine : x))
        );
        show("Machine updated ✔", { tone: "ok" });
      } else {
        setRows((prev) => [j.machine, ...prev]);
        show("Machine added ✔", { tone: "ok" });
      }
      closeForm();
    } catch (e) {
      show(e.message || "Failed to save machine", { tone: "danger", ms: 5000 });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(m) {
    if (!confirm(`Delete machine "${m.name}"? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/api/machines/${m._id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      setRows((prev) => prev.filter((x) => x._id !== m._id));
      show("Machine deleted ✔", { tone: "ok" });
    } catch (e) {
      show(e.message || "Failed to delete machine", {
        tone: "danger",
        ms: 5000,
      });
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Machines</h1>
        {user && (
          <button onClick={openAdd} style={btnPrimary}>
            + Add Machine
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Search name/model/location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={input}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={input}
        >
          <option value="all">All types</option>
          <option value="washer">Washer</option>
          <option value="sterilizer">Sterilizer</option>
          <option value="ultrasonic">Ultrasonic</option>
        </select>
      </div>

      {loading && <div style={{ opacity: 0.7 }}>Loading machines…</div>}
      {err && (
        <div style={{ color: "var(--color-danger)" }}>
          Failed to load: {err}
        </div>
      )}

      {!loading && !err && (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {filtered.map((m) => (
            <MachineCard
              key={m._id}
              m={m}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
          {!filtered.length && (
            <div style={{ opacity: 0.7 }}>No machines match your filter.</div>
          )}
        </div>
      )}

      {showForm && (
        <div style={overlay}>
          <div style={overlayPanel}>
            <MachineForm
              title={editing ? "Edit Machine" : "Add Machine"}
              initialValues={editing || undefined}
              onCancel={closeForm}
              onSubmit={handleSave}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </>
  );
}

const input = {
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

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};

const overlayPanel = {
  width: "min(720px, 92vw)",
};
