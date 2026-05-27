import { AlertTriangle } from "lucide-react";
import { useAuth } from "../lib/auth";

/**
 * Shown on auth pages when Supabase is not configured (no VITE_SUPABASE_*
 * env vars). Makes the "mock mode" state visible so users / devs don't
 * silently fall into demo navigation.
 */
export default function DemoModeBanner() {
  const { configured } = useAuth();
  if (configured) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Демо-режим</p>
        <p className="mt-0.5 text-amber-200/80">
          Supabase не подключён. Кнопки работают как в демо-моке, реальная регистрация и
          вход не сохраняются. Проверьте, что <code className="rounded bg-amber-500/20 px-1">VITE_SUPABASE_URL</code> и{" "}
          <code className="rounded bg-amber-500/20 px-1">VITE_SUPABASE_ANON_KEY</code> заданы
          в Vercel Environment Variables и сделан Redeploy.
        </p>
      </div>
    </div>
  );
}
