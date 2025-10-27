import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const publicRead = String(import.meta.env.VITE_PUBLIC_READ || '').toLowerCase() === 'true';
  const { user } = useAuth();

  if (publicRead) return children;
  if (!user) return null;
  return children;
}
