import { NavLink } from "react-router-dom";
import styles from "./AppShell.module.css";

export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.shell__side}>
        <div className={styles.brand}>SPT</div>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/recalls"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Recalls
          </NavLink>
          <NavLink
            to="/machines"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Machines
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            About
          </NavLink>
        </nav>
      </aside>
      <main className={styles.shell__main}>{children}</main>
    </div>
  );
}
