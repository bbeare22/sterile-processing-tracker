import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/date";
import { useToast } from "../components/Toast/ToastProvider";
import "./decon.css";

const emptyCounts = () => ({ in: 0, out: 0 });

export default function Decon() {
  const { show } = useToast();

  // export controls (right side, like Spore Queue)
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [clinicFilter, setClinicFilter] = useState("");

  // list rows
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form state
  const [form, setForm] = useState({
    clinic: "",
    receivedAt: new Date().toISOString(),
    sentAt: "",
    verifiedInBy: "",
    verifiedOutBy: "",
    notes: "",
    sets: {
      basic: emptyCounts(),
      oralSurgery: emptyCounts(),
      srp: emptyCounts(),
      ultrasonic: emptyCounts(),
      restorative: emptyCounts(),
      endo: emptyCounts(),
      denture: emptyCounts(),
      rubberDam: emptyCounts(),
      xcp: emptyCounts(),
    },
    womens: {
      culpo: emptyCounts(),
      scissors: emptyCounts(),
      speculum: emptyCounts(),
      tenaculum: emptyCounts(),
      spongeForceps: emptyCounts(),
      dilator: emptyCounts(),
      bozeman: emptyCounts(),
      pessary: emptyCounts(),
      iud: emptyCounts(),
      misc: emptyCounts(),
    },
  });

  function isoToLocal(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localToISO(local) {
    if (!local) return "";
    return new Date(local).toISOString();
  }

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const p = new URLSearchParams();
      p.set("year", String(year));
      p.set("month", String(month));
      if (clinicFilter.trim()) p.set("clinic", clinicFilter.trim());
      const r = await apiFetch(`/api/decon?${p.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRows(j.rows || []);
    } catch (e) {
      setErr(e.message || "Failed to load decon rows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [year, month, clinicFilter]);

  function setCount(section, key, field, value) {
    const v = Math.max(0, Number(value || 0));
    setForm((f) => ({
      ...f,
      [section]: {
        ...f[section],
        [key]: { ...(f[section][key] || emptyCounts()), [field]: v },
      },
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        clinic: form.clinic.trim(),
        receivedAt: form.receivedAt,
        sentAt: form.sentAt || undefined,
        verifiedInBy: form.verifiedInBy.trim(),
        verifiedOutBy: form.verifiedOutBy.trim(),
        notes: form.notes.trim(),
        sets: form.sets,
        womens: form.womens,
      };
      if (!payload.clinic) throw new Error("Clinic is required.");
      if (!payload.receivedAt)
        throw new Error("Received date/time is required.");

      const r = await apiFetch("/api/decon", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      show("Decon row saved ✔", { tone: "ok" });
      // reload list
      load();
      // light reset (keep clinic)
      setForm((f) => ({
        ...f,
        receivedAt: new Date().toISOString(),
        sentAt: "",
        verifiedInBy: "",
        verifiedOutBy: "",
        notes: "",
      }));
    } catch (e) {
      show(e.message || "Failed to save", { tone: "danger", ms: 7000 });
    }
  }

  async function exportCSV() {
    try {
      const origin = window.location.origin.replace(":5173", ":3001");
      const p = new URLSearchParams();
      p.set("kind", "decon");
      p.set("year", String(year));
      p.set("month", String(month));
      if (clinicFilter.trim()) p.set("clinic", clinicFilter.trim());
      const url = `${origin}/api/reports/csv?${p.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const fname = `decon-${year}-${String(month).padStart(2, "0")}${
        clinicFilter ? "-" + clinicFilter : ""
      }.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      show(e.message || "Export failed", { tone: "danger" });
    }
  }

  // ✅ renamed to avoid clashing with useState setter
  const dentalSetDefs = [
    ["basic", "Basic"],
    ["oralSurgery", "Oral Surgery"],
    ["srp", "SRP"],
    ["ultrasonic", "Ultrasonic"],
    ["restorative", "Restorative"],
    ["endo", "Endo"],
    ["denture", "Denture"],
    ["rubberDam", "Rubber dam"],
    ["xcp", "XCP"],
  ];
  const womensRows = [
    ["culpo", "Culpo"],
    ["scissors", "Scissors"],
    ["speculum", "Speculum"],
    ["tenaculum", "Tenaculum"],
    ["spongeForceps", "Sponge forceps"],
    ["dilator", "Dilator"],
    ["bozeman", "Bozeman"],
    ["pessary", "Pessary"],
    ["iud", "IUD"],
    ["misc", "Misc."],
  ];

  return (
    <div className="decon">
      {/* Title + export controls (right) */}
      <div className="decon__header">
        <h1 className="decon__title">Decontamination</h1>
        <div className="decon__controls">
          <input
            className="decon__input"
            placeholder="Clinic filter (optional)"
            value={clinicFilter}
            onChange={(e) => setClinicFilter(e.target.value)}
            title="Filter by clinic for list/export"
            style={{ width: 180 }}
          />
          <input
            className="decon__input"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) =>
              setYear(Number(e.target.value || now.getUTCFullYear()))
            }
            title="Year"
            style={{ width: 100 }}
          />
          <select
            className="decon__input"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            title="Month"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
          <button className="decon__btnGhost" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="decon__card">
        <div className="decon__row3">
          <div className="decon__field">
            <label className="decon__label">Clinic</label>
            <input
              className="decon__input"
              placeholder="e.g., IC / Women's / Jet Wing"
              value={form.clinic}
              onChange={(e) =>
                setForm((f) => ({ ...f, clinic: e.target.value }))
              }
              required
            />
          </div>
          <div className="decon__field">
            <label className="decon__label">Received (pickup)</label>
            <input
              type="datetime-local"
              className="decon__input"
              value={isoToLocal(form.receivedAt)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  receivedAt: localToISO(e.target.value),
                }))
              }
              required
            />
          </div>
          <div className="decon__field">
            <label className="decon__label">Sent out (return)</label>
            <input
              type="datetime-local"
              className="decon__input"
              value={isoToLocal(form.sentAt)}
              onChange={(e) =>
                setForm((f) => ({ ...f, sentAt: localToISO(e.target.value) }))
              }
            />
          </div>
        </div>

        <div className="decon__row3">
          <div className="decon__field">
            <label className="decon__label">Received by (initials)</label>
            <input
              className="decon__input"
              value={form.verifiedInBy}
              onChange={(e) =>
                setForm((f) => ({ ...f, verifiedInBy: e.target.value }))
              }
              placeholder="e.g., DS"
            />
          </div>
          <div className="decon__field">
            <label className="decon__label">Sent out by (initials)</label>
            <input
              className="decon__input"
              value={form.verifiedOutBy}
              onChange={(e) =>
                setForm((f) => ({ ...f, verifiedOutBy: e.target.value }))
              }
              placeholder="e.g., DS"
            />
          </div>
          <div className="decon__field">
            <label className="decon__label">Notes (optional)</label>
            <input
              className="decon__input"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Tables */}
        <div className="decon__grids">
          <div className="decon__tableWrap">
            <table className="decon__table">
              <thead className="decon__thead">
                <tr>
                  <th className="decon__th">Dental Sets</th>
                  <th className="decon__th decon__thNum">IN</th>
                  <th className="decon__th decon__thNum">OUT</th>
                </tr>
              </thead>
              <tbody>
                {dentalSetDefs.map(([key, label]) => (
                  <tr key={key} className="decon__tr">
                    <td className="decon__td">
                      <strong>{label}</strong>
                    </td>
                    <td className="decon__td decon__tdNum">
                      <input
                        className="decon__input decon__inputNum"
                        inputMode="numeric"
                        value={form.sets[key]?.in ?? 0}
                        onChange={(e) =>
                          setCount("sets", key, "in", e.target.value)
                        }
                      />
                    </td>
                    <td className="decon__td decon__tdNum">
                      <input
                        className="decon__input decon__inputNum"
                        inputMode="numeric"
                        value={form.sets[key]?.out ?? 0}
                        onChange={(e) =>
                          setCount("sets", key, "out", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="decon__tableWrap">
            <table className="decon__table">
              <thead className="decon__thead">
                <tr>
                  <th className="decon__th">Women’s Clinic</th>
                  <th className="decon__th decon__thNum">IN</th>
                  <th className="decon__th decon__thNum">OUT</th>
                </tr>
              </thead>
              <tbody>
                {womensRows.map(([key, label]) => (
                  <tr key={key} className="decon__tr">
                    <td className="decon__td">
                      <strong>{label}</strong>
                    </td>
                    <td className="decon__td decon__tdNum">
                      <input
                        className="decon__input decon__inputNum"
                        inputMode="numeric"
                        value={form.womens[key]?.in ?? 0}
                        onChange={(e) =>
                          setCount("womens", key, "in", e.target.value)
                        }
                      />
                    </td>
                    <td className="decon__td decon__tdNum">
                      <input
                        className="decon__input decon__inputNum"
                        inputMode="numeric"
                        value={form.womens[key]?.out ?? 0}
                        onChange={(e) =>
                          setCount("womens", key, "out", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="decon__actions">
          <button className="decon__btnPrimary">Save</button>
        </div>
      </form>

      {/* Recent list */}
      <div className="decon__tableWrap" style={{ marginTop: 16 }}>
        <table className="decon__table">
          <thead className="decon__thead">
            <tr>
              <th className="decon__th">Clinic</th>
              <th className="decon__th">Received</th>
              <th className="decon__th">Sent</th>
              <th className="decon__th">Verified</th>
              <th className="decon__th">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="decon__td" colSpan={5} style={{ opacity: 0.7 }}>
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td
                  className="decon__td"
                  colSpan={5}
                  style={{ color: "var(--color-danger)" }}
                >
                  {err}
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r._id} className="decon__tr">
                  <td className="decon__td">
                    <strong>{r.clinic}</strong>
                  </td>
                  <td className="decon__td">{formatDateTime(r.receivedAt)}</td>
                  <td className="decon__td">
                    {r.sentAt ? formatDateTime(r.sentAt) : "—"}
                  </td>
                  <td className="decon__td">
                    {r.verifiedInBy ? <strong>{r.verifiedInBy}</strong> : "—"}
                    {r.verifiedOutBy ? ` / ${r.verifiedOutBy}` : ""}
                  </td>
                  <td className="decon__td decon__tdMuted">{r.notes || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="decon__td" colSpan={5} style={{ opacity: 0.7 }}>
                  No rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
