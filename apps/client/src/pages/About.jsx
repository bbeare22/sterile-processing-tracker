import './about.css';

export default function About() {
  return (
    <div className="about">
      <div className="about__card">
        <h1 className="about__title">About Sterile Processing Tracker</h1>

        <p className="about__text">
          The <strong>Sterile Processing Tracker (SPT)</strong> is a modern web application designed
          to help Sterile Processing Departments manage and track machine maintenance, descale
          cycles, and recalls.
        </p>

        <p className="about__text">
          Built with <strong>React</strong>, <strong>Node.js</strong>, and <strong>MongoDB</strong>,
          this project was created as part of the TripleTen Software Engineering program by{' '}
          <strong>Brett Beare</strong>.
        </p>

        <p className="about__text">
          Key features include: machine tracking, logging maintenance, FDA recalls integration, and
          user authentication for employees.
        </p>

        <p className="about__text">
          <em>Designed and developed with ❤️ in {new Date().getFullYear()}.</em>
        </p>
      </div>
    </div>
  );
}
