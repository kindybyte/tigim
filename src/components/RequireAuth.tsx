import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function RequireAuth() {
  const { user, loading, configured, companyId, companyLoading } = useAuth();
  const location = useLocation();
  const onOnboarding = location.pathname === "/onboarding";

  // Mock mode (no Supabase env vars) — let everything through with mock data.
  if (!configured) return <Outlet />;

  if (loading || (user && companyLoading)) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink-600">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      </div>
    );
  }

  // Not authenticated → /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no company yet → /onboarding (unless already there)
  if (!companyId && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Has company but visiting /onboarding → /app (already onboarded)
  if (companyId && onOnboarding) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
