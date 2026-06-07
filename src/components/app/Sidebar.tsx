import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Workflow,
  Boxes,
  AlertTriangle,
  Users,
  Wallet,
  FileBarChart,
  Settings,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Logo from "../ui/Logo";
import { useAuth } from "../../lib/auth";
import { canSeeFinance } from "../../lib/company";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
  /** Если задан — пункт показывается только когда predicate(role) === true. */
  visibleFor?: (role: ReturnType<typeof useAuth>["currentRole"]) => boolean;
}

const ALL_NAV: NavItem[] = [
  { to: "/app", label: "Дашборд", icon: LayoutDashboard, end: true },
  { to: "/app/orders", label: "Заказы", icon: ClipboardList },
  { to: "/app/production", label: "Производство", icon: Workflow },
  { to: "/app/warehouse", label: "Склад", icon: Boxes },
  { to: "/app/defects", label: "Брак", icon: AlertTriangle },
  { to: "/app/employees", label: "Сотрудники", icon: Users },
  { to: "/app/finance", label: "Финансы", icon: Wallet, visibleFor: canSeeFinance },
  { to: "/app/reports", label: "Отчёты", icon: FileBarChart, visibleFor: canSeeFinance },
  { to: "/app/settings", label: "Настройки", icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { currentRole, configured } = useAuth();
  // В демо-режиме (без Supabase) пунктов меню не урезаем — пусть владелец
  // увидит всё на пустой компании.
  const nav = ALL_NAV.filter((item) => !item.visibleFor || !configured || item.visibleFor(currentRole));
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

      </aside>
    </>
  );
}
