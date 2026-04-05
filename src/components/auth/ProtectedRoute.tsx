/**
 * ProtectedRoute — works in both Convex and local mode.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useAuthStore } from '../../store/authStore';
import type { ReactNode } from 'react';

const CONVEX_MODE = !!import.meta.env.VITE_CONVEX_URL;

function ConvexProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function LocalProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export const ProtectedRoute = CONVEX_MODE ? ConvexProtectedRoute : LocalProtectedRoute;
