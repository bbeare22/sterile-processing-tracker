import Card from "../components/Card/Card";
import KPI from "../components/KPI/KPI";
import common from "../components/common.module.css";
import { machines } from "../data/machines";
import { daysSince } from "../utils/date";
import { Link } from "react-router-dom";
import { useMemo } from "react";

const DESCALe_THRESHOLD_DAYS = 7;

export default function Dashboard() {
  // Derive KPIs
  const {
    activeMachines,
    overdueDescales,
    recentCycles,
    failedCyclesToday,
    cyclesToday,
  } = useMemo(() => {
    const activeMachines = machines.filter((m) => m.status === "active").length;

    const overdueDescales = machines.filter((m) => {
      const d = daysSince(m.lastDescaleAt);
      return d > DESCALe_THRESHOLD_DAYS;
    });

    // Placeholder “cycles”
    const cyclesToday = 12;
    const failedCyclesToday = 1;

    // Small sample list to show structure
    const recentCycles = [
      { id: "c-001", machine: "AMSCO 5000", result: "Pass", time: "08:31" },
      { id: "c-002", machine: "AMSCO 5000", result: "Pass", time: "09:12" },
      { id: "c-003", machine: "Washer 2", result: "Fail", time: "10:05" },
    ];

    return {
      activeMachines,
      overdueDescales,
      recentCycles,
      failedCyclesToday,
      cyclesToday,
    };
  }, []);

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Dashboard</h1>

      {/* KPI row */}
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

      {/* Two-up cards */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* Recent Cycles */}
        <Card title="Recent Cycles">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recentCycles.map((c) => (
              <li key={c.id}>
                {c.machine} — <strong>{c.result}</strong> — {c.time}
              </li>
            ))}
          </ul>
        </Card>

        {/* Overdue Descales */}
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
                    key={m.id}
                    style={{
                      color,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span className={`${common.dot} ${dot}`}></span>
                    <Link to={`/machines/${m.id}`} style={link}>
                      {m.name}
                    </Link>
                    — {days} days
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ opacity: 0.7 }}>All good. No overdue descales 🎉</div>
          )}
        </Card>
      </div>
    </>
  );
}

const link = {
  color: "#cbd5e1",
  textDecoration: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "2px 8px",
  marginLeft: 6,
};
