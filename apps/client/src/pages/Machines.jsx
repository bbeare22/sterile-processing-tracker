import { useEffect, useMemo, useState } from "react";
import MachineCard from "../components/MachineCard/MachineCard";
import MachineForm from "../components/MachineForm/MachineForm";
import ModalWithForm from "../components/ModalWithForm/ModalWithForm";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast/ToastProvider";
import { apiFetch } from "../utils/api";
import "./machines.css";

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

  async function handleDelete(x) {
    if (!confirm(`Delete machine "${x.name}"? This cannot be undone.`)) return;
    try {
      const r = await apiFetch(`/api/machines/${x._id}`, { method: "DELETE" });
      if (!r.ok && r.status !== 204) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${r.status}`);
      }
      setRows((prev) => prev.filter((p) => p._id !== x._id));
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
      <div className="mach__header">
        <h1 className="mach__title">Machines</h1>
        {user && (
          <button onClick={openAdd} className="mach__addBtn">
            + Add Machine
          </button>
        )}
      </div>

      <div className="mach__filters">
        <input
          className="mach__input"
          placeholder="Search name/model/location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="mach__input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="washer">Washer</option>
          <option value="sterilizer">Sterilizer</option>
          <option value="ultrasonic">Ultrasonic</option>
        </select>
      </div>

      {loading && <div className="mach__loading">Loading machines…</div>}
      {err && <div className="mach__error">Failed to load: {err}</div>}

      {!loading && !err && (
        <div className="mach__grid">
          {filtered.map((m) => (
            <MachineCard
              key={m._id}
              m={m}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
          {!filtered.length && (
            <div className="mach__empty">No machines match your filter.</div>
          )}
        </div>
      )}

      {showForm && (
        <ModalWithForm
          title={editing ? "Edit Machine" : "Add Machine"}
          onClose={closeForm}
        >
          <MachineForm
            title={editing ? "Edit Machine" : "Add Machine"}
            initialValues={editing || undefined}
            onCancel={closeForm}
            onSubmit={handleSave}
            submitting={submitting}
          />
        </ModalWithForm>
      )}
    </>
  );
}
