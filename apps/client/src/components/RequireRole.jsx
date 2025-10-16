import { useAuth } from '../context/AuthContext';

/**
 * Client-side role gate for rendering controls (no styling, no nav changes).
 * Usage: <RequireRole role="supervisor">{children}</RequireRole>
 */
export default function RequireRole({ role = 'supervisor', children, fallback = null }) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (user.role !== role) return fallback;
  return children;
}
