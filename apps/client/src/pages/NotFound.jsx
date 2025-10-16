import { Link } from 'react-router-dom';
import './not-found.css';

export default function NotFound() {
  return (
    <div className="nf__outer">
      <div className="nf__card">
        <h1 className="nf__h1">404 — Page Not Found</h1>
        <p className="nf__p">Oops! The page you’re looking for doesn’t exist or has been moved.</p>
        <Link to="/" className="nf__btn">
          ⬅ Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
