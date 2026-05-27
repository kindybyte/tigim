import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../lib/auth";

/**
 * Shown on auth pages when Supabase is not configured (no VITE_SUPABASE_*
 * env vars). Makes the "mock mode" state visible so users / devs don't
 * silently fall into demo navigation.
 *
 * When `configured = true`, renders a small green confirmation chip so we
 * can visually verify env vars actually loaded on this build.
 */
export default function DemoModeBanner() {
  const { configured } = useAuth();

  if (configured) {
    return (
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" />
        Supabase подключён
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Демо-режим (Supabase не подключён)</p>
        <p className="mt-0.5 text-amber-200/80">
          Регистрация и вход работать не будут — данные не сохраняются. Проверь, что{" "}
          <code className="rounded bg-amber-500/20 px-1">VITE_SUPABASE_URL</code> и{" "}
          <code className="rounded bg-amber-500/20 px-1">VITE_SUPABASE_ANON_KEY</code> заданы
          в Vercel → Settings → Environment Variables → <b>Production</b>, и сделан
          <b> Redeploy без Build Cache</b>.
        </p>
      </div>
    </div>
  );
}
