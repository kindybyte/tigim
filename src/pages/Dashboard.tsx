import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Briefcase,
  CheckCircle2,
  Clock,
  PackageCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Workflow,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import { OrderStatusBadge } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";

import {
  activity,
  daysUntil,
  defectsByWeek,
  employees,
  formatDateShort,
  formatNumber,
  formatSom,
  materials,
  orders,
  revenueByMonth,
} from "../data/mockData";
import { useAuth } from "../lib/auth";

function greetingForHour(h: number): string {
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function todayRu(): string {
  return new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";
  const greeting = greetingForHour(new Date().getHours());
  const greetingText = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;

  const activeOrders = orders.filter((o) => !["Готово", "Отгружено"].includes(o.status));
  const inWork = orders.filter((o) => ["Раскрой", "Пошив", "ОТК", "Упаковка"].includes(o.status));
  const overdue = orders.filter((o) => daysUntil(o.deadline) < 0 && !["Готово", "Отгружено"].includes(o.status));
  const ready = orders.filter((o) => o.status === "Готово" || o.status === "Отгружено");
  const monthDefects = 89;
  const monthProfit = orders.reduce((s, o) => s + o.profit, 0);

  const atRisk = orders
    .filter((o) => o.status !== "Готово" && o.status !== "Отгружено")
    .map((o) => ({ ...o, dleft: daysUntil(o.deadline) }))
    .sort((a, b) => a.dleft - b.dleft)
    .slice(0, 4);

  const stageCounts = [
    { name: "Новый", count: orders.filter((o) => o.status === "Новый").length, tone: "bg-ink-600" },
    { name: "Раскрой", count: orders.filter((o) => o.status === "Раскрой").length, tone: "bg-sky-500" },
    { name: "Пошив", count: orders.filter((o) => o.status === "Пошив").length, tone: "bg-brand-600" },
    { name: "ОТК", count: orders.filter((o) => o.status === "ОТК").length, tone: "bg-violet-500" },
    { name: "Упаковка", count: orders.filter((o) => o.status === "Упаковка").length, tone: "bg-amber-500" },
    { name: "Готово", count: orders.filter((o) => o.status === "Готово").length, tone: "bg-emerald-500" },
  ];
  const stageMax = Math.max(...stageCounts.map((s) => s.count), 1);

  const topEmployees = [...employees]
    .filter((e) => e.norm > 0)
    .sort((a, b) => b.monthDone / b.norm - a.monthDone / a.norm)
    .slice(0, 5);

  const lowStock = materials
    .filter((m) => m.type === "ткань")
    .sort((a, b) => a.stock / a.minStock - b.stock / b.minStock)
    .slice(0, 5);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={greetingText}
        description={`Сегодня ${todayRu()} · в работе ${inWork.length} заказов, ${overdue.length} требуют внимания`}
        actions={
          <>
            <Link to="/app/ai" className="btn-secondary">
              <Sparkles className="h-4 w-4 text-brand-300" /> Спросить помощника
            </Link>
            <Link to="/app/orders" className="btn-brand">
              <Briefcase className="h-4 w-4" /> Добавить заказ
            </Link>
          </>
        }
      />

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Активные заказы" value={String(activeOrders.length)} icon={Briefcase} iconTone="brand" trend={{ value: "+2", positive: true }} />
        <StatCard label="В работе" value={String(inWork.length)} icon={Workflow} iconTone="purple" hint="раскрой, пошив, ОТК" />
        <StatCard label="Просрочено" value={String(overdue.length)} icon={AlertTriangle} iconTone="danger" hint={overdue.length ? "требуют действий" : "всё под контролем"} />
        <StatCard label="Готовые партии" value={String(ready.length)} icon={PackageCheck} iconTone="success" trend={{ value: "+1", positive: true }} />
        <StatCard label="Брак за месяц" value={`${monthDefects} шт`} icon={AlertTriangle} iconTone="warning" trend={{ value: "−12%", positive: true }} />
        <StatCard label="Прибыль за месяц" value={formatSom(monthProfit)} icon={Wallet} iconTone="brand" trend={{ value: "+18%", positive: true }} />
      </div>

      {/* MAIN GRID */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* At-risk orders */}
        <Card
          className="lg:col-span-2"
          title="Заказы, которые могут опоздать"
          subtitle="Сортировка по сроку до дедлайна"
          action={
            <Link to="/app/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
              Все заказы <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ul className="divide-y divide-panel-border">
            {atRisk.map((o) => {
              const dleft = o.dleft;
              const danger = dleft < 0;
              const warn = dleft >= 0 && dleft <= 3;
              return (
                <li
                  key={o.id}
                  className="grid grid-cols-1 items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(140px,180px)_110px_120px_28px]"
                >
                  {/* Order */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                      danger ? "bg-rose-500/15 text-rose-300"
                        : warn ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}>
                      #{o.id}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{o.product}</p>
                      <p className="truncate text-xs text-ink-600">{o.client} · {formatNumber(o.qty)} шт</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2.5">
                    <ProgressBar
                      value={o.progress}
                      tone={danger ? "danger" : warn ? "warning" : "brand"}
                      size="md"
                    />
                    <span className="w-9 shrink-0 text-right text-xs font-semibold text-ink-800 tabular-nums">
                      {o.progress}%
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex sm:justify-start">
                    <OrderStatusBadge status={o.status} />
                  </div>

                  {/* Deadline */}
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] uppercase tracking-wide text-ink-600">Дедлайн</p>
                    <p className={`text-xs font-bold leading-tight ${danger ? "text-rose-300" : warn ? "text-amber-300" : "text-ink-800"}`}>
                      {formatDateShort(o.deadline)}
                    </p>
                    <p className={`text-[11px] leading-tight ${danger ? "text-rose-400" : warn ? "text-amber-400" : "text-ink-600"}`}>
                      {dleft < 0 ? `просрочка ${-dleft} дн.` : `${dleft} дн.`}
                    </p>
                  </div>

                  {/* Arrow */}
                  <Link
                    to={`/app/orders/${o.id}`}
                    className="grid h-8 w-8 shrink-0 place-items-center justify-self-end rounded-lg text-ink-600 hover:bg-panel-muted hover:text-ink-700"
                    aria-label="Открыть"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Production by stages */}
        <Card title="Производство по этапам" subtitle="Распределение активных заказов">
          <ul className="space-y-3">
            {stageCounts.map((s) => (
              <li key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink-800">
                    <span className={`h-2 w-2 rounded-full ${s.tone}`} />
                    {s.name}
                  </span>
                  <span className="tabular-nums text-ink-600">{s.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-panel-muted">
                  <div
                    className={`h-1.5 rounded-full ${s.tone}`}
                    style={{ width: `${(s.count / stageMax) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl bg-panel-muted p-3 text-xs text-ink-700">
            Подсказка: в этапе «Пошив» сейчас {orders.filter((o) => o.status === "Пошив").length} заказа — нагрузка на бригаду высокая.
          </div>
        </Card>
      </div>

      {/* CHARTS */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Выручка по месяцам"
          subtitle="Тысяч сом · 6 месяцев"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <TrendingUp className="h-3 w-3" /> +18% к апрелю
            </span>
          }
        >
          <LineChart
            data={revenueByMonth}
            color="#2563EB"
            fill="rgba(16, 185, 129, 0.16)"
            formatValue={(v) => `${v} тыс. сом`}
          />
        </Card>

        <Card title="Брак по неделям" subtitle="Тенденция к снижению">
          <BarChart data={defectsByWeek} color="#EF4444" formatValue={(v) => `${v} шт`} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-panel-muted px-2 py-2">
              <p className="text-[11px] text-ink-600">Сред. в нед.</p>
              <p className="text-sm font-bold text-ink-900">22 шт</p>
            </div>
            <div className="rounded-lg bg-panel-muted px-2 py-2">
              <p className="text-[11px] text-ink-600">Лучшая</p>
              <p className="text-sm font-bold text-emerald-300">14</p>
            </div>
            <div className="rounded-lg bg-panel-muted px-2 py-2">
              <p className="text-[11px] text-ink-600">Худшая</p>
              <p className="text-sm font-bold text-rose-300">31</p>
            </div>
          </div>
        </Card>
      </div>

      {/* BOTTOM ROW */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Top employees */}
        <Card title="Топ сотрудников" subtitle="Выполнение нормы за май">
          <ul className="space-y-3">
            {topEmployees.map((e) => {
              const pct = Math.round((e.monthDone / e.norm) * 100);
              const tone = pct >= 110 ? "success" : pct >= 90 ? "brand" : "warning";
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <Avatar name={e.name} color={e.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-ink-900">{e.name}</p>
                      <span className="text-xs font-semibold tabular-nums text-ink-800">{pct}%</span>
                    </div>
                    <p className="truncate text-xs text-ink-600">{e.role} · {e.stage}</p>
                    <ProgressBar value={Math.min(pct, 120)} tone={tone} className="mt-1.5" />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Activity feed */}
        <Card title="Последние события" subtitle="Сегодня">
          <ul className="-mt-1 space-y-3">
            {activity.map((ev) => {
              const dot = {
                order: "bg-brand-500",
                defect: "bg-rose-500",
                stock: "bg-amber-500",
                employee: "bg-violet-500",
                finance: "bg-emerald-500",
              }[ev.type];
              return (
                <li key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${dot}`} />
                    <span className="mt-1 w-px flex-1 bg-panel-muted" />
                  </div>
                  <div className="pb-1">
                    <p className="text-sm leading-snug text-ink-800">{ev.text}</p>
                    <p className="mt-0.5 text-xs text-ink-600">{ev.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Warehouse stock */}
        <Card
          title="Остатки ткани"
          subtitle="5 ключевых позиций"
          action={
            <Link to="/app/warehouse" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
              На склад <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ul className="space-y-3">
            {lowStock.map((m) => {
              const ratio = m.stock / m.minStock;
              const tone = ratio < 1 ? "danger" : ratio < 1.4 ? "warning" : "brand";
              const pct = Math.min(100, (m.stock / (m.minStock * 2)) * 100);
              return (
                <li key={m.id}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{m.name}</p>
                      <p className="text-xs text-ink-600">{m.color} · мин. {m.minStock} {m.unit}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-ink-900">{m.stock} {m.unit}</p>
                  </div>
                  <ProgressBar value={pct} tone={tone} className="mt-1.5" />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* AI nudge */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/15 via-panel to-panel p-5 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Помощник Tigim готов ответить</p>
            <p className="mt-0.5 text-sm text-ink-700">
              «Какие заказы могут опоздать?» · «Где больше всего брака?» · «Сколько прибыли за месяц?»
            </p>
          </div>
        </div>
        <Link to="/app/ai" className="btn-brand mt-3 w-full justify-center sm:mt-0 sm:w-auto">
          Открыть чат <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Small filler – success summary */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5 text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> Данные обновлены сейчас
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Следующая синхронизация через 5 мин
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5" /> {materials.length} материалов на складе
        </span>
      </div>
    </div>
  );
}
