import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";

import { createWorkLog } from "../lib/workLogs";
import { listEmployees } from "../lib/employees";
import { useAuth } from "../lib/auth";
import type { Employee, SizeBreakdown, Stage, StageName } from "../types";

interface WorkLogFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
  orderId: string;             // UUID — для work_logs.order_id
  orderNumber: string;         // "1045" — только для заголовка
  stages: (Stage & { id: string })[];
  sizes: SizeBreakdown[];
  defaultStageId?: string;     // если открыто из конкретного этапа
}

const QUICK_ADD = [1, 5, 10, 50, 100];

export default function WorkLogFormModal({
  open,
  onClose,
  onCreated,
  companyId,
  orderId,
  orderNumber,
  stages,
  sizes,
  defaultStageId,
}: WorkLogFormModalProps) {
  const { user } = useAuth();

  const [stageId, setStageId] = useState<string>(defaultStageId || stages[0]?.id || "");
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when reopened
  useEffect(() => {
    if (!open) return;
    setStageId(defaultStageId || stages[0]?.id || "");
    setSize("");
    setQty("");
    setEmployeeId("");
    setComment("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [open, defaultStageId, stages]);

  // Lock body scroll + ESC handler
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Load employees once when opened
  useEffect(() => {
    if (!open) return;
    listEmployees(companyId)
      .then((rows) => setEmployees(rows))
      .catch(() => setEmployees([]));
  }, [open, companyId]);

  const sortedStages = useMemo(() => [...stages].sort((a, b) => stages.indexOf(a) - stages.indexOf(b)), [stages]);
  const stageName: StageName | undefined = stages.find((s) => s.id === stageId)?.name;

  function bumpQty(delta: number) {
    const current = parseInt(qty) || 0;
    const next = Math.max(0, current + delta);
    setQty(String(next));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyNum = parseInt(qty);
    if (!qtyNum || qtyNum <= 0) {
      setError("Введите количество больше нуля.");
      return;
    }
    if (!stageId) {
      setError("Выберите этап.");
      return;
    }
    setLoading(true);
    try {
      await createWorkLog(companyId, user?.id ?? null, {
        orderId,
        stageId,
        size: size || null,
        qty: qtyNum,
        employeeId: employeeId || null,
        date,
        comment: comment.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить запись");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>

        <form
          onSubmit={handleSubmit}
          className="max-h-[92vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-7"
        >
          <h2 className="text-lg font-bold text-ink-900">Записать выработку</h2>
          <p className="mt-0.5 text-xs text-ink-600">
            Заказ #{orderNumber} · кто сколько сделал
          </p>

          {/* Stage */}
          <label className="label mt-5 block">Этап</label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {sortedStages.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStageId(s.id)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  stageId === s.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-panel-muted text-ink-700 hover:bg-brand-500/15 hover:text-brand-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Employee */}
          <label htmlFor="wl-employee" className="label mt-4 block">
            Кто отшил
          </label>
          <select
            id="wl-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="input mt-1.5"
          >
            <option value="">— не указано —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.role}
              </option>
            ))}
          </select>

          {/* Size */}
          {sizes.length > 0 && (
            <>
              <label className="label mt-4 block">
                Размер <span className="text-ink-600">(если применимо)</span>
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <SizeChip active={size === ""} onClick={() => setSize("")}>Все</SizeChip>
                {sizes.map((s) => (
                  <SizeChip
                    key={s.size}
                    active={size === s.size}
                    onClick={() => setSize(s.size)}
                  >
                    {s.size}
                    {stageName === "Пошив" && s.done !== undefined && (
                      <span className="ml-1 text-[10px] opacity-70">
                        {s.done}/{s.qty}
                      </span>
                    )}
                  </SizeChip>
                ))}
              </div>
            </>
          )}

          {/* Quantity */}
          <label htmlFor="wl-qty" className="label mt-4 block">
            Количество <span className="text-rose-300">*</span>
          </label>
          <div className="mt-1.5 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => bumpQty(-1)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-panel-border bg-panel-muted text-ink-700 hover:bg-panel"
              aria-label="Минус один"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              id="wl-qty"
              type="number"
              inputMode="numeric"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="input h-12 flex-1 text-center text-lg font-bold tabular-nums"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => bumpQty(1)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-panel-border bg-panel-muted text-ink-700 hover:bg-panel"
              aria-label="Плюс один"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_ADD.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => bumpQty(n)}
                className="rounded-full border border-panel-border bg-panel px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-500/30 hover:bg-brand-500/15 hover:text-brand-200"
              >
                +{n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setQty("")}
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-medium text-ink-600 hover:text-rose-300"
            >
              сбросить
            </button>
          </div>

          {/* Date — обычно сегодня, иногда «забыли вчера» */}
          <label htmlFor="wl-date" className="label mt-4 block">Дата</label>
          <input
            id="wl-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1.5"
          />

          {/* Comment */}
          <label htmlFor="wl-comment" className="label mt-4 block">
            Комментарий <span className="text-ink-600">(опционально)</span>
          </label>
          <input
            id="wl-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="input mt-1.5"
            placeholder="Например: сменили иглу, отложили партию"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-brand flex-1 justify-center py-3 text-base"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</>
              ) : (
                <>Записать</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SizeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-panel-muted text-ink-700 hover:bg-brand-500/15 hover:text-brand-200"
      }`}
    >
      {children}
    </button>
  );
}
