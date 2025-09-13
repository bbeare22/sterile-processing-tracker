import styles from "./MachineCard.module.css";
import common from "../common.module.css";
import { Link } from "react-router-dom";
import { daysSince } from "../../utils/date";

export default function MachineCard({ m }) {
  const isActive = m.status === "active";
  const badge = isActive ? styles["badge--ok"] : styles["badge--down"];
  const dot = isActive ? common["dot--ok"] : common["dot--down"];

  // days since last descale
  const d = daysSince(m.lastDescaleAt);
  const chipTone = !isFinite(d)
    ? ""
    : d > 14
    ? styles["chip--danger"]
    : d > 7
    ? styles["chip--warn"]
    : "";

  return (
    <article className={styles.card} aria-label={`${m.name} ${m.model}`}>
      <div className={styles.card__top}>
        <h3 className={styles.card__title}>{m.name}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* days-since chip */}
          <span className={`${styles.chip} ${chipTone}`}>
            {isFinite(d) ? `${d}d since descale` : "—"}
          </span>
          {/* status dot + badge */}
          <span className={`${styles.badge} ${badge}`}>
            <span className={`${common.dot} ${dot}`}></span>
            {m.status}
          </span>
        </div>
      </div>

      <div className={styles.card__meta}>
        {m.type} • Model {m.model} • {m.location}
      </div>

      <div className={styles.card__footer}>
        <Link className={styles.link} to={`/machines/${m._id}`}>
          View details
        </Link>
      </div>
    </article>
  );
}
