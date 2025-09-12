import styles from "./MachineCard.module.css";
import { Link } from "react-router-dom";

export default function MachineCard({ m }) {
  const badge =
    m.status === "active" ? styles["badge--ok"] : styles["badge--down"];
  return (
    <article className={styles.card} aria-label={`${m.name} ${m.model}`}>
      <div className={styles.card__top}>
        <h3 className={styles.card__title}>{m.name}</h3>
        <span className={`${styles.badge} ${badge}`}>{m.status}</span>
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
