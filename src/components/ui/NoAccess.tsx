import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

interface NoAccessProps {
  title?: string;
  message?: string;
}

/**
 * Soft-block заглушка для страниц куда роль не должна заходить.
 * Это UI-уровень — основная защита данных в RLS на стороне БД.
 */
export default function NoAccess({
  title = "Раздел недоступен для вашей роли",
  message = "Эта страница доступна только владельцам и менеджерам. Если вам нужен доступ — попросите владельца компании поменять вашу роль в Настройках → Пользователи.",
}: NoAccessProps) {
  return (
    <div className="animate-fade-in">
      <div className="grid place-items-center py-16">
        <div className="max-w-md rounded-2xl border border-panel-border bg-panel p-8 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{message}</p>
          <Link to="/app" className="btn-brand mt-5 justify-center">
            На дашборд
          </Link>
        </div>
      </div>
    </div>
  );
}
