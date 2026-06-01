import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { createMaterial } from "../lib/warehouse";
import { useAuth } from "../lib/auth";
import type { Currency, MaterialType, MaterialUnit } from "../types";

interface MaterialFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
}

const TYPES: MaterialType[] = ["ткань", "фурнитура", "упаковка", "нить"];
const UNITS: MaterialUnit[] = ["кг", "м", "шт", "рул"];

export default function MaterialFormModal({
  open,
  onClose,
  onCreated,
  companyId,
}: MaterialFormModalProps) {
  const { company } = useAuth();
  const usdRate = company?.usdRate ?? 88;

  const [name, setName] = useState("");
  const [type, setType] = useState<MaterialType>("ткань");
  const [color, setColor] = useState("");
  const [unit, setUnit] = useState<MaterialUnit>("кг");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<Currency>("KGS");
  const [supplier, setSupplier] = useState("");
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

  useEffect(() => {
    if (open) {
      setName("");
      setType("ткань");
      setColor("");
      setUnit("кг");
      setStock("");
      setMinStock("");
      setPricePerUnit("");
      setPriceCurrency("KGS");
      setSupplier("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createMaterial(companyId, {
        name: name.trim(),
        type,
        color: color.trim() || undefined,
        unit,
        stock: parseFloat(stock) || 0,
        minStock: parseFloat(minStock) || 0,
        pricePerUnit: parseFloat(pricePerUnit) || 0,
        priceCurrency,
        supplier: supplier.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить материал");
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
          <h2 className="text-xl font-bold text-ink-900">Новый материал</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Добавьте позицию в склад. Остаток будет меняться через приход / расход.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="mat-name" className="label">Название <span className="text-rose-300">*</span></label>
              <input
                id="mat-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1.5"
                placeholder="Холодок 180"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="mat-type" className="label">Тип</label>
              <select
                id="mat-type"
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType)}
                className="input mt-1.5"
              >
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mat-unit" className="label">Единица измерения</label>
              <select
                id="mat-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                className="input mt-1.5"
              >
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mat-color" className="label">Цвет</label>
              <input
                id="mat-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input mt-1.5"
                placeholder="Чёрный"
              />
            </div>
            <div>
              <label htmlFor="mat-supplier" className="label">Поставщик</label>
              <input
                id="mat-supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="input mt-1.5"
                placeholder='ОсОО "Текстиль-Импорт"'
              />
            </div>
            <div>
              <label htmlFor="mat-stock" className="label">Стартовый остаток</label>
              <input
                id="mat-stock"
                type="number"
                step="0.001"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="input mt-1.5"
                placeholder="120"
              />
            </div>
            <div>
              <label htmlFor="mat-min" className="label">Минимальный остаток</label>
              <input
                id="mat-min"
                type="number"
                step="0.001"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="input mt-1.5"
                placeholder="80"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Цена за единицу</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="mat-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  className="input flex-1"
                  placeholder={priceCurrency === "USD" ? "5" : "580"}
                  aria-label="Цена"
                />
                <div className="inline-flex rounded-lg border border-panel-border bg-panel-muted p-1">
                  <button
                    type="button"
                    onClick={() => setPriceCurrency("KGS")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      priceCurrency === "KGS"
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-ink-700 hover:text-ink-900"
                    }`}
                  >
                    сом
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceCurrency("USD")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      priceCurrency === "USD"
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-ink-700 hover:text-ink-900"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
              {priceCurrency === "USD" && pricePerUnit && (
                <p className="mt-1.5 text-xs text-ink-600">
                  ≈ {(parseFloat(pricePerUnit) * usdRate).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} сом
                  <span className="text-ink-600/70"> · по курсу {usdRate.toFixed(2)} сом/$, настраивается в Настройках</span>
                </p>
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
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</> : <>Добавить</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
