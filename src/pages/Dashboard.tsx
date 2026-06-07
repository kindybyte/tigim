import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Briefcase,
  Loader2,
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
  formatDateShort,
  formatNumber,
  formatSom,
} from "../data/mockData";
import { useAuth } from "../lib/auth";
import { canSeeFinance } from "../lib/company";
import { getDashboardData, type DashboardData } from "../lib/dashboard";

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

const EMPTY: DashboardData = {
  activeOrdersCount: 0,
  inWorkCount: 0,
  overdueCount: 0,
  readyCount: 0,
  monthDefectsQty: 0,
  monthProfit: 0,
  atRisk: [],
  stageCounts: [
    { name: "Новый", count: 0, tone: "bg-ink-600" },
    { name: "Раскрой", count: 0, tone: "bg-sky-500" },
    { name: "Пошив", count: 0, tone: "bg-brand-500" },
    { name: "ОТК", count: 0, tone: "bg-violet-500" },
    { name: "Упаковка", count: 0, tone: "bg-amber-500" },
    { name: "Готово", count: 0, tone: "bg-emerald-500" },
  ],
  topEmployees: [],
  lowStock: [],
  weeklyDefects: [
    { label: "Н1", value: 0 },
    { label: "Н2", value: 0 },
    { label: "Н3", value: 0 },
    { label: "Н4", value: 0 },
    { label: "Н5", value: 0 },
  ],
  monthlyRevenue: [
    { label: "—", value: 0 },
    { label: "—", value: 0 },
    { label: "—", value: 0 },
    { label: "—", value: 0 },
    { label: "—", value: 0 },
    { label: "—", value: 0 },
  ],
};

export default function Dashboard() {
  const { user, configured, companyId, currentRole } = useAuth();
  const showFinance = !configured || canSeeFinance(currentRole);
  const useRealData = configured && !!companyId;

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";
  const greeting = greetingForHour(new Date().getHours());
  const greetingText = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;

  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(useRealData);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardData(companyId!));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить дашборд");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const hasAnyData = data.activeOrdersCount + data.readyCount + data.monthDefectsQty > 0;
  const stageMax = Math.max(1, ...data.stageCounts.map((s) => s.count));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={greetingText}
        description={
          loading
            ? "Загружаем данные…"
            : hasAnyData
              ? `Сегодня ${todayRu()} · в работе ${data.inWorkCount} заказов${data.overdueCount > 0 ? `, ${data.overdueCount} требуют внимания` : ""}`
              : `Сегодня ${todayRu()} · добавьте первый заказ, чтобы дашборд ожил`
        }
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

      {error && (
        <div className="mb-4 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}. <button onClick={refetch} className="font-semibold underline">Повторить</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Загружаем дашборд…
        </div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Активные заказы" value={String(data.activeOrdersCount)} icon={Briefcase} iconTone="brand" />
            <StatCard label="В работе" value={String(data.inWorkCount)} icon={Workflow} iconTone="purple" hint="раскрой, пошив, ОТК" />
            <StatCard
              label="Просрочено"
              value={String(data.overdueCount)}
              icon={AlertTriangle}
              iconTone={data.overdueCount > 0 ? "danger" : "neutral"}
              hint={data.overdueCount > 0 ? "требуют действий" : "всё под контролем"}
            />
            <StatCard label="Готовые партии" value={String(data.readyCount)} icon={PackageCheck} iconTone="success" />
            <StatCard label="Брак за месяц" value={`${data.monthDefectsQty} шт`} icon={AlertTriangle} iconTone="warning" />
            {showFinance && (
              <StatCard label="Прибыль за месяц" value={formatSom(data.monthProfit)} icon={Wallet} iconTone="brand" />
            )}
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
              {data.atRisk.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-600">
                  Пока нет активных заказов с дедлайнами. {!hasAnyData && (
                    <Link to="/app/orders" className="font-semibold text-brand-300">
                      Добавить первый →
                    </Link>
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-panel-border">
                  {data.atRisk.map((o) => {
                    const dleft = o.dleft;
                    const danger = dleft < 0;
                    const warn = dleft >= 0 && dleft <= 3;
                    return (
                      <li
                        key={o.id}
                        className="grid grid-cols-1 items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(140px,180px)_110px_120px_28px]"
                      >
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

                        <div className="flex sm:justify-start">
                          <OrderStatusBadge status={o.status} />
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-[11px] uppercase tracking-wide text-ink-600">Дедлайн</p>
                          <p className={`text-xs font-bold leading-tight ${danger ? "text-rose-300" : warn ? "text-amber-300" : "text-ink-800"}`}>
                            {o.deadline ? formatDateShort(o.deadline) : "—"}
                          </p>
                          <p className={`text-[11px] leading-tight ${danger ? "text-rose-400" : warn ? "text-amber-400" : "text-ink-600"}`}>
                            {o.deadline ? (dleft < 0 ? `просрочка ${-dleft} дн.` : `${dleft} дн.`) : "без срока"}
                          </p>
                        </div>

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
              )}
            </Card>

            {/* Production by stages */}
            <Card title="Производство по этапам" subtitle="Распределение активных заказов">
              {!hasAnyData ? (
                <p className="py-6 text-center text-sm text-ink-600">
                  Появится когда добавите первые заказы
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.stageCounts.map((s) => (
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
              )}
            </Card>
          </div>

          {/* CHARTS */}
          <div className={`mt-6 grid gap-4 ${showFinance ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
            {showFinance && (
              <Card
                className="lg:col-span-2"
                title="Выручка по месяцам"
                subtitle="Тысяч сом · последние 6 месяцев"
                action={
                  hasAnyData ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      <TrendingUp className="h-3 w-3" /> данные обновляются
                    </span>
                  ) : undefined
                }
              >
                {!hasAnyData ? (
                  <p className="py-12 text-center text-sm text-ink-600">
                    График появится с первым заказом
                  </p>
                ) : (
                  <LineChart
                    data={data.monthlyRevenue}
                    formatValue={(v) => `${v} тыс. сом`}
                  />
                )}
              </Card>
            )}

            <Card title="Брак по неделям" subtitle="Последние 5 недель">
              {data.monthDefectsQty === 0 ? (
                <p className="py-12 text-center text-sm text-ink-600">
                  Брак не зафиксирован
                </p>
              ) : (
                <BarChart data={data.weeklyDefects} color="#EF4444" formatValue={(v) => `${v} шт`} />
              )}
            </Card>
          </div>

          {/* BOTTOM ROW */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Top employees */}
            <Card title="Топ сотрудников" subtitle="Выполнение нормы за месяц">
              {data.topEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-600">
                  Добавьте сотрудников с нормой, чтобы видеть рейтинг.{" "}
                  <Link to="/app/employees" className="font-semibold text-brand-300">
                    Сотрудники →
                  </Link>
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.topEmployees.map((e) => {
                    const tone =
                      e.progressPct >= 110 ? "success" : e.progressPct >= 90 ? "brand" : "warning";
                    return (
                      <li key={e.id} className="flex items-center gap-3">
                        <Avatar name={e.name} color={e.avatarColor} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-semibold text-ink-900">{e.name}</p>
                            <span className="text-xs font-semibold tabular-nums text-ink-800">{e.progressPct}%</span>
                          </div>
                          <p className="truncate text-xs text-ink-600">{e.role} · {e.stage}</p>
                          <ProgressBar value={Math.min(e.progressPct, 120)} tone={tone} className="mt-1.5" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Activity feed (placeholder until event sourcing is added) */}
            <Card title="Последние события" subtitle="Хронология">
              <p className="py-6 text-center text-sm text-ink-600">
                Лента событий появится в следующих обновлениях.
              </p>
            </Card>

            {/* Warehouse stock */}
            <Card
              title="Остатки ткани"
              subtitle="С риском дефицита в первую очередь"
              action={
                <Link to="/app/warehouse" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
                  На склад <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              {data.lowStock.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-600">
                  Тканей на складе нет.{" "}
                  <Link to="/app/warehouse" className="font-semibold text-brand-300">
                    Добавить →
                  </Link>
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.lowStock.map((m) => {
                    const ratio = m.minStock > 0 ? m.stock / m.minStock : 99;
                    const tone = ratio < 1 ? "danger" : ratio < 1.4 ? "warning" : "brand";
                    const pct = Math.min(100, (m.stock / Math.max(1, m.minStock * 2)) * 100);
                    return (
                      <li key={m.id}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-900">{m.name}</p>
                            <p className="text-xs text-ink-600">{m.color || "—"} · мин. {m.minStock} {m.unit}</p>
                          </div>
                          <p className="text-sm font-bold tabular-nums text-ink-900">{m.stock} {m.unit}</p>
                        </div>
                        <ProgressBar value={pct} tone={tone} className="mt-1.5" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* AI nudge */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/15 via-panel to-panel p-5 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">Помощник Tigim</p>
                <p className="mt-0.5 text-sm text-ink-700">
                  Скоро сможете спрашивать: «Какие заказы могут опоздать?», «Где больше всего брака?»
                </p>
              </div>
            </div>
            <Link to="/app/ai" className="btn-brand mt-3 w-full justify-center sm:mt-0 sm:w-auto">
              Открыть <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Empty-state hint for fresh pilot users */}
          {!hasAnyData && (
            <div className="mt-6 rounded-2xl border border-panel-border bg-panel p-6">
              <h3 className="text-base font-semibold text-ink-900">С чего начать</h3>
              <ol className="mt-3 space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">1</span>
                  <span><Link to="/app/employees" className="font-semibold text-brand-300 hover:text-brand-200">Добавьте сотрудников</Link> — закройщика, швей, ОТК</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">2</span>
                  <span><Link to="/app/warehouse" className="font-semibold text-brand-300 hover:text-brand-200">Загрузите остатки склада</Link> — ткани, фурнитуру, упаковку</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">3</span>
                  <span><Link to="/app/orders" className="font-semibold text-brand-300 hover:text-brand-200">Создайте первый заказ</Link> — система сама расставит этапы</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-bold text-brand-300">4</span>
                  <span>Переходите на <Link to="/app/production" className="font-semibold text-brand-300 hover:text-brand-200">канбан</Link> и двигайте заказы по этапам — данные подтянутся сюда автоматически</span>
                </li>
              </ol>
            </div>
          )}

          {/* Filler — currency footer */}
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-600">
            <Boxes className="h-3.5 w-3.5" />
            Все цены в сомах
          </p>
        </>
      )}
    </div>
  );
}

