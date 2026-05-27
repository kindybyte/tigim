import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Filter, MoreHorizontal, Plus, User } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Avatar from "../components/ui/Avatar";
import {
  daysUntil,
  formatDateShort,
  formatNumber,
  orders,
} from "../data/mockData";
import type { OrderStatus } from "../types";

type KanbanColumn = {
  key: OrderStatus;
  title: string;
  accent: string;
  ring: string;
};

const COLUMNS: KanbanColumn[] = [
  { key: "Новый", title: "Новый заказ", accent: "bg-ink-600", ring: "ring-panel-border" },
  { key: "Раскрой", title: "Раскрой", accent: "bg-sky-500", ring: "ring-sky-500/30" },
  { key: "Пошив", title: "Пошив", accent: "bg-brand-600", ring: "ring-brand-500/30" },
  { key: "ОТК", title: "ОТК", accent: "bg-violet-500", ring: "ring-violet-500/30" },
  { key: "Упаковка", title: "Упаковка", accent: "bg-amber-500", ring: "ring-amber-500/30" },
  { key: "Готово", title: "Готово", accent: "bg-emerald-500", ring: "ring-emerald-500/30" },
];

export default function Production() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Производство"
        description="Канбан-доска заказов по этапам цеха"
        actions={
          <>
            <button className="btn-secondary"><Filter className="h-4 w-4" /> Фильтры</button>
            <button className="btn-brand"><Plus className="h-4 w-4" /> Новый заказ</button>
          </>
        }
      />

      <div className="-mx-4 overflow-x-auto pb-3 sm:-mx-6 lg:-mx-8">
        <div className="inline-flex min-w-full gap-4 px-4 sm:px-6 lg:px-8">
          {COLUMNS.map((col) => {
            const items = orders.filter((o) => o.status === col.key);
            const sum = items.reduce((s, o) => s + o.qty, 0);
            return (
              <section
                key={col.key}
                className="flex w-[300px] shrink-0 flex-col rounded-2xl bg-panel shadow-card"
              >
                <header className="flex items-center justify-between border-b border-panel-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.accent}`} />
                    <h3 className="text-sm font-semibold text-ink-900">{col.title}</h3>
                    <span className={`grid h-5 min-w-5 place-items-center rounded-md bg-panel-muted px-1.5 text-[11px] font-bold text-ink-700 ring-1 ${col.ring}`}>
                      {items.length}
                    </span>
                  </div>
                  <button className="rounded-md p-1 text-ink-600 hover:bg-panel-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </header>
                <p className="px-4 pt-2 text-[11px] text-ink-600">{formatNumber(sum)} шт в этапе</p>

                <div className="flex-1 space-y-3 p-3">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-panel-border p-6 text-center text-xs text-ink-600">
                      Пусто
                    </div>
                  ) : (
                    items.map((o) => <KanbanCard key={o.id} order={o} />)
                  )}

                  <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-panel-border py-2 text-xs font-medium text-ink-600 hover:border-brand-500/30 hover:text-brand-200">
                    <Plus className="h-3.5 w-3.5" /> Добавить заказ
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-ink-600">
        <Legend tone="bg-emerald-500" label="Зелёный — всё нормально" />
        <Legend tone="bg-amber-500" label="Жёлтый — есть риск задержки" />
        <Legend tone="bg-rose-500" label="Красный — просрочка или проблема" />
      </div>
    </div>
  );
}

function KanbanCard({ order }: { order: (typeof orders)[number] }) {
  const dleft = daysUntil(order.deadline);
  const danger = dleft < 0 || order.status === "Проблема";
  const warn = !danger && dleft <= 3;
  const accent = danger ? "border-l-rose-500" : warn ? "border-l-amber-500" : "border-l-emerald-500";

  return (
    <Link
      to={`/app/orders/${order.id}`}
      className={`block rounded-xl border border-panel-border bg-panel p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft border-l-4 ${accent}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600">#{order.id}</p>
        {order.priority === "high" && (
          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">!</span>
        )}
      </div>
      <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink-900">
        {order.product}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-ink-600">{order.client}</p>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="rounded-md bg-panel-muted px-1.5 py-0.5 font-semibold text-ink-700">
          {formatNumber(order.qty)} шт
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${danger ? "text-rose-300" : warn ? "text-amber-300" : "text-emerald-300"}`}>
          {danger ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {formatDateShort(order.deadline)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar name={order.responsible} color="#2563EB" size="xs" />
          <span className="text-[11px] text-ink-600">{order.responsible.split(" ")[0]}</span>
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-ink-800">
          {order.progress}%
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-panel-muted">
        <div
          className={`h-1 rounded-full ${danger ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${order.progress}%` }}
        />
      </div>
    </Link>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}
