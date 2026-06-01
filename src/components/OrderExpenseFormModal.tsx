import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";

import { createOrderExpense, CATEGORY_LABEL_RU } from "../lib/orderExpenses";
import { useAuth } from "../lib/auth";
import type { ExpenseCategory } from "../types";

interface OrderExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
  orderId: string;
  orderNumber: string;
}

const CATEGORIES: ExpenseCategory[] = [
  "fabric",
  "accessories",
  "packaging",
  "overhead",
  "other",
];

export default function OrderExpenseFormModal({
  open,
  onClose,
  onCreated,
  companyId,
  orderId,
  orderNumber,
}: OrderExpenseFormModalProps) {
  const { user } = useAuth();

  const [category, setCategory] = useState<ExpenseCategory>("fabric");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory("fabric");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, [open]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Введите сумму больше нуля.");
      return;
    }
    setLoading(true);
    try {
      await createOrderExpense(companyId, user?.id ?? null, {
        orderId,
        category,
        amount: amountNum,
        description: description.trim() || undefined,
        date,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить расход");
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
          <h2 className="text-lg font-bold text-ink-900">Добавить расход</h2>
          <p className="mt-0.5 text-xs text-ink-600">
            Заказ #{orderNumber} · попадёт в себестоимость
          </p>

          {/* Category */}
          <label className="label mt-5 block">Категория</label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  category === c
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-panel-muted text-ink-700 hover:bg-brand-500/15 hover:text-brand-200"
                }`}
              >
                {CATEGORY_LABEL_RU[c]}
              </button>
            ))}
          </div>

          {/* Amount */}
          <label htmlFor="oe-amount" className="label mt-4 block">
            Сумма <span className="text-rose-300">*</span>{" "}
            <span className="text-ink-600">(сом)</span>
          </label>
          <input
            id="oe-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input mt-1.5 h-12 text-center text-lg font-bold tabular-nums"
            placeholder="100000"
            autoFocus
          />

          {/* Description */}
          <label htmlFor="oe-desc" className="label mt-4 block">
            Описание <span className="text-ink-600">(опционально)</span>
          </label>
          <input
            id="oe-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input mt-1.5"
            placeholder="Поплин белый 180, поставщик Ким"
          />

          {/* Date */}
          <label htmlFor="oe-date" className="label mt-4 block">Дата</label>
          <input
            id="oe-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input mt-1.5"
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
                <>Добавить</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
