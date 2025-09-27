import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/date";
import "./pm-tasks.css";

export default function PMTasks() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [status, setStatus] = useState("pending"); // pending | completed | skipped | all
  const [dueIn7, setDueIn7] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      // the API supports status=... (or omit for pending)
      const params = new URLSearchParams();
      if (status && status !== "pending") params.set("status", status);
      const r = await apiFetch(`/api/pm/tasks?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRows(j.tasks || []);
    } catch (e) {
      setErr(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);

    return (rows || []).filter((t) => {
      if (dueIn7) {
        const d = t.dueAt ? new Date(t.dueAt) : null;
        if (!d || d > in7) return false;
      }
      if (!needle) return true;
      const hay = [t.name, t.machineId?.name, t.machineId?.location, t.status]
        .map((x) => String(x || "").toLowerCase())
        .join(" • ");
      return hay.includes(needle);
    });
  }, [rows, q, dueIn7]);

  async function mutateTask(id, payload) {
    const r = await apiFetch(`/api/pm/tasks/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.error || `HTTP ${r.status}`);
    }
    const j = await r.json();
    return j.task;
  }

  async function handleComplete(t) {
    try {
      const updated = await mutateTask(t._id, {
        status: "completed",
        notes: "",
      });
      setRows((prev) => prev.map((x) => (x._id === t._id ? updated : x)));
    } catch (e) {
      alert(e.message || "Failed to complete task");
    }
  }

  async function handleSkip(t) {
    try {
      const updated = await mutateTask(t._id, {
        status: "skipped",
        notes: "",
      });
      setRows((prev) => prev.map((x) => (x._id === t._id ? updated : x)));
    } catch (e) {
      alert(e.message || "Failed to skip task");
    }
  }

  return (
    <div className="pm__wrap">
      <div className="pm__header">
        <h1 className="pm__title">PM Tasks</h1>

        <div className="pm__filters">
          <select
            className="pm__input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            title="Status"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
            <option value="all">All</option>
          </select>

          <label className="pm__check">
            <input
              type="checkbox"
              checked={dueIn7}
              onChange={(e) => setDueIn7(e.target.checked)}
            />
            Due in next 7 days
          </label>

          <input
            className="pm__input"
            placeholder="Search machine / plan / location"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {err && <div className="pm__error">Failed to load: {err}</div>}
      {loading && <div className="pm__loading">Loading…</div>}

      {!loading && !err && (
        <div className="pm__tableWrap">
          <table className="pm__table">
            <thead className="pm__thead">
              <tr>
                <th className="pm__th">Machine</th>
                <th className="pm__th">Plan</th>
                <th className="pm__th">Due</th>
                <th className="pm__th">Status</th>
                <th className="pm__th">Notes</th>
                <th className="pm__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((t) => (
                  <tr key={t._id} className="pm__tr">
                    <td className="pm__td">
                      <div className="pm__tdMain">
                        <strong>{t.machineId?.name || "Unknown"}</strong>
                        <span className="pm__muted">
                          {t.machineId?.location || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="pm__td">{t.name || "—"}</td>
                    <td className="pm__td">
                      {t.dueAt ? formatDateTime(t.dueAt) : "—"}
                    </td>
                    <td className="pm__td">
                      <span className={`pm__badge pm__badge--${t.status}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="pm__td">{t.completionNotes || "—"}</td>
                    <td className="pm__td">
                      <div className="pm__actions">
                        <Link
                          className="pm__link"
                          to={`/machines/${t.machineId?._id || ""}`}
                        >
                          View machine
                        </Link>
                        {t.status === "pending" && (
                          <>
                            <button
                              className="pm__btn pm__btn--primary"
                              onClick={() => handleComplete(t)}
                            >
                              Complete
                            </button>
                            <button
                              className="pm__btn"
                              onClick={() => handleSkip(t)}
                            >
                              Skip
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="pm__td" colSpan={6} style={{ opacity: 0.7 }}>
                    No tasks match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
