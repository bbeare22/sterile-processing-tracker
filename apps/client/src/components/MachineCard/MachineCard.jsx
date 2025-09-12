import styles from "./MachineCard.module.css";
import { Link } from "react-router-dom";
import { daysSince } from "../../utils/date";

export default function MachineCard({ m }) {
  const badge =
    m.status === "active" ? styles["badge--ok"] : styles["badge--down"];

  // days since last descale (Infinity if null)
  const d = daysSince(m.lastDescaleAt);
  const chipTone = !isFinite(d)
    ? "" // no date
    : d > 14
    ? styles["chip--danger"] // >14 red
    : d > 7
    ? styles["chip--warn"] // 8–14 amber
    : ""; // ≤7 neutral

  return (
    <article className={styles.card} aria-label={`${m.name} ${m.model}`}>
      <div className={styles.card__top}>
        <h3 className={styles.card__title}>{m.name}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* days-since chip */}
          <span className={`${styles.chip} ${chipTone}`}>
            {isFinite(d) ? `${d}d since descale` : "—"}
          </span>
          {/* status badge */}
          <span className={`${styles.badge} ${badge}`}>{m.status}</span>
        </div>
      </div>

      <div className={styles.card__meta}>
        {m.type} • Model {m.model} • {m.location}
      </div>

      <div className={styles.card__footer}>
        <Link className={styles.link} to={`/machines/${m.id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
