import styles from './Skeleton.module.css';
export default function Skeleton({ w = '100%', h = 12, style }) {
  return <span className={styles.skel} style={{ width: w, height: h, ...style }} />;
}
