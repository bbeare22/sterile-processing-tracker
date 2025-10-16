import styles from './KPI.module.css';

export default function KPI({ label, value, tone = 'ok' }) {
  const toneClass =
    tone === 'danger'
      ? styles['kpi--danger']
      : tone === 'warn'
        ? styles['kpi--warn']
        : styles['kpi--ok'];

  return (
    <div className={`${styles.kpi} ${toneClass}`} role="status" aria-label={`${label}: ${value}`}>
      <div className={styles.kpi__label}>{label}</div>
      <div className={styles.kpi__value}>{value}</div>
    </div>
  );
}
