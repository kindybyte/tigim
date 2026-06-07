import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  AlertTriangle,
  Trash2,
  User,
  Wallet,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { OrderStatusBadge, StageStatusBadge } from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import Avatar from "../components/ui/Avatar";
import WorkLogFormModal from "../components/WorkLogFormModal";
import OrderExpenseFormModal from "../components/OrderExpenseFormModal";
import {
  daysUntil,
  defects as mockDefects,
  formatDateShort,
  formatNumber,
  formatSom,
  orders as mockOrders,
} from "../data/mockData";
import type { Order, OrderExpense, Stage } from "../types";
import { useAuth } from "../lib/auth";
import { canSeeFinance } from "../lib/company";
import { getOrderByNumber, subscribeToOrders } from "../lib/orders";
import {
  deleteWorkLog,
  listWorkLogsForOrder,
  subscribeToWorkLogs,
  type WorkLog,
} from "../lib/workLogs";
import {
  CATEGORY_LABEL_RU,
  deleteOrderExpense,
  listOrderExpenses,
  subscribeToOrderExpenses,
} from "../lib/orderExpenses";

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const { configured, companyId, currentRole } = useAuth();
  const useRealData = configured && !!companyId;
  const showFinance = !useRealData || canSeeFinance(currentRole);

  const [order, setOrder] = useState<Order | null>(
    useRealData ? null : mockOrders.find((o) => o.id === id) ?? mockOrders[0],
  );
  const [loading, setLoading] = useState(useRealData);
  const [error, setError] = useState<string | null>(null);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logModalStageId, setLogModalStageId] = useState<string | undefined>(undefined);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const refetch = useCallback(async () => {
    if (!useRealData || !id) return;
    try {
      const row = await getOrderByNumber(companyId!, id);
      setOrder(row);
      setError(null);
      if (row?.uuid) {
        const [logs, exps] = await Promise.all([
          listWorkLogsForOrder(row.uuid),
          listOrderExpenses(row.uuid),
        ]);
        setWorkLogs(logs);
        setExpenses(exps);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заказ");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId, id]);

  useEffect(() => {
    if (useRealData) setLoading(true);
    void refetch();
  }, [refetch, useRealData]);

  // Realtime: подхватываем чужие записи выработки, расходы и общие изменения заказа.
  useEffect(() => {
    if (!useRealData || !companyId || !order?.uuid) return;
    const unsubLogs = subscribeToWorkLogs(order.uuid, () => void refetch());
    const unsubExpenses = subscribeToOrderExpenses(order.uuid, () => void refetch());
    const unsubOrders = subscribeToOrders(companyId, () => void refetch());
    return () => {
      unsubLogs();
      unsubExpenses();
      unsubOrders();
    };
  }, [useRealData, companyId, order?.uuid, refetch]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-sm text-ink-600">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Загружаем заказ…
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="animate-fade-in">
        <Link to="/app/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-800">
          <ArrowLeft className="h-4 w-4" /> Все заказы
        </Link>
        <div className="rounded-2xl border border-panel-border bg-panel p-10 text-center">
          <h2 className="text-lg font-semibold text-ink-900">
            {error ? "Не удалось загрузить заказ" : `Заказ #${id} не найден`}
          </h2>
          {error && <p className="mt-2 text-sm text-ink-600">{error}</p>}
        </div>
      </div>
    );
  }

  const dleft = daysUntil(order.deadline);
  const orderDefects = useRealData ? [] : mockDefects.filter((d) => d.orderId === order.id);
  const canLogWork = useRealData && !!order.uuid;
  const stagesWithId = order.stages.filter((s): s is Stage & { id: string } => Boolean(s.id));

  function openLogModal(stageId?: string) {
    setLogModalStageId(stageId);
    setLogModalOpen(true);
  }

  async function handleDeleteLog(logId: string) {
    if (!confirm("Удалить эту запись выработки?")) return;
    try {
      await deleteWorkLog(logId);
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Удалить этот расход?")) return;
    try {
      await deleteOrderExpense(expenseId);
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  // Реальная себестоимость уже посчитана getOrderCostBreakdown() в orders lib.
  const cb = order.costBreakdown;
  const realTotal = cb.total;
  const realProfit = order.revenue - realTotal;
  const realMargin = order.revenue > 0 ? Math.round((realProfit / order.revenue) * 100) : 0;
  const perUnitCost = order.qty > 0 ? Math.round(realTotal / order.qty) : 0;
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Cтроки таблицы «Из чего себестоимость» — показываем только ненулевые.
  const breakdownLines: { label: string; value: number; color: string; hint?: string }[] = [
    { label: "Ткань", value: cb.fabric, color: "bg-brand-500" },
    { label: "Фурнитура", value: cb.accessories, color: "bg-violet-500" },
    { label: "Упаковка", value: cb.packaging, color: "bg-amber-500" },
    { label: "Накладные", value: cb.overhead, color: "bg-slate-500" },
    { label: "Прочее", value: cb.other, color: "bg-stone-500" },
    { label: "Сдельная работа", value: cb.laborPerPiece, color: "bg-teal-500", hint: "из выработки" },
    { label: "Доля окладов", value: cb.laborMonthly, color: "bg-cyan-500", hint: "пропорц. месяц" },
    { label: "Брак", value: cb.defects, color: "bg-rose-500" },
  ].filter((b) => b.value > 0);
  if (breakdownLines.length === 0) {
    breakdownLines.push({
      label: "Пока ничего не записано",
      value: 0,
      color: "bg-panel-muted",
    });
  }

  return (
    <div className="animate-fade-in">
      <Link
        to="/app/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> Все заказы
      </Link>

      <PageHeader
        title={`Заказ #${order.id} · ${order.product}`}
        description={`${order.client} · ${formatNumber(order.qty)} шт · дедлайн ${formatDateShort(order.deadline)} ${dleft < 0 ? `(просрочка ${-dleft} дн.)` : `(${dleft} дн.)`}`}
        actions={
          <>
            <button className="btn-secondary"><Printer className="h-4 w-4" /> Печать</button>
            <button className="btn-secondary"><Download className="h-4 w-4" /> Скачать</button>
            <button
              type="button"
              onClick={() => openLogModal()}
              disabled={!canLogWork}
              title={canLogWork ? undefined : "Запись выработки доступна для реальных данных"}
              className="btn-brand"
            >
              <ClipboardList className="h-4 w-4" /> Записать выработку
            </button>
          </>
        }
      />

      {/* Top status bar */}
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-600">Статус</p>
            <div className="mt-1">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-600">Общий прогресс</p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={order.progress} tone={order.status === "Проблема" ? "danger" : "brand"} size="md" />
              <span className="text-sm font-bold text-ink-900 tabular-nums">{order.progress}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-600">Ответственный</p>
            <div className="mt-1 flex items-center gap-2">
              <Avatar name={order.responsible} color="#2563EB" size="sm" />
              <span className="text-sm font-semibold text-ink-900">{order.responsible}</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-600">Брак по заказу</p>
            <p className="mt-1 text-lg font-bold text-ink-900">
              {order.defectsCount} шт
              <span className="ml-2 text-xs font-medium text-rose-300">
                {((order.defectsCount / order.qty) * 100).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* MAIN */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stages */}
          <Card title="Этапы производства" subtitle="Кто и когда выполняет каждый этап">
            <ol className="space-y-4">
              {order.stages.map((stage, idx) => {
                const done = stage.status === "Завершено";
                const active = stage.status === "В работе";
                const problem = stage.status === "Проблема";
                const stageLogs = stage.id
                  ? workLogs.filter((wl) => wl.stageId === stage.id)
                  : [];
                return (
                  <li key={stage.id ?? stage.name} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                          done
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                            : active
                              ? "bg-brand-600 text-white"
                              : problem
                                ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
                                : "bg-panel-muted text-ink-600"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : problem ? <AlertTriangle className="h-4 w-4" /> : idx + 1}
                      </span>
                      {idx < order.stages.length - 1 && (
                        <span className={`mt-1 w-px flex-1 ${done ? "bg-emerald-200" : "bg-panel-muted"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink-900">{stage.name}</p>
                        <StageStatusBadge status={stage.status} />
                        <span className="text-xs text-ink-600">
                          <User className="mr-1 inline-block h-3 w-3" />
                          {stage.responsible}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-600">
                        {stage.startedAt && <span>Начало: {formatDateShort(stage.startedAt)}</span>}
                        {stage.finishedAt && <span>Завершено: {formatDateShort(stage.finishedAt)}</span>}
                      </div>
                      <ProgressBar
                        value={stage.progress}
                        tone={problem ? "danger" : done ? "success" : "brand"}
                        className="mt-2 max-w-md"
                        showLabel
                      />
                      {stage.comment && (
                        <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                          ⚠ {stage.comment}
                        </p>
                      )}

                      {/* Work logs timeline + per-stage record button */}
                      {canLogWork && stage.id && (
                        <div className="mt-3 space-y-1.5">
                          {stageLogs.slice(0, 8).map((log) => (
                            <WorkLogRow
                              key={log.id}
                              log={log}
                              onDelete={() => void handleDeleteLog(log.id)}
                            />
                          ))}
                          {stageLogs.length > 8 && (
                            <p className="text-[11px] text-ink-600">
                              … и ещё {stageLogs.length - 8} запис{stageLogs.length - 8 === 1 ? "ь" : "ей"}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => openLogModal(stage.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-semibold text-brand-200 hover:bg-brand-500/25"
                          >
                            <Plus className="h-3 w-3" /> Записать выработку
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Sizes */}
          <Card title="Размерная сетка" subtitle="План и фактическое выполнение">
            <div className="overflow-hidden rounded-lg border border-panel-border">
              <table className="w-full text-sm">
                <thead className="bg-panel-muted text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                  <tr>
                    <th className="px-4 py-2.5">Размер</th>
                    <th className="px-4 py-2.5 text-right">План</th>
                    <th className="px-4 py-2.5 text-right">Готово</th>
                    <th className="px-4 py-2.5">Прогресс</th>
                  </tr>
                </thead>
                <tbody>
                  {order.sizes.map((s) => {
                    const pct = Math.round(((s.done ?? 0) / s.qty) * 100);
                    return (
                      <tr key={s.size} className="border-t border-panel-border">
                        <td className="px-4 py-2.5 font-semibold text-ink-900">{s.size}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.qty}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.done ?? 0}</td>
                        <td className="px-4 py-2.5">
                          <ProgressBar value={pct} showLabel />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Defects */}
          <Card title="Брак по заказу" subtitle={`${orderDefects.length} записей`}>
            {orderDefects.length === 0 ? (
              <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">
                По этому заказу брак не зафиксирован.
              </p>
            ) : (
              <ul className="divide-y divide-panel-border">
                {orderDefects.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {d.reason} · размер {d.size} · {d.qty} шт
                      </p>
                      <p className="text-xs text-ink-600">
                        {formatDateShort(d.date)} · {d.stage} · {d.employee}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-rose-300 tabular-nums">−{formatSom(d.loss)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Comments */}
          <Card title="Комментарии и файлы" subtitle="История общения и вложения">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-xl bg-panel-muted p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name="Бакыт М." color="#1D4ED8" size="xs" />
                    <p className="text-sm font-semibold text-ink-900">Бакыт М. <span className="font-normal text-ink-600">· вчера, 16:40</span></p>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-800">
                    Принят раскрой, передаём на пошив. Гульнара возьмёт первую партию.
                  </p>
                </div>
                <div className="rounded-xl bg-panel-muted p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name="Айбек Т." color="#2563EB" size="xs" />
                    <p className="text-sm font-semibold text-ink-900">Айбек Т. <span className="font-normal text-ink-600">· сегодня, 09:15</span></p>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-800">
                    Клиент попросил сделать на 2 дня раньше — нужно ускорить пошив.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-panel-border bg-panel px-3 py-2">
                  <MessageCircle className="h-4 w-4 text-ink-600" />
                  <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-600" placeholder="Написать комментарий…" />
                  <button className="text-sm font-semibold text-brand-300">Отправить</button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">Вложения</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="grid aspect-square place-items-center rounded-lg border border-dashed border-panel-border bg-panel-muted text-ink-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  ))}
                  <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-panel-border bg-panel text-xs font-semibold text-brand-300 hover:bg-brand-500/15">
                    + Загрузить
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* SIDE */}
        <div className="space-y-6">
          {/* Client */}
          <Card title="Клиент">
            <p className="text-sm font-semibold text-ink-900">{order.client}</p>
            <a href={`tel:${order.clientPhone}`} className="mt-1 flex items-center gap-2 text-sm text-brand-300 hover:underline">
              <Phone className="h-3.5 w-3.5" /> {order.clientPhone}
            </a>
            <div className="divider my-4" />
            <dl className="space-y-2 text-sm">
              <Row label="Изделие" value={order.product} />
              <Row label="Ткань" value={order.fabric} />
              <Row label="Цвета" value={order.colors.join(", ")} />
              <Row label="Количество" value={`${formatNumber(order.qty)} шт`} />
              {showFinance && <Row label="Цена за ед." value={formatSom(order.unitPrice)} />}
              {showFinance && <Row label="Себестоимость ед." value={formatSom(order.unitCost)} />}
              <Row label="Приоритет" value={order.priority === "high" ? "Высокий" : order.priority === "normal" ? "Обычный" : "Низкий"} />
            </dl>
            {order.comment && (
              <p className="mt-4 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                💬 {order.comment}
              </p>
            )}
          </Card>

          {/* Finance — скрыто для технолога / OTK / склада / staff */}
          {showFinance && (
          <Card title="Финансы по заказу">
            <div className="space-y-2 text-sm">
              <Row label="Выручка" value={<span className="font-bold text-ink-900">{formatSom(order.revenue)}</span>} />
              <Row label="Себестоимость" value={<span className="text-rose-300">−{formatSom(realTotal)}</span>} />
              <Row
                label="Себестоимость на ед."
                value={<span className="text-rose-300 tabular-nums">{formatSom(perUnitCost)}</span>}
              />
              <div className="divider my-2" />
              <Row label="Прибыль" value={<span className="font-bold text-emerald-300">{formatSom(realProfit)}</span>} />
              <Row label="Маржинальность" value={`${realMargin}%`} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
                Из чего себестоимость
              </p>
              <ul className="space-y-1.5 text-sm">
                {breakdownLines.map((b) => (
                  <li key={b.label} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded ${b.color}`} />
                    <span className="text-ink-800">{b.label}</span>
                    {b.hint && <span className="text-[10px] text-ink-600">{b.hint}</span>}
                    <span className="ml-auto tabular-nums text-ink-600">{formatSom(b.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          )}

          {/* Expenses — технолог сам их записывает (купил фурнитуру), оставляем видимыми */}
          {canLogWork && (
            <Card
              title="Расходы по заказу"
              subtitle={`${expenses.length} ${expenses.length === 1 ? "запись" : "записей"} · ${formatSom(expensesTotal)}`}
              action={
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-500/15 px-2 py-1 text-xs font-semibold text-brand-200 hover:bg-brand-500/25"
                >
                  <Plus className="h-3 w-3" /> Добавить
                </button>
              }
            >
              {expenses.length === 0 ? (
                <div className="rounded-xl bg-panel-muted/40 px-3 py-3 text-xs text-ink-600">
                  <Wallet className="mr-1 inline-block h-3.5 w-3.5" />
                  Расходы пока не записаны. Добавьте «Ткань 100 000», «Фурнитура 10 000» и т.д.
                  по мере поступления.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {expenses.map((e) => (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      onDelete={() => void handleDeleteExpense(e.id)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {canLogWork && order.uuid && (
        <>
          <WorkLogFormModal
            open={logModalOpen}
            onClose={() => setLogModalOpen(false)}
            onCreated={() => {
              setLogModalOpen(false);
              void refetch();
            }}
            companyId={companyId!}
            orderId={order.uuid}
            orderNumber={order.id}
            stages={stagesWithId}
            sizes={order.sizes}
            defaultStageId={logModalStageId}
          />
          <OrderExpenseFormModal
            open={expenseModalOpen}
            onClose={() => setExpenseModalOpen(false)}
            onCreated={() => {
              setExpenseModalOpen(false);
              void refetch();
            }}
            companyId={companyId!}
            orderId={order.uuid}
            orderNumber={order.id}
          />
        </>
      )}
    </div>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: OrderExpense; onDelete: () => void }) {
  const isAuto = !!expense.sourceMovementId;
  return (
    <li className="flex items-start gap-2 rounded-lg bg-panel-muted/40 px-2 py-1.5 text-xs">
      <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-700">
        {CATEGORY_LABEL_RU[expense.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink-800">
          {expense.description ?? "—"}
          {isAuto && (
            <span
              title="Создано автоматически из движения склада"
              className="ml-1 inline-flex items-center text-ink-600"
            >
              <Link2 className="inline-block h-3 w-3" />
            </span>
          )}
        </p>
        <p className="text-[10px] text-ink-600">{formatDateShort(expense.date)}</p>
      </div>
      <span className="shrink-0 font-bold tabular-nums text-ink-900">
        {formatSom(expense.amount)}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Удалить расход"
        className="ml-1 shrink-0 rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-right text-ink-800">{value}</dd>
    </div>
  );
}

function WorkLogRow({ log, onDelete }: { log: WorkLog; onDelete: () => void }) {
  const when = useMemo(() => relativeDate(log.date), [log.date]);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-panel-muted/50 px-2 py-1.5 text-xs">
      <Avatar name={log.employeeName} color={log.employeeColor} size="xs" />
      <span className="font-semibold text-ink-800">{log.employeeName}</span>
      <span className="text-ink-600">·</span>
      <span className="text-ink-600">{when}</span>
      <span className="text-ink-600">·</span>
      <span className="font-semibold text-ink-900 tabular-nums">+{log.qty} шт</span>
      {log.size && (
        <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
          {log.size}
        </span>
      )}
      {log.comment && (
        <span className="truncate text-ink-600" title={log.comment}>
          · {log.comment}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Удалить запись"
        className="ml-auto rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}
