import { useState } from "react";
import {
  Bell,
  Building2,
  Plug,
  Save,
  Shield,
  Users,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import { company, employees } from "../data/mockData";

const TABS = [
  { key: "company", label: "Компания", icon: Building2 },
  { key: "users", label: "Пользователи", icon: Users },
  { key: "roles", label: "Роли", icon: Shield },
  { key: "notifications", label: "Уведомления", icon: Bell },
  { key: "integrations", label: "Интеграции", icon: Plug },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ROLES = [
  { name: "Владелец", desc: "Полный доступ ко всему" },
  { name: "Менеджер", desc: "Заказы, клиенты, отчёты" },
  { name: "Мастер цеха", desc: "Производство, сотрудники, брак" },
  { name: "Склад", desc: "Материалы и движения" },
  { name: "ОТК", desc: "Этап ОТК, фиксация брака" },
  { name: "Сотрудник", desc: "Только свои задачи" },
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
            <Card title="Компания" subtitle="Основные данные вашего цеха">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Название компании</label>
                  <input className="input mt-1.5" defaultValue={company.name} />
                </div>
                <div>
                  <label className="label">Телефон</label>
                  <input className="input mt-1.5" defaultValue={company.phone} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Адрес</label>
                  <input className="input mt-1.5" defaultValue={company.address} />
                </div>
                <div>
                  <label className="label">Валюта</label>
                  <select className="input mt-1.5">
                    <option>сом (KGS)</option>
                    <option>тенге (KZT)</option>
                    <option>рубль (RUB)</option>
                    <option>доллар (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Часовой пояс</label>
                  <select className="input mt-1.5">
                    <option>Бишкек (UTC+6)</option>
                    <option>Алматы (UTC+5)</option>
                    <option>Москва (UTC+3)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-brand"><Save className="h-4 w-4" /> Сохранить</button>
              </div>
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
            <Card title="Роли" subtitle="Управление правами доступа">
              <ul className="grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <li key={r.name} className="rounded-xl border border-panel-border bg-panel-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink-900">{r.name}</p>
                      <button className="text-xs font-semibold text-brand-300 hover:text-brand-200">Настроить</button>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{r.desc}</p>
                  </li>
                ))}
              </ul>
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
