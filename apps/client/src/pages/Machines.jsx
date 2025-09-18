import { useEffect, useMemo, useState } from "react";
import MachineCard from "../components/MachineCard/MachineCard";
import Skeleton from "../components/Skeleton/Skeleton";

export default function Machines() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    setLoading(true);
    setErr("");
    fetch(`${base}/api/machines`)
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

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Machines</h1>

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

      {err && (
        <div style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          Failed to load: {err}
        </div>
      )}

      {/* Grid area — shows skeleton cards while loading */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {loading
          ? // Skeleton cards (6 placeholders)
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skel-${i}`}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: "var(--shadow-soft)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <Skeleton w="70%" h={18} /> {/* title */}
                <Skeleton w="50%" h={14} /> {/* subtitle / model */}
                <Skeleton w="60%" h={14} /> {/* location */}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <Skeleton w="30%" h={28} r={8} /> {/* chip/button */}
                  <Skeleton w="30%" h={28} r={8} /> {/* chip/button */}
                </div>
              </div>
            ))
          : // Real data
            filtered.map((m) => <MachineCard key={m._id} m={m} />)}

        {!loading && !err && !filtered.length && (
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
