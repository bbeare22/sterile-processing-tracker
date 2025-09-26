import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card/Card";
import KPI from "../components/KPI/KPI";
import common from "../components/common.module.css";
import { apiFetch } from "../utils/api";
import { daysSince, formatDateTime } from "../utils/date";
import "./dashboard.css";

const DESCALE_THRESHOLD_DAYS = 7;

export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [maint, setMaint] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [pendingSpores, setPendingSpores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // today in YYYY-MM-DD for cycles filter
        const d = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}`;

        const [mRes, maRes, cRes, spRes] = await Promise.all([
          apiFetch("/api/machines"),
          apiFetch("/api/maintenance?limit=5"),
          apiFetch(`/api/cycles?date=${today}&limit=5`),
          apiFetch("/api/spores?status=pending&limit=5"),
        ]);

        if (!mRes.ok) throw new Error(`Machines HTTP ${mRes.status}`);
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        if (!cRes.ok) throw new Error(`Cycles HTTP ${cRes.status}`);
        if (!spRes.ok) throw new Error(`Spores HTTP ${spRes.status}`);

        const mJson = await mRes.json();
        const maJson = await maRes.json();
        const cJson = await cRes.json();
        const spJson = await spRes.json();

        setMachines(mJson.machines || []);
        setMaint(maJson.maintenance || []);
        setCycles(cJson.cycles || []);
        setPendingSpores(spJson.spores || []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { activeMachines, overdueDescales, cyclesToday, failedCyclesToday } =
    useMemo(() => {
      const activeMachines = machines.filter(
        (m) => m.status === "active"
      ).length;

      // Only washers should appear in overdue descales
      const overdueDescales = machines.filter(
        (m) =>
          m.type === "washer" &&
          daysSince(m.lastDescaleAt) > DESCALE_THRESHOLD_DAYS
      );

      const cyclesToday = cycles.length;
      const failedCyclesToday = cycles.filter(
        (c) => c.result === "fail"
      ).length;

      return {
        activeMachines,
        overdueDescales,
        cyclesToday,
        failedCyclesToday,
      };
    }, [machines, cycles]);

  return (
    <>
      <h1 className="dashboard__title">Dashboard</h1>

      {/* KPI row */}
      <div className="dashboard__kpis">
        <KPI label="Cycles Today" value={cyclesToday} tone="ok" />
        <KPI
          label="Failed Cycles"
          value={failedCyclesToday}
          tone={failedCyclesToday > 0 ? "warn" : "ok"}
        />
        <KPI
          label="Overdue Descales"
          value={overdueDescales.length}
          tone={overdueDescales.length ? "danger" : "ok"}
        />
        <KPI label="Active Machines" value={activeMachines} tone="ok" />
        <KPI
          label="Pending Spores"
          value={pendingSpores.length}
          tone={pendingSpores.length ? "warn" : "ok"}
        />
      </div>

      {loading && <div className="dashboard__loading">Loading data…</div>}
      {err && <div className="dashboard__error">Failed to load: {err}</div>}

      {!loading && !err && (
        <div className="dashboard__grid">
          {/* Recent Cycles */}
          <Card title="Recent Cycles">
            {cycles.length ? (
              <ul className="dashboard__list">
                {cycles.map((c) => (
                  <li key={c._id} className="dashboard__listItem">
                    <span
                      className={`${common.dot} ${
                        c.result === "fail"
                          ? common["dot--down"]
                          : common["dot--ok"]
                      }`}
                    />
                    <span className="dashboard__mutedWrap">
                      <strong>{c.machineId?.name || "Unknown"}</strong>
                      &nbsp;— Load {c.loadNumber || "—"} ({c.result}) •{" "}
                      {formatDateTime(c.startedAt)}
                    </span>
                    <Link
                      to={`/machines/${c.machineId?._id || ""}`}
                      className="dashboard__link"
                      style={{ marginLeft: "auto" }}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard__empty">No cycles today.</div>
            )}
          </Card>

          {/* Pending Spore Readouts */}
          <Card title="Pending Spore Readouts">
            {pendingSpores.length ? (
              <ul className="dashboard__list">
                {pendingSpores.map((c) => {
                  const sp = c.spore || {};
                  return (
                    <li key={c._id} className="dashboard__listItem">
                      <span
                        className={`${common.dot} ${common["dot--warn"]}`}
                      />
                      <span className="dashboard__mutedWrap">
                        <strong>{c.machineId?.name || "Unknown"}</strong>
                        &nbsp;— Lot {sp.lot || "—"} • Well {sp.well || "—"} •{" "}
                        Incubated{" "}
                        {sp.incubatedAt ? formatDateTime(sp.incubatedAt) : "—"}
                      </span>
                      <button
                        className="dashboard__chip"
                        style={{
                          background: "var(--color-brand)",
                          color: "#fff",
                        }}
                        onClick={() => navigate("/spores")}
                      >
                        Verify
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="dashboard__empty">No pending spores 🎉</div>
            )}
          </Card>

          {/* Recent Maintenance */}
          <Card title="Recent Maintenance">
            {maint.length ? (
              <ul className="dashboard__list">
                {maint.map((r) => (
                  <li key={r._id} className="dashboard__listItem">
                    <span className={`${common.dot} ${common["dot--ok"]}`} />
                    <span className="dashboard__mutedWrap">
                      <strong>{r.machineId?.name || "Unknown"}</strong>
                      &nbsp;— {r.type} • {formatDateTime(r.performedAt)}
                    </span>
                    <Link
                      to={`/machines/${r.machineId?._id || ""}`}
                      className="dashboard__link"
                      style={{ marginLeft: "auto" }}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dashboard__empty">No maintenance logged yet.</div>
            )}
          </Card>

          {/* Overdue Descales */}
          <Card title="Overdue Descales">
            {overdueDescales.length ? (
              <ul className="dashboard__list">
                {overdueDescales.map((m) => {
                  const days = daysSince(m.lastDescaleAt);
                  const color =
                    days > 14
                      ? "var(--color-danger)"
                      : days > 7
                      ? "var(--color-warn)"
                      : "var(--color-text)";
                  const dot =
                    m.status === "active"
                      ? common["dot--ok"]
                      : common["dot--down"];
                  return (
                    <li
                      key={m._id}
                      className="dashboard__listItem"
                      style={{ color }}
                    >
                      <span className={`${common.dot} ${dot}`} />
                      <Link
                        to={`/machines/${m._id}`}
                        className="dashboard__link"
                      >
                        {m.name}
                      </Link>
                      — {days} days
                      <Link
                        to={`/maintenance?machineId=${m._id}`}
                        className="dashboard__chip"
                        title="Log maintenance for this machine"
                      >
                        Log
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="dashboard__empty">
                All good. No overdue descales 🎉
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
