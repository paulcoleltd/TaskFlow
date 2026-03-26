/**
 * RoleGuard — conditionally renders children based on permission.
 *
 * Usage:
 *   <RoleGuard allowed={canCreateTask(role)}>
 *     <Button>New Task</Button>
 *   </RoleGuard>
 *
 * When allowed=false and fallback is provided, renders the fallback instead.
 * When allowed=false with no fallback, renders nothing.
 */

import type { ReactNode } from 'react';

interface Props {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowed, children, fallback = null }: Props) {
  return allowed ? <>{children}</> : <>{fallback}</>;
}
