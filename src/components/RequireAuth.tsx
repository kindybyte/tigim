import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function RequireAuth() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();

  // If Supabase env vars aren't set (dev preview), allow access with mock data.
  if (!configured) return <Outlet />;

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink-600">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
