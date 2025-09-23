import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDateTime } from "../utils/date";
import { toCSV, downloadFile } from "../utils/csv";
import { apiFetch } from "../utils/api";
import "./cycles-history.css";

export default function CyclesHistory() {
  const { id } = useParams();

  const [machine, setMachine] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // machine (title)
        const mRes = await apiFetch(`/api/machines/${id}`);
        if (!mRes.ok) throw new Error(`Machine HTTP ${mRes.status}`);
        const mJson = await mRes.json();
        setMachine(mJson.machine || null);

        // cycles (all for this machine)
        const r = await apiFetch(`/api/cycles?machineId=${id}`);
        if (!r.ok) throw new Error(`Cycles HTTP ${r.status}`);
        const j = await r.json();
        setRows(j.cycles || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  function exportCSV() {
    const safeRows = Array.isArray(rows) ? rows : [];
    const data = safeRows.map((c) => ({
      "Load #": c.loadNumber || "",
      Started: c.startedAt ? formatDateTime(c.startedAt) : "",
      Completed: c.completedAt ? formatDateTime(c.completedAt) : "",
      Result: c.result || "",
      Items: c.items || "",
      Notes: c.notes || "",
      "Clinic/Dept": c.clinicName || "",
      "Load Staff": c.loadStaff || "",
      "Unload Staff": c.unloadStaff || "",
      "Sterile & Dry (min)": c.sterileDryMinutes ?? "",
      "Max Temp/Pressure": c.maxTempPressure || "",
      "Spore Ran": c.spore?.ran ? "yes" : "no",
      "Spore Well": c.spore?.well || "",
      "Spore Lot": c.spore?.lot || "",
      "Spore Exp": c.spore?.expireDate
        ? formatDateTime(c.spore.expireDate)
        : "",
      "Spore Incubated": c.spore?.incubatedAt
        ? formatDateTime(c.spore.incubatedAt)
        : "",
      "Spore Result": c.spore?.result || "",
      "Spore Verified By": c.spore?.verifiedBy || "",
    }));

    const csv = toCSV(data);
    const name = `cycles-${machine?.name || id}.csv`;
    downloadFile(csv, name, "text/csv");
  }

  return (
    <div className="cycles">
      {/* Header Bar */}
      <div className="cycles__header">
        <h1 className="cycles__title">
          Cycles — {machine ? machine.name : "…"}
        </h1>
        <div className="cycles__actions">
          <button
            onClick={exportCSV}
            className="cycles__btn cycles__btn--ghost"
          >
            Export CSV
          </button>
          <Link to={`/machines/${id}`} className="cycles__linkBtn">
            Back to machine
          </Link>
          <Link to={`/cycles?machineId=${id}`} className="cycles__linkBtn">
            Log cycle
          </Link>
        </div>
      </div>

      {err && <div className="cycles__error">Failed to load: {err}</div>}

      {/* Table */}
      <div className="cycles__tableWrap">
        <table className="cycles__table">
          <thead className="cycles__thead">
            <tr>
              <th className="cycles__th">Load #</th>
              <th className="cycles__th">Started</th>
              <th className="cycles__th">Completed</th>
              <th className="cycles__th">Result</th>
              <th className="cycles__th">Items</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="cycles__td cycles__td--muted" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r._id} className="cycles__tr">
                  <td className="cycles__td">{r.loadNumber || "—"}</td>
                  <td className="cycles__td">
                    {r.startedAt ? formatDateTime(r.startedAt) : "—"}
                  </td>
                  <td className="cycles__td">
                    {r.completedAt ? formatDateTime(r.completedAt) : "—"}
                  </td>
                  <td className="cycles__td">{r.result || "—"}</td>
                  <td className="cycles__td cycles__td--muted">
                    {r.items || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="cycles__td cycles__td--muted" colSpan={5}>
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
