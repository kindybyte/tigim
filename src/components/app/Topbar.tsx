import { useState } from "react";
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Search } from "lucide-react";
import Avatar from "../ui/Avatar";
import { company } from "../../data/mockData";
import { useNavigate } from "react-router-dom";

interface TopbarProps {
  onOpenSidebar: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-panel-border bg-surface/85 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-700 hover:bg-panel-muted lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex max-w-xl flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-600" />
        <input
          type="search"
          placeholder="Поиск заказов, клиентов, материалов…"
          className="input pl-9"
        />
        <span className="absolute right-3 hidden text-[11px] font-medium text-ink-600 md:block">
          <span className="kbd">Ctrl</span> <span className="kbd">K</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="hidden h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted sm:grid"
          aria-label="Помощь"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted"
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 origin-top-right animate-fade-in rounded-2xl border border-panel-border bg-panel p-2 shadow-soft">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-semibold text-ink-900">Уведомления</p>
                <button className="text-xs font-medium text-brand-300">
                  Прочитать всё
                </button>
              </div>
              <ul className="space-y-1">
                {[
                  {
                    title: "Заказ #1045 может опоздать",
                    desc: "Дедлайн 28 мая, выполнено 62%",
                    tone: "bg-rose-500",
                  },
                  {
                    title: "Низкий остаток ткани «Рибана»",
                    desc: "Осталось 40 кг, ниже минимума",
                    tone: "bg-amber-500",
                  },
                  {
                    title: "Заказ #1049 готов к отгрузке",
                    desc: "Партия 400 шт упакована",
                    tone: "bg-emerald-500",
                  },
                ].map((n) => (
                  <li
                    key={n.title}
                    className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-panel-muted"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.tone}`} />
                    <div>
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      <p className="text-xs text-ink-600">{n.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition hover:bg-panel-muted"
          >
            <Avatar name={company.owner} color="#2563EB" size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-ink-900">
                {company.owner}
              </p>
              <p className="text-[11px] leading-tight text-ink-600">Владелец</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-600 sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 w-60 origin-top-right animate-fade-in rounded-2xl border border-panel-border bg-panel p-2 shadow-soft">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-ink-900">{company.owner}</p>
                <p className="text-xs text-ink-600">{company.name}</p>
              </div>
              <div className="divider my-1" />
              <button
                onClick={() => navigate("/app/settings")}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-800 hover:bg-panel-muted"
              >
                Настройки
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/15"
              >
                <LogOut className="h-4 w-4" /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
