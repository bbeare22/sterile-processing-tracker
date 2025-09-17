import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

let idSeq = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (msg, { tone = "ok", ms = 3000 } = {}) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, msg, tone }]);
      if (ms > 0) setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const value = useMemo(() => ({ show, remove }), [show, remove]);

  // portal root
  const [root, setRoot] = useState(null);
  useEffect(() => {
    let el = document.getElementById("toast-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-root";
      document.body.appendChild(el);
    }
    setRoot(el);
  }, []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {root &&
        createPortal(
          <div style={wrap}>
            {toasts.map((t) => (
              <div
                key={t.id}
                style={{
                  ...toast,
                  borderColor:
                    t.tone === "danger"
                      ? "var(--color-danger)"
                      : t.tone === "warn"
                      ? "var(--color-warn)"
                      : "var(--color-accent)",
                }}
                onClick={() => remove(t.id)}
                role="status"
              >
                {t.msg}
              </div>
            ))}
          </div>,
          root
        )}
    </ToastCtx.Provider>
  );
}

const wrap = {
  position: "fixed",
  right: 16,
  bottom: 16,
  display: "grid",
  gap: 10,
  zIndex: 9999,
};
const toast = {
  background: "var(--color-surface)",
  color: "var(--color-text)",
  border: "1px solid",
  borderRadius: 12,
  padding: "10px 12px",
  boxShadow: "var(--shadow-soft)",
  cursor: "pointer",
};
