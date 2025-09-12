import { useMemo, useState } from "react";
import { machines } from "../data/machines";
import MachineCard from "../components/MachineCard/MachineCard";

export default function Machines() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      const matchesQ = [m.name, m.model, m.location, m.id].some((v) =>
        String(v).toLowerCase().includes(q.toLowerCase())
      );
      const matchesType = type === "all" ? true : m.type === type;
      return matchesQ && matchesType;
    });
  }, [q, type]);

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Machines</h1>

      {/* Filters */}
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

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {filtered.map((m) => (
          <MachineCard key={m.id} m={m} />
        ))}
        {!filtered.length && (
          <div style={{ opacity: 0.7 }}>No machines match your filter.</div>
        )}
      </div>
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
