import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { createOrder } from "../lib/orders";
import type { Priority } from "../types";

interface OrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (orderNumber: string) => void;
  companyId: string;
}

interface SizeRow {
  size: string;
  qty: string;
}

export default function OrderFormModal({ open, onClose, onCreated, companyId }: OrderFormModalProps) {
  const [client, setClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [product, setProduct] = useState("");
  const [fabric, setFabric] = useState("");
  const [colorsInput, setColorsInput] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [comment, setComment] = useState("");
  const [sizes, setSizes] = useState<SizeRow[]>([{ size: "S", qty: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Reset
      setClient("");
      setClientPhone("");
      setProduct("");
      setFabric("");
      setColorsInput("");
      setUnitPrice("");
      setUnitCost("");
      setDeadline("");
      setPriority("normal");
      setComment("");
      setSizes([{ size: "S", qty: "" }]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function addSize() {
    setSizes((s) => [...s, { size: "", qty: "" }]);
  }
  function removeSize(idx: number) {
    setSizes((s) => s.filter((_, i) => i !== idx));
  }
  function patchSize(idx: number, patch: Partial<SizeRow>) {
    setSizes((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  const totalQty = sizes.reduce((acc, s) => acc + (parseInt(s.qty) || 0), 0);
  const computedRevenue = (parseFloat(unitPrice) || 0) * totalQty;
  const computedProfit = computedRevenue - (parseFloat(unitCost) || 0) * totalQty;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanSizes = sizes
      .map((s) => ({ size: s.size.trim(), qty: parseInt(s.qty) || 0 }))
      .filter((s) => s.size && s.qty > 0);

    const qty = cleanSizes.reduce((acc, s) => acc + s.qty, 0);
    if (qty <= 0) {
      setError("Укажите размеры и количество (минимум один размер)");
      setLoading(false);
      return;
    }

    try {
      const orderNumber = await createOrder(companyId, {
        client: client.trim(),
        clientPhone: clientPhone.trim() || undefined,
        product: product.trim(),
        fabric: fabric.trim() || undefined,
        colors: colorsInput
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        qty,
        unitPrice: parseFloat(unitPrice) || 0,
        unitCost: parseFloat(unitCost) || 0,
        deadline: deadline || undefined,
        priority,
        comment: comment.trim() || undefined,
        sizes: cleanSizes,
      });
      onCreated(orderNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать заказ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
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

        <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-xl font-bold text-ink-900">Новый заказ</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Номер заказа сгенерируется автоматически. Этапы создадутся в статусе «Ожидает».
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="of-client" className="label">Клиент <span className="text-rose-300">*</span></label>
              <input
                id="of-client"
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="input mt-1.5"
                placeholder='ИП "Айзаада"'
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="of-phone" className="label">Телефон клиента</label>
              <input
                id="of-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="input mt-1.5"
                placeholder="+996 555 12 34 56"
              />
            </div>
            <div>
              <label htmlFor="of-deadline" className="label">Дедлайн</label>
              <input
                id="of-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="of-product" className="label">Изделие <span className="text-rose-300">*</span></label>
              <input
                id="of-product"
                required
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="input mt-1.5"
                placeholder="Футболка «Холодок»"
              />
            </div>
            <div>
              <label htmlFor="of-fabric" className="label">Ткань</label>
              <input
                id="of-fabric"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="input mt-1.5"
                placeholder="Холодок 180"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="of-colors" className="label">
                Цвета <span className="text-ink-600">(через запятую)</span>
              </label>
              <input
                id="of-colors"
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                className="input mt-1.5"
                placeholder="Чёрный, Белый"
              />
            </div>

            <div>
              <label htmlFor="of-price" className="label">Цена за единицу (сом)</label>
              <input
                id="of-price"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="input mt-1.5"
                placeholder="420"
              />
            </div>
            <div>
              <label htmlFor="of-cost" className="label">Себестоимость (сом)</label>
              <input
                id="of-cost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="input mt-1.5"
                placeholder="280"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="of-priority" className="label">Приоритет</label>
              <select
                id="of-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="input mt-1.5"
              >
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="of-comment" className="label">Комментарий</label>
              <textarea
                id="of-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="input mt-1.5 resize-none"
                placeholder="Что-то важное про этот заказ"
              />
            </div>
          </div>

          {/* Sizes */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="label">Размеры и количество <span className="text-rose-300">*</span></p>
              <button
                type="button"
                onClick={addSize}
                className="inline-flex items-center gap-1 rounded-md bg-panel-muted px-2 py-1 text-xs font-semibold text-ink-700 hover:bg-panel-hover"
              >
                <Plus className="h-3 w-3" /> Добавить размер
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {sizes.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={row.size}
                    onChange={(e) => patchSize(idx, { size: e.target.value })}
                    className="input"
                    placeholder="Размер (S, M, 30, ...)"
                  />
                  <input
                    type="number"
                    min="0"
                    value={row.qty}
                    onChange={(e) => patchSize(idx, { qty: e.target.value })}
                    className="input"
                    placeholder="Кол-во"
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(idx)}
                    disabled={sizes.length === 1}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-600 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Удалить размер"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-panel-muted px-3 py-3 text-center text-xs">
            <div>
              <p className="text-ink-600">Всего штук</p>
              <p className="mt-0.5 text-base font-bold text-ink-900 tabular-nums">{totalQty}</p>
            </div>
            <div>
              <p className="text-ink-600">Выручка</p>
              <p className="mt-0.5 text-base font-bold text-ink-900 tabular-nums">
                {computedRevenue.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} сом
              </p>
            </div>
            <div>
              <p className="text-ink-600">Прибыль</p>
              <p className="mt-0.5 text-base font-bold text-emerald-300 tabular-nums">
                {computedProfit.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} сом
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-brand flex-1 justify-center">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Создаём…
                </>
              ) : (
                <>Создать заказ</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
