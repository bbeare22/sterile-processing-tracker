import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './toast.css';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

let idSeq = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (msg, { tone = 'ok', ms = 3000 } = {}) => {
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
    let el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      document.body.appendChild(el);
    }
    setRoot(el);
  }, []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {root &&
        createPortal(
          <div className="toast-stack">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={
                  'toast' +
                  (t.tone === 'danger'
                    ? ' toast--danger'
                    : t.tone === 'warn'
                      ? ' toast--warn'
                      : ' toast--ok')
                }
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
