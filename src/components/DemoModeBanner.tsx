import { AlertTriangle } from "lucide-react";
import { useAuth } from "../lib/auth";

/**
 * Shows a yellow warning ONLY when Supabase isn't configured (mock mode).
 * In production / when configured = true, this renders nothing — clean UX.
 */
export default function DemoModeBanner() {
  const { configured } = useAuth();

  if (configured) return null;

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
