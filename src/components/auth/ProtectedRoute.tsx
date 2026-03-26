/**
 * ProtectedRoute — blocks unauthenticated access to every app route.
 *
 * If no valid session is in the auth store, the user is immediately redirected
 * to /login. The attempted URL is stored so we can redirect back after login.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Pass the attempted URL so LoginPage can redirect back after success
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
