import styles from "./Card.module.css";

export default function Card({ title, children, ariaLabel }) {
  return (
    <section className={styles.card} aria-label={ariaLabel || title}>
      {title ? <h2 className={styles.card__title}>{title}</h2> : null}
      <div className={styles.card__body}>{children}</div>
    </section>
  );
}
