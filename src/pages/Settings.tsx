import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Boxes,
  Briefcase,
  Building2,
  Check,
  Crown,
  Eye,
  Loader2,
  Plug,
  Save,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import { company as mockCompany, employees } from "../data/mockData";
import { useAuth } from "../lib/auth";
import { getRoleCounts, updateCompany, type VisibleRole } from "../lib/company";

const TABS = [
  { key: "company", label: "Компания", icon: Building2 },
  { key: "users", label: "Пользователи", icon: Users },
  { key: "roles", label: "Роли", icon: Shield },
  { key: "notifications", label: "Уведомления", icon: Bell },
  { key: "integrations", label: "Интеграции", icon: Plug },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Русское склонение «человек / человека / людей» для счётчика 0..n.
function pluralPeople(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "человек";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "человека";
  return "человек";
}

// Системные роли в UI (master намеренно скрыт). Совпадает по `code`
// с public.company_role в БД, кроме master.
interface SystemRole {
  code: VisibleRole;
  name: string;
  desc: string;
  icon: LucideIcon;
  iconClass: string;
  can: string[];
  view: string[]; // только просмотр
}

const SYSTEM_ROLES: SystemRole[] = [
  {
    code: "owner",
    name: "Владелец",
    desc: "Полный доступ ко всему. Эту роль получает создатель компании.",
    icon: Crown,
    iconClass: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    can: [
      "Управлять настройками компании и курсом валют",
      "Приглашать пользователей и менять их роли",
      "Заказы / склад / сотрудники / финансы — всё CRUD",
      "Видеть и менять расходы по заказам",
    ],
    view: [],
  },
  {
    code: "manager",
    name: "Менеджер",
    desc: "Операционное управление цехом: заказы, клиенты, склад, отчёты.",
    icon: Briefcase,
    iconClass: "bg-brand-500/15 text-brand-300 ring-brand-500/30",
    can: [
      "Создавать, редактировать и удалять заказы",
      "Добавлять, изменять и увольнять сотрудников",
      "Материалы и движения склада",
      "Фиксировать и удалять брак",
      "Расходы по заказу: добавлять и удалять",
      "Записывать выработку",
    ],
    view: ["Финансы и отчёты"],
  },
  {
    code: "warehouse",
    name: "Склад",
    desc: "Материалы и движения. Не лезет в заказы и финансы.",
    icon: Boxes,
    iconClass: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
    can: [
      "Добавлять и редактировать материалы",
      "Приход / расход / списание материалов",
      "Списывать материалы на заказ (это создаёт расход в заказе)",
    ],
    view: ["Заказы", "Брак"],
  },
  {
    code: "qc",
    name: "ОТК",
    desc: "Контроль качества. Этап ОТК и брак.",
    icon: ShieldCheck,
    iconClass: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    can: [
      "Переводить заказы на/с этапа ОТК",
      "Менять прогресс этапов",
      "Фиксировать и редактировать брак",
      "Записывать выработку",
    ],
    view: ["Заказы", "Склад", "Сотрудники"],
  },
  {
    code: "staff",
    name: "Сотрудник",
    desc: "Только просмотр данных компании. Базовая роль по умолчанию.",
    icon: User,
    iconClass: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
    can: [],
    view: ["Заказы", "Склад", "Сотрудники", "Финансы (если разрешено)"],
  },
];

const INTEGRATIONS = [
  { name: "Telegram bot", desc: "Уведомления и быстрые отчёты", connected: false },
  { name: "WhatsApp", desc: "Сообщения клиентам", connected: false },
  { name: "Excel", desc: "Импорт и экспорт таблиц", connected: true },
  { name: "Google Sheets", desc: "Синхронизация с таблицами", connected: false },
  { name: "1C", desc: "Бухгалтерия и склад", connected: false },
  { name: "Marketplace", desc: "Загрузка карточек товаров", connected: false },
];

export default function Settings() {
  const [tab, setTab] = useState<TabKey>("company");
  const { configured, companyId, company, refreshCompany } = useAuth();
  const isReal = configured && !!companyId && !!company;

  // --- Роли: счётчики пользователей ---
  const [roleCounts, setRoleCounts] = useState<Partial<Record<VisibleRole | "master", number>>>({});
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoleCounts = useCallback(async () => {
    if (!isReal || !companyId) return;
    setRolesLoading(true);
    try {
      const counts = await getRoleCounts(companyId);
      setRoleCounts(counts);
    } catch (err) {
      console.warn("[settings] role counts failed:", err);
    } finally {
      setRolesLoading(false);
    }
  }, [isReal, companyId]);

  useEffect(() => {
    if (tab === "roles") void fetchRoleCounts();
  }, [tab, fetchRoleCounts]);

  // Локальное состояние формы (синхронизируется с context при загрузке)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [usdRate, setUsdRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setPhone(company.phone ?? "");
      setAddress(company.address ?? "");
      setUsdRate(String(company.usdRate));
    } else if (!isReal) {
      // Демо
      setName(mockCompany.name);
      setPhone(mockCompany.phone);
      setAddress(mockCompany.address);
      setUsdRate("88");
    }
  }, [company, isReal]);

  async function handleCompanySave(e: FormEvent) {
    e.preventDefault();
    if (!isReal || !companyId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCompany(companyId, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        usdRate: parseFloat(usdRate) || 88,
      });
      await refreshCompany();
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Настройки" description="Параметры компании, пользователи, роли и интеграции" />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1 self-start rounded-2xl border border-panel-border bg-panel p-2 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-brand-500/15 text-brand-300"
                  : "text-ink-700 hover:bg-panel-muted"
              }`}
            >
              <t.icon className={`h-4 w-4 ${tab === t.key ? "text-brand-300" : "text-ink-600"}`} />
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "company" && (
            <Card title="Компания" subtitle="Основные данные и курс валют">
              <form onSubmit={handleCompanySave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Название компании</label>
                    <input
                      className="input mt-1.5"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div>
                    <label className="label">Телефон</label>
                    <input
                      className="input mt-1.5"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Адрес</label>
                    <input
                      className="input mt-1.5"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={!isReal}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-panel-border bg-panel-muted/40 p-4">
                    <label className="label">Курс USD → KGS</label>
                    <p className="mt-0.5 text-xs text-ink-600">
                      Применяется ко всем материалам с ценой в долларах. Меняйте когда курс
                      существенно сдвинулся — для уже списанных партий цифра не пересчитывается.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-700">1 USD =</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value)}
                        className="input max-w-[140px] tabular-nums"
                        disabled={!isReal}
                      />
                      <span className="text-sm font-semibold text-ink-700">сом</span>
                    </div>
                  </div>
                </div>

                {saveError && (
                  <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                    {saveError}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                  {savedAt && !saveError && (
                    <span className="text-xs text-emerald-300">
                      Сохранено в {savedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={!isReal || saving}
                    title={isReal ? undefined : "В демо-режиме сохранение недоступно"}
                    className="btn-brand"
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</>
                    ) : (
                      <><Save className="h-4 w-4" /> Сохранить</>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {tab === "users" && (
            <Card title="Пользователи" subtitle={`${employees.length} активных пользователей`}>
              <ul className="divide-y divide-panel-border">
                {employees.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={e.name} color={e.avatarColor} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-900">{e.name}</p>
                      <p className="text-xs text-ink-600">{e.role}</p>
                    </div>
                    <Badge tone={e.status === "active" ? "success" : "neutral"} dot>
                      {e.status === "active" ? "Активен" : e.status === "vacation" ? "Отпуск" : "Болен"}
                    </Badge>
                    <button className="btn-ghost text-sm">Изменить</button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-end">
                <button className="btn-brand">Пригласить пользователя</button>
              </div>
            </Card>
          )}

          {tab === "roles" && (
            <Card
              title="Роли"
              subtitle="Что может делать каждый тип сотрудника. Назначение ролей — во вкладке «Пользователи»."
            >
              {!isReal && (
                <p className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  Демо-режим: счётчики пользователей показываются как «—».
                </p>
              )}

              <ul className="grid gap-3 sm:grid-cols-2">
                {SYSTEM_ROLES.map((role) => {
                  const Icon = role.icon;
                  const count = roleCounts[role.code];
                  return (
                    <li
                      key={role.code}
                      className="rounded-xl border border-panel-border bg-panel-muted/40 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${role.iconClass}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-ink-900">{role.name}</p>
                            <span className="shrink-0 rounded-full bg-panel px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-700">
                              {!isReal
                                ? "—"
                                : rolesLoading
                                  ? "…"
                                  : `${count ?? 0} ${pluralPeople(count ?? 0)}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-ink-600">{role.desc}</p>
                        </div>
                      </div>

                      {(role.can.length > 0 || role.view.length > 0) && (
                        <div className="mt-3 space-y-1.5 border-t border-panel-border pt-3 text-xs">
                          {role.can.map((c) => (
                            <p key={c} className="flex items-start gap-2 text-ink-800">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                              <span>{c}</span>
                            </p>
                          ))}
                          {role.view.map((v) => (
                            <p key={v} className="flex items-start gap-2 text-ink-600">
                              <Eye className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{v} — только просмотр</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Если в БД кто-то унаследован с ролью master — покажем тонкую плашку */}
              {isReal && (roleCounts.master ?? 0) > 0 && (
                <p className="mt-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  В БД есть {roleCounts.master} пользовател{(roleCounts.master ?? 0) === 1 ? "ь" : "и"} с устаревшей ролью «Мастер цеха».
                  Откройте вкладку «Пользователи» чтобы переназначить их на «Менеджер» или «ОТК».
                </p>
              )}
            </Card>
          )}

          {tab === "notifications" && (
            <Card title="Уведомления" subtitle="Когда система должна вас оповещать">
              <ul className="divide-y divide-panel-border">
                {[
                  { l: "Заказ может опоздать", on: true },
                  { l: "Низкий остаток материала", on: true },
                  { l: "Зафиксирован брак", on: true },
                  { l: "Сотрудник не вышел на смену", on: false },
                  { l: "Завершён этап производства", on: true },
                  { l: "Получена оплата", on: false },
                ].map((n) => (
                  <li key={n.l} className="flex items-center justify-between py-3">
                    <p className="text-sm text-ink-800">{n.l}</p>
                    <span
                      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition ${
                        n.on ? "bg-brand-600" : "bg-panel-border"
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-panel shadow transition ${n.on ? "translate-x-5" : "translate-x-0.5"}`} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "integrations" && (
            <Card title="Интеграции" subtitle="Подключите внешние сервисы">
              <ul className="grid gap-3 sm:grid-cols-2">
                {INTEGRATIONS.map((it) => (
                  <li key={it.name} className="flex items-center justify-between rounded-xl border border-panel-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-panel-muted text-ink-700">
                        <Plug className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">{it.name}</p>
                        <p className="text-xs text-ink-600">{it.desc}</p>
                      </div>
                    </div>
                    <button className={`btn ${it.connected ? "btn-secondary" : "btn-brand"} px-3 py-1.5 text-xs`}>
                      {it.connected ? "Отключить" : "Подключить"}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
