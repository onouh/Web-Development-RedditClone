import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-12 max-w-lg p-10 text-center">
      <Compass size={34} className="mx-auto text-muted" />
      <h1 className="mt-3 text-2xl font-bold">This page wandered off</h1>
      <p className="mt-2 text-sm text-muted">
        The page you are looking for does not exist, or it was removed by a moderator.
      </p>
      <Link to="/" className="btn-primary mt-5 text-sm">
        Back to the feed
      </Link>
    </div>
  );
}
