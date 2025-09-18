import styles from "./Card.module.css";

export default function Card({ title, right, children, style }) {
  return (
    <div style={{ ...card, ...style }}>
      {(title || right) && (
        <div style={head}>
          {title ? <div style={titleStyle}>{title}</div> : <div />}
          {right || null}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

const card = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "var(--shadow-soft)",
};

const head = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1.2,
};
