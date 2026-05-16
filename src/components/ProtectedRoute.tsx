import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AccessPending from "@/pages/AccessPending";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "fundador" | "vendedor";
  requireSlug?: "thiago" | "aline" | "milena" | "felipe";
}

export function ProtectedRoute({ children, requireRole, requireSlug }: ProtectedRouteProps) {
  const { user, loading, hasRole, rolesLoaded, profile, isFundador } = useAuth();

  if (loading || (user && requireRole && !rolesLoaded) || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Block non-approved users (fundador bypasses)
  if (profile && profile.status !== "approved" && !isFundador) {
    return <AccessPending rejected={profile.status === "rejected"} />;
  }

  if (requireRole && !hasRole(requireRole)) return <Navigate to="/" replace />;
  if (requireSlug && !isFundador && profile?.colaborador_slug !== requireSlug) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
