import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Clock,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import PageHeader from "../components/ui/PageHeader";
import Avatar from "../components/ui/Avatar";
import OrderFormModal from "../components/OrderFormModal";
import {
  daysUntil,
  formatDateShort,
  formatNumber,
  orders as mockOrders,
} from "../data/mockData";
import type { Order, OrderStatus } from "../types";
import { useAuth } from "../lib/auth";
import { listOrders, subscribeToOrders, updateOrderStatus } from "../lib/orders";

type KanbanColumn = {
  key: OrderStatus;
  title: string;
  accent: string;
  ring: string;
};

const COLUMNS: KanbanColumn[] = [
  { key: "Новый", title: "Новый заказ", accent: "bg-ink-600", ring: "ring-panel-border" },
  { key: "Раскрой", title: "Раскрой", accent: "bg-sky-500", ring: "ring-sky-500/30" },
  { key: "Пошив", title: "Пошив", accent: "bg-brand-500", ring: "ring-brand-500/30" },
  { key: "ОТК", title: "ОТК", accent: "bg-violet-500", ring: "ring-violet-500/30" },
  { key: "Упаковка", title: "Упаковка", accent: "bg-amber-500", ring: "ring-amber-500/30" },
  { key: "Готово", title: "Готово", accent: "bg-emerald-500", ring: "ring-emerald-500/30" },
];

export default function Production() {
  const { configured, companyId } = useAuth();
  const useRealData = configured && !!companyId;

  const [orders, setOrders] = useState<Order[]>(useRealData ? [] : mockOrders);
  const [loading, setLoading] = useState(useRealData);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reactive fetch
  const refetch = useCallback(async () => {
    if (!useRealData) return;
    try {
      const rows = await listOrders(companyId!);
      setOrders(rows);
    } catch (err) {
      console.warn("[production] refetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: any other team member moves a card, our board updates
  useEffect(() => {
    if (!useRealData || !companyId) return;
    return subscribeToOrders(companyId, () => {
      void refetch();
    });
  }, [useRealData, companyId, refetch]);

  // DnD sensors — drag starts only after 8px of movement, so clicks still navigate
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const orderNumber = String(active.id);
    const targetStatus = String(over.id) as OrderStatus;

    const before = orders.find((o) => o.id === orderNumber);
    if (!before || before.status === targetStatus) return;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderNumber ? { ...o, status: targetStatus } : o)),
    );

    if (!useRealData) return;
    try {
      await updateOrderStatus(orderNumber, targetStatus);
    } catch (err) {
      console.warn("[production] update status failed, refetching:", err);
      refetch();
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Производство"
        description="Канбан-доска заказов по этапам цеха"
        actions={
          <>
            <button className="btn-secondary" disabled>
              <Filter className="h-4 w-4" /> Фильтры
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!useRealData}
              title={useRealData ? undefined : "В демо-режиме создание недоступно"}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" /> Новый заказ
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Загружаем доску…
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="-mx-4 overflow-x-auto pb-3 sm:-mx-6 lg:-mx-8">
            <div className="inline-flex min-w-full gap-4 px-4 sm:px-6 lg:px-8">
              {COLUMNS.map((col) => (
                <Column
                  key={col.key}
                  column={col}
                  orders={orders.filter((o) => o.status === col.key)}
                  activeId={activeId}
                />
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-ink-600">
        <Legend tone="bg-emerald-500" label="Зелёный — всё нормально" />
        <Legend tone="bg-amber-500" label="Жёлтый — есть риск задержки" />
        <Legend tone="bg-rose-500" label="Красный — просрочка или проблема" />
        {useRealData && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            Realtime включён
          </span>
        )}
      </div>

      {useRealData && companyId && (
        <OrderFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refetch();
          }}
          companyId={companyId}
        />
      )}
    </div>
  );
}

function Column({
  column,
  orders,
  activeId,
}: {
  column: KanbanColumn;
  orders: Order[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const sum = orders.reduce((s, o) => s + o.qty, 0);

  return (
    <section
      ref={setNodeRef}
      className={`flex w-[300px] shrink-0 flex-col rounded-2xl bg-panel shadow-card transition ${
        isOver ? "ring-2 ring-brand-500/60 shadow-soft" : ""
      }`}
    >
      <header className="flex items-center justify-between border-b border-panel-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${column.accent}`} />
          <h3 className="text-sm font-semibold text-ink-900">{column.title}</h3>
          <span
            className={`grid h-5 min-w-5 place-items-center rounded-md bg-panel-muted px-1.5 text-[11px] font-bold text-ink-700 ring-1 ${column.ring}`}
          >
            {orders.length}
          </span>
        </div>
        <button className="rounded-md p-1 text-ink-600 hover:bg-panel-muted">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </header>
      <p className="px-4 pt-2 text-[11px] text-ink-600">{formatNumber(sum)} шт в этапе</p>

      <div className="flex-1 space-y-3 p-3">
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-panel-border p-6 text-center text-xs text-ink-600">
            Пусто
          </div>
        ) : (
          orders.map((o) => <KanbanCard key={o.id} order={o} isDragging={activeId === o.id} />)
        )}
      </div>
    </section>
  );
}

function KanbanCard({ order, isDragging }: { order: Order; isDragging: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: order.id });

  const dleft = useMemo(() => (order.deadline ? daysUntil(order.deadline) : 99), [order.deadline]);
  const danger = dleft < 0 || order.status === "Проблема";
  const warn = !danger && dleft <= 3;
  const accent = danger
    ? "border-l-rose-500"
    : warn
      ? "border-l-amber-500"
      : "border-l-emerald-500";

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  function onCardClick(e: React.MouseEvent) {
    // Avoid navigation while a drag was in progress — dnd-kit fires no click
    // on real drags thanks to distance constraint, but cheap safety check.
    if (isDragging) {
      e.preventDefault();
      return;
    }
    navigate(`/app/orders/${order.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onCardClick}
      className={`block cursor-grab select-none rounded-xl border border-panel-border bg-panel p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft border-l-4 ${accent} ${
        isDragging ? "opacity-60 cursor-grabbing" : ""
      }`}
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
        {order.deadline && (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              danger ? "text-rose-300" : warn ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {danger ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {formatDateShort(order.deadline)}
          </span>
        )}
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
          className={`h-1 rounded-full ${
            danger ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${order.progress}%` }}
        />
      </div>
    </div>
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
