/**
 * ProtectedRoute — blocks unauthenticated access to every app route.
 *
 * Uses Convex auth state. While loading (undefined), renders nothing to
 * avoid a flash of the login page on page refresh.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  // While Convex is checking the session, show nothing (avoids redirect flash)
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
