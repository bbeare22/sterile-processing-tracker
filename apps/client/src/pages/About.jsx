export default function About() {
  return (
    <div style={outer}>
      <div style={card}>
        <h1 style={h1}>About Sterile Processing Tracker</h1>
        <p style={p}>
          The <strong>Sterile Processing Tracker (SPT)</strong> is a modern web
          application designed to help Sterile Processing Departments manage and
          track machine maintenance, descale cycles, and recalls.
        </p>
        <p style={p}>
          Built with <strong>React</strong>, <strong>Node.js</strong>, and{" "}
          <strong>MongoDB</strong>, this project was created as part of the
          TripleTen Software Engineering program by <strong>Brett Beare</strong>
          .
        </p>
        <p style={p}>
          Key features include: machine tracking, logging maintenance, FDA
          recalls integration, and user authentication for employees.
        </p>
        <p style={p}>
          <em>Designed and developed with ❤️ in {new Date().getFullYear()}.</em>
        </p>
      </div>
    </div>
  );
}

const outer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  marginTop: "40px",
};

const card = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "16px",
  boxShadow: "var(--shadow-soft)",
  padding: "32px",
  maxWidth: "720px",
  width: "100%",
};

const h1 = {
  marginBottom: "16px",
  fontSize: "1.75rem",
};

const p = {
  marginBottom: "16px",
  lineHeight: 1.6,
  color: "var(--color-text-muted)",
};
