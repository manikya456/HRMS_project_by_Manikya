import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
