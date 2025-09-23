import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onClose,
  title = "Dialog",
  children,
  width = 720,
}) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    const el = dialogRef.current;
    if (el) el.focus();

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab") {
        const focusables = el.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(
          (node) =>
            !node.hasAttribute("disabled") && !node.getAttribute("aria-hidden")
        );
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      onClick={handleBackdropClick}
      role="presentation"
      style={backdrop}
      aria-hidden={!open}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        style={{ ...panel, width: `min(${width}px, 92vw)` }}
      >
        <div style={header}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: 18 }}>
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>
            ×
          </button>
        </div>
        <div style={{ paddingTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

/* ---- styles ---- */
const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
};

const panel = {
  boxSizing: "border-box",
  padding: 20,
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-soft)",
  maxHeight: "92vh",
  overflow: "auto",
  outline: "none",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid var(--color-border)",
  paddingBottom: 8,
};

const closeBtn = {
  appearance: "none",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  padding: "4px 10px",
  borderRadius: 10,
  cursor: "pointer",
};
