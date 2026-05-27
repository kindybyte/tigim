import { useEffect, useState, type FormEvent } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { createDefect, listOrdersForDefect } from "../lib/defects";
import { listEmployees } from "../lib/employees";
import type { DefectReason, Employee, StageName } from "../types";

interface DefectFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
}

const REASONS: DefectReason[] = [
  "Неровный шов",
  "Пятно на ткани",
  "Неправильный размер",
  "Ошибка в крое",
  "Ошибка вышивки/печати",
  "Повреждение ткани",
];

const STAGES: StageName[] = [
  "Раскрой",
  "Печать/вышивка",
  "Пошив",
  "ОТК",
  "Упаковка",
  "Готово",
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function DefectFormModal({
  open,
  onClose,
  onCreated,
  companyId,
}: DefectFormModalProps) {
  const [orders, setOrders] = useState<{ number: string; product: string; unitCost: number }[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [product, setProduct] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<DefectReason>("Неровный шов");
  const [stage, setStage] = useState<StageName>("Пошив");
  const [loss, setLoss] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load orders dropdown when opened
  useEffect(() => {
    if (!open) return;
    setOrderNumber("");
    setProduct("");
    setDate(new Date().toISOString().slice(0, 10));
    setSize("");
    setQty("");
    setReason("Неровный шов");
    setStage("Пошив");
    setLoss("");
    setEmployeeId("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
    listOrdersForDefect(companyId)
      .then(setOrders)
      .catch((err) => console.warn("[defect] load orders failed:", err));
    listEmployees(companyId)
      .then(setEmployees)
      .catch((err) => console.warn("[defect] load employees failed:", err));
  }, [open, companyId]);

  // Auto-fill product + loss when order selected
  useEffect(() => {
    if (!orderNumber) return;
    const o = orders.find((x) => x.number === orderNumber);
    if (o) {
      if (!product) setProduct(o.product);
      const qtyN = parseFloat(qty) || 0;
      if (qtyN > 0 && o.unitCost > 0) setLoss(String(Math.round(o.unitCost * qtyN)));
    }
  }, [orderNumber, qty, orders]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("Файл больше 5 МБ. Сожмите фото и попробуйте снова.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Поддерживаются только JPG, PNG, WebP.");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(String(ev.target?.result || ""));
    reader.readAsDataURL(file);
  }

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyN = parseFloat(qty);
    if (!qtyN || qtyN <= 0) {
      setError("Укажите количество больше нуля");
      return;
    }
    setLoading(true);
    try {
      await createDefect(companyId, {
        orderNumber: orderNumber || undefined,
        date,
        product: product || undefined,
        size: size || undefined,
        qty: qtyN,
        reason,
        stage,
        loss: parseFloat(loss) || 0,
        employeeId: employeeId || undefined,
        photoFile: photoFile || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зафиксировать брак");
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
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
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
          <h2 className="text-xl font-bold text-ink-900">Зафиксировать брак</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            При выборе заказа потери в деньгах рассчитаются автоматически.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="df-order" className="label">Заказ</label>
              <select
                id="df-order"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="input mt-1.5"
              >
                <option value="">— не привязан —</option>
                {orders.map((o) => (
                  <option key={o.number} value={o.number}>#{o.number} · {o.product}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="df-date" className="label">Дата</label>
              <input
                id="df-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="df-product" className="label">Изделие</label>
              <input
                id="df-product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="input mt-1.5"
                placeholder="Подтянется из заказа"
              />
            </div>

            <div>
              <label htmlFor="df-size" className="label">Размер</label>
              <input
                id="df-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="input mt-1.5"
                placeholder="M / 32 / …"
              />
            </div>

            <div>
              <label htmlFor="df-qty" className="label">
                Количество <span className="text-rose-300">*</span>
              </label>
              <input
                id="df-qty"
                type="number"
                min="1"
                step="1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input mt-1.5"
                placeholder="6"
              />
            </div>

            <div>
              <label htmlFor="df-reason" className="label">Причина</label>
              <select
                id="df-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as DefectReason)}
                className="input mt-1.5"
              >
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="df-stage" className="label">Этап</label>
              <select
                id="df-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as StageName)}
                className="input mt-1.5"
              >
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="df-emp" className="label">
                Сотрудник <span className="text-ink-600">(кто допустил брак)</span>
              </label>
              <select
                id="df-emp"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="input mt-1.5"
              >
                <option value="">— не привязан —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} · {e.role}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="df-loss" className="label">Потери, сом</label>
              <input
                id="df-loss"
                type="number"
                min="0"
                step="1"
                value={loss}
                onChange={(e) => setLoss(e.target.value)}
                className="input mt-1.5"
                placeholder="Пересчитается, если выбран заказ"
              />
            </div>

            {/* Photo upload */}
            <div className="sm:col-span-2">
              <label className="label">Фото <span className="text-ink-600">(необязательно, до 5 МБ)</span></label>
              {photoPreview ? (
                <div className="mt-1.5 flex items-start gap-3 rounded-xl border border-panel-border bg-panel-muted p-2">
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900">{photoFile?.name}</p>
                    <p className="text-xs text-ink-600">
                      {photoFile && (photoFile.size / 1024).toFixed(0)} КБ
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="mt-2 text-xs font-semibold text-rose-300 hover:text-rose-200"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="df-photo"
                  className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border bg-panel-muted/40 px-4 py-6 text-sm text-ink-600 hover:bg-panel-muted"
                >
                  <Upload className="h-4 w-4" />
                  Выбрать фото (JPG / PNG / WebP)
                  <input
                    id="df-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
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
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</> : <>Зафиксировать</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Decorative icon for the form (re-used below)
export { ImageIcon };
