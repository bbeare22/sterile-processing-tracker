import styles from "./MachineCard.module.css";
import common from "../common.module.css";
import { Link } from "react-router-dom";
import { daysSince } from "../../utils/date";

export default function MachineCard({ m, onEdit, onDelete }) {
  const isActive = m.status === "active";
  const badge = isActive ? styles["badge--ok"] : styles["badge--down"];
  const dot = isActive ? common["dot--ok"] : common["dot--down"];

  // Descale chip: only meaningful for washers
  const isWasher = m.type === "washer";
  const d = isWasher ? daysSince(m.lastDescaleAt) : NaN;
  const chipTone =
    isWasher && isFinite(d)
      ? d > 14
        ? styles["chip--danger"]
        : d > 7
        ? styles["chip--warn"]
        : ""
      : "";

  return (
    <article className={styles.card} aria-label={`${m.name} ${m.model}`}>
      <div className={styles.card__top}>
        <h3 className={styles.card__title}>{m.name}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isWasher && (
            <span className={`${styles.chip} ${chipTone}`}>
              {isFinite(d) ? `${d}d since descale` : "—"}
            </span>
          )}
          <span className={`${styles.badge} ${badge}`}>
            <span className={`${common.dot} ${dot}`} />
            {m.status}
          </span>
        </div>
      </div>

      <div className={styles.card__meta}>
        {m.type} • Model {m.model} • {m.location}
      </div>

      <div className={styles.card__footer} style={{ display: "flex", gap: 8 }}>
        <Link className={styles.link} to={`/machines/${m._id}`}>
          View
        </Link>

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(m)}
            className={`${styles.link} ${styles.buttonReset}`}
          >
            Edit
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(m)}
            className={`${styles.link} ${styles.buttonReset} ${styles.linkDanger}`}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
