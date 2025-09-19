import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card/Card";
import KPI from "../components/KPI/KPI";
import {
  daysSince,
  formatDateTime,
  startOfTodayLocalISO,
  endOfTodayLocalISO,
} from "../utils/date";
import { Link } from "react-router-dom";
import common from "../components/common.module.css";
import Skeleton from "../components/Skeleton/Skeleton";
import { apiFetch } from "../utils/api";

const DESCALE_THRESHOLD_DAYS = 7; // only applies to washers

export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [maint, setMaint] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");

        // machines + recent maintenance
        const [mRes, maRes] = await Promise.all([
          apiFetch(`/api/machines`),
          apiFetch(`/api/maintenance?limit=5`),
        ]);
        if (!mRes.ok) throw new Error(`Machines HTTP ${mRes.status}`);
        if (!maRes.ok) throw new Error(`Maintenance HTTP ${maRes.status}`);
        const mJson = await mRes.json();
        const maJson = await maRes.json();
        setMachines(mJson.machines || []);
        setMaint(maJson.maintenance || []);

        // today's sterilizer cycles (local day window)
        const from = startOfTodayLocalISO();
        const to = endOfTodayLocalISO();
        const cRes = await apiFetch(
          `/api/cycles?machineType=sterilizer&dateFrom=${encodeURIComponent(
            from
          )}&dateTo=${encodeURIComponent(to)}&limit=200`
        );
        if (!cRes.ok) throw new Error(`Cycles HTTP ${cRes.status}`);
        const cJson = await cRes.json();
        setCycles(cJson.cycles || []);
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

      // descale only for washers
      const washers = machines.filter((m) => m.type === "washer");
      const overdueDescales = washers.filter(
        (m) => daysSince(m.lastDescaleAt) > DESCALE_THRESHOLD_DAYS
      );

      // real counts from today's cycles
      const cyclesToday = cycles.length;
      const failedCyclesToday = cycles.filter(
        (c) => c.result !== "pass"
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
      <h1 style={{ marginBottom: 16 }}>Dashboard</h1>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 24,
        }}
      >
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
      </div>

      {loading && <div style={{ opacity: 0.7 }}>Loading data…</div>}
      {err && (
        <div style={{ color: "var(--color-danger)" }}>
          Failed to load: {err}
        </div>
      )}

      {!loading && !err && (
        <div
          style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}
        >
          {/* Recent Sterilizer Cycles */}
          <Card title="Recent Sterilizer Cycles">
            {cycles.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {cycles.slice(0, 10).map((c) => (
                  <li
                    key={c._id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      className={`${common.dot} ${
                        c.result === "pass"
                          ? common["dot--ok"]
                          : common["dot--down"]
                      }`}
                    />
                    <span style={{ opacity: 0.9 }}>
                      <strong>{c.loadNumber || "Load"}</strong>
                      &nbsp;—{" "}
                      {new Date(c.startedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      &nbsp;• {c.result}
                    </span>
                    {c.machineId && (
                      <Link
                        to={`/machines/${c.machineId}`}
                        style={{ ...link, marginLeft: "auto" }}
                      >
                        View
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ opacity: 0.7 }}>No cycles logged today.</div>
            )}
          </Card>

          {/* Overdue Descales — washers only */}
          <Card title="Overdue Descales">
            {overdueDescales.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
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
                      style={{
                        color,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span className={`${common.dot} ${dot}`}></span>
                      <Link to={`/machines/${m._id}`} style={link}>
                        {m.name}
                      </Link>
                      — {isFinite(days) ? `${days} days` : "no record"}
                      <Link
                        to={`/maintenance?machineId=${m._id}`}
                        style={{ ...chip }}
                        title="Log maintenance for this machine"
                      >
                        Log
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div style={{ opacity: 0.7 }}>
                All good. No overdue descales 🎉
              </div>
            )}
          </Card>

          {/* Recent Maintenance */}
          <Card title="Recent Maintenance">
            {loading ? (
              <div style={{ display: "grid", gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`rm-skel-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Skeleton w={12} h={12} style={{ borderRadius: 999 }} />
                    <div style={{ display: "grid", gap: 6 }}>
                      <Skeleton w="40%" h={14} />
                      <Skeleton w="60%" h={12} />
                    </div>
                    <Skeleton w={60} h={24} r={12} />
                  </div>
                ))}
              </div>
            ) : maint.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {maint.map((r) => (
                  <li
                    key={r._id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      className={`${common.dot} ${common["dot--ok"]}`}
                    ></span>
                    <span style={{ opacity: 0.85 }}>
                      <strong>
                        {(r.machineId && r.machineId.name) || "Unknown"}
                      </strong>
                      &nbsp;— {r.type}
                      &nbsp;• {formatDateTime(r.performedAt)}
                    </span>
                    <Link
                      to={`/machines/${r.machineId?._id || ""}`}
                      style={{ ...link, marginLeft: "auto" }}
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ opacity: 0.7 }}>No maintenance logged yet.</div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "2px 8px",
};

const chip = {
  marginLeft: "auto",
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--color-brand)",
  color: "#fff",
  background: "var(--color-brand)",
  textDecoration: "none",
  fontSize: 12,
};
