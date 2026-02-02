import { Navigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

/**
 * Route-level protection component that prevents unauthorized access
 * before the component mounts. This provides defense-in-depth alongside
 * backend RLS policies.
 * 
 * Usage:
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * Or with multiple allowed roles:
 * <ProtectedRoute allowedRoles={["admin", "analyst"]}>
 *   <ManagementPage />
 * </ProtectedRoute>
 */
export const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}: ProtectedRouteProps) => {
  const { role, loading } = useUserRole();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated at all
  if (!role) {
    return <Navigate to="/auth" replace />;
  }

  // Check specific role requirement
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if role is in allowed roles list
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
