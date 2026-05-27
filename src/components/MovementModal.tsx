import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Trash2, X } from "lucide-react";
import { recordMovement, type MovementKind } from "../lib/warehouse";
import type { Material } from "../types";

interface MovementModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyId: string;
  initialKind: MovementKind;
  materials: Material[];
  materialId?: string; // pre-select a material
}

const KIND_LABEL: Record<MovementKind, string> = {
  in: "Приход",
  out: "Расход",
  write_off: "Списание",
};

export default function MovementModal({
  open,
  onClose,
  onSaved,
  companyId,
  initialKind,
  materials,
  materialId: presetMaterialId,
}: MovementModalProps) {
  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [materialId, setMaterialId] = useState<string>(presetMaterialId ?? materials[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
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
      setKind(initialKind);
      setMaterialId(presetMaterialId ?? materials[0]?.id ?? "");
      setQty("");
      setNote("");
      setError(null);
    }
  }, [open, initialKind, presetMaterialId, materials]);

  if (!open) return null;

  const material = materials.find((m) => m.id === materialId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyNum = parseFloat(qty);
    if (!materialId || qtyNum <= 0 || Number.isNaN(qtyNum)) {
      setError("Выберите материал и укажите количество больше нуля");
      return;
    }
    setLoading(true);
    try {
      await recordMovement(companyId, {
        materialId,
        kind,
        qty: qtyNum,
        note: note.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записать операцию");
    } finally {
      setLoading(false);
    }
  }

  const tabClasses = (k: MovementKind) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      kind === k
        ? k === "in"
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : k === "out"
            ? "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30"
            : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
        : "text-ink-600 hover:bg-panel-muted"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
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
          <h2 className="text-xl font-bold text-ink-900">Операция на складе</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Остаток материала пересчитается автоматически.
          </p>

          {/* Kind tabs */}
          <div className="mt-5 flex gap-1 rounded-xl bg-panel-muted/60 p-1">
            <button type="button" onClick={() => setKind("in")} className={tabClasses("in")}>
              <ArrowDownToLine className="-mt-0.5 mr-1.5 inline-block h-4 w-4" />
              Приход
            </button>
            <button type="button" onClick={() => setKind("out")} className={tabClasses("out")}>
              <ArrowUpFromLine className="-mt-0.5 mr-1.5 inline-block h-4 w-4" />
              Расход
            </button>
            <button type="button" onClick={() => setKind("write_off")} className={tabClasses("write_off")}>
              <Trash2 className="-mt-0.5 mr-1.5 inline-block h-4 w-4" />
              Списать
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="mv-material" className="label">Материал</label>
              <select
                id="mv-material"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="input mt-1.5"
                required
              >
                {materials.length === 0 && <option value="">— нет материалов —</option>}
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.color || "без цвета"}) — остаток {m.stock} {m.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mv-qty" className="label">
                Количество {material && <span className="text-ink-600">({material.unit})</span>}
              </label>
              <input
                id="mv-qty"
                type="number"
                step="0.001"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input mt-1.5"
                placeholder="0"
                autoFocus
              />
              {material && qty && (
                <p className="mt-1.5 text-xs text-ink-600">
                  Новый остаток: <span className="font-semibold tabular-nums text-ink-900">
                    {(material.stock + (kind === "in" ? 1 : -1) * (parseFloat(qty) || 0)).toFixed(material.unit === "шт" ? 0 : 2)} {material.unit}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="mv-note" className="label">Комментарий <span className="text-ink-600">(необязательно)</span></label>
              <input
                id="mv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input mt-1.5"
                placeholder='Например: "Закуплено у поставщика Х"'
              />
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
            <button type="submit" disabled={loading || materials.length === 0} className="btn-brand flex-1 justify-center">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</> : <>{KIND_LABEL[kind]}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
