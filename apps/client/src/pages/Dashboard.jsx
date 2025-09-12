import Card from "../components/Card/Card";
import KPI from "../components/KPI/KPI";

export default function Dashboard() {
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
        <KPI label="Cycles Today" value="12" tone="ok" />
        <KPI label="Failed Cycles" value="1" tone="warn" />
        <KPI label="Overdue Descales" value="2" tone="danger" />
        <KPI label="Active Machines" value="5" tone="ok" />
      </div>

      {/* Two-up cards */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Recent Cycles">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>AMSCO 5000 — Pass — 08:31</li>
            <li>AMSCO 5000 — Pass — 09:12</li>
            <li>
              Washer 2 — <strong>Fail</strong> — 10:05
            </li>
          </ul>
        </Card>

        <Card title="Overdue Descales">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Washer 2 — 8 days</li>
            <li>Sterilizer 1 — 10 days</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
