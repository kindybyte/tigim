import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Workflow,
  Boxes,
  AlertTriangle,
  Users,
  Wallet,
  Sparkles,
  FileBarChart,
  Settings,
  X,
} from "lucide-react";
import Logo from "../ui/Logo";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const nav = [
  { to: "/app", label: "Дашборд", icon: LayoutDashboard, end: true },
  { to: "/app/orders", label: "Заказы", icon: ClipboardList },
  { to: "/app/production", label: "Производство", icon: Workflow },
  { to: "/app/warehouse", label: "Склад", icon: Boxes },
  { to: "/app/defects", label: "Брак", icon: AlertTriangle },
  { to: "/app/employees", label: "Сотрудники", icon: Users },
  { to: "/app/finance", label: "Финансы", icon: Wallet },
  { to: "/app/ai", label: "ИИ-помощник", icon: Sparkles, badge: "AI" },
  { to: "/app/reports", label: "Отчёты", icon: FileBarChart },
  { to: "/app/settings", label: "Настройки", icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-panel-border bg-panel transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            to="/app"
            onClick={onClose}
            aria-label="К дашборду"
            className="transition-opacity hover:opacity-80"
          >
            <Logo />
          </Link>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md text-ink-600 hover:bg-panel-muted lg:hidden"
            onClick={onClose}
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
          <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            Основное
          </p>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-500/15 text-brand-300"
                    : "text-ink-700 hover:bg-panel-muted hover:text-ink-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-[18px] w-[18px] ${isActive ? "text-brand-300" : "text-ink-600 group-hover:text-ink-700"}`}
                    strokeWidth={2}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-md bg-gradient-to-r from-brand-600 to-teal-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-medium text-brand-100">
            <Sparkles className="h-3.5 w-3.5" /> Tigim Pro
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug">
            Подключите аналитику и ИИ-помощника
          </p>
          <p className="mt-1 text-xs text-brand-100/80">
            Полная картина цеха в одном окне
          </p>
          <button className="mt-3 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/15">
            Узнать больше
          </button>
        </div>
      </aside>
    </>
  );
}
