import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./AppShell.module.css";
import Footer from "../Footer/Footer";

export default function AppShell({ children }) {
  const { user, isAuthed, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.shell__side}>
        <div className={styles.brand}>SPT</div>

        <nav className={styles.nav}>
          {/* Always visible */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            Dashboard
          </NavLink>

          {/* Only show these when authenticated */}
          {isAuthed && (
            <>
              <NavLink
                to="/recalls"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Recalls
              </NavLink>
              <NavLink
                to="/machines"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Machines
              </NavLink>
              <NavLink
                to="/maintenance"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Maintenance
              </NavLink>
              <NavLink
                to="/cycles"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Log Cycle
              </NavLink>
              <NavLink
                to="/spores"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                Spore Queue
              </NavLink>
              <NavLink
                to="/pm"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                PM Tasks
              </NavLink>

              <NavLink
                to="/about"
                className={({ isActive }) =>
                  isActive ? styles.active : undefined
                }
              >
                About
              </NavLink>
            </>
          )}
        </nav>

        {/* Auth controls at bottom */}
        <div className={styles.authBox}>
          {isAuthed ? (
            <>
              <div className={styles.userHi}>
                Hi, {user?.name || user?.email}
              </div>
              <div className={styles.userMeta}>
                {user?.employeeId && <div>ID: {user.employeeId}</div>}
                {user?.sterilizationNumber && (
                  <div>Ster#: {user.sterilizationNumber}</div>
                )}
              </div>
              <button onClick={logout} className={styles.authBtn}>
                Logout
              </button>
            </>
          ) : (
            <div className={styles.authLinks}>
              <NavLink to="/login" className={styles.authBtn}>
                Login
              </NavLink>
              <NavLink to="/register" className={styles.authBtn}>
                Register
              </NavLink>
            </div>
          )}
        </div>

        <Footer />
      </aside>

      <main className={styles.shell__main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
