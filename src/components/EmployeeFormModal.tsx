import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { createEmployee } from "../lib/employees";
import { COMMON_EMPLOYEE_ROLES, type PayType, type StageName } from "../types";

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
}

const STAGES: StageName[] = [
  "Раскрой",
  "Печать/вышивка",
  "Пошив",
  "ОТК",
  "Упаковка",
  "Готово",
];

// Hint of a sensible stage for the well-known roles. For custom roles falls
// back to "Пошив". Comparison is case-insensitive.
const STAGE_HINTS: Record<string, StageName> = {
  "закройщик": "Раскрой",
  "швея": "Пошив",
  "отк": "ОТК",
  "упаковщик": "Упаковка",
  "мастер цеха": "Пошив",
  "менеджер": "Пошив",
  "технолог": "Пошив",
  "кладовщик": "Упаковка",
  "гладильщик": "Упаковка",
};

function suggestStage(role: string): StageName {
  return STAGE_HINTS[role.trim().toLowerCase()] ?? "Пошив";
}

export default function EmployeeFormModal({
  open,
  onClose,
  onCreated,
  companyId,
}: EmployeeFormModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Швея");
  const [stage, setStage] = useState<StageName>("Пошив");
  const [stageManuallyEdited, setStageManuallyEdited] = useState(false);
  const [payType, setPayType] = useState<PayType>("monthly");
  const [norm, setNorm] = useState("");
  const [salary, setSalary] = useState("");
  const [ratePerPiece, setRatePerPiece] = useState("");
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
      setRole("Швея");
      setStage("Пошив");
      setStageManuallyEdited(false);
      setPayType("monthly");
      setNorm("");
      setSalary("");
      setRatePerPiece("");
      setError(null);
    }
  }, [open]);

  // Auto-set stage when role changes (unless user has overridden it)
  useEffect(() => {
    if (!stageManuallyEdited) setStage(suggestStage(role));
  }, [role, stageManuallyEdited]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedRole = role.trim();
    if (!trimmedRole) {
      setError("Укажите должность.");
      return;
    }
    setLoading(true);
    try {
      await createEmployee(companyId, {
        name: name.trim(),
        role: trimmedRole,
        stage,
        norm: parseInt(norm) || 0,
        payType,
        salary: payType === "monthly" ? parseFloat(salary) || 0 : 0,
        ratePerPiece: payType === "per_piece" ? parseFloat(ratePerPiece) || 0 : 0,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить сотрудника");
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

        <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-xl font-bold text-ink-900">Добавить сотрудника</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Должность можно ввести любую — например «Технолог» или «Контролёр ОТК».
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="emp-name" className="label">
                Имя <span className="text-rose-300">*</span>
              </label>
              <input
                id="emp-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1.5"
                placeholder="Гульнара Асанова"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="emp-role" className="label">
                Должность <span className="text-rose-300">*</span>
              </label>
              <input
                id="emp-role"
                required
                list="emp-role-options"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input mt-1.5"
                placeholder="Швея / Технолог / …"
              />
              <datalist id="emp-role-options">
                {COMMON_EMPLOYEE_ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="emp-stage" className="label">Этап</label>
              <select
                id="emp-stage"
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value as StageName);
                  setStageManuallyEdited(true);
                }}
                className="input mt-1.5"
              >
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Как платим</label>
              <div className="mt-1.5 inline-flex rounded-lg border border-panel-border bg-panel-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPayType("monthly")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    payType === "monthly"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-ink-700 hover:text-ink-900"
                  }`}
                >
                  Оклад в месяц
                </button>
                <button
                  type="button"
                  onClick={() => setPayType("per_piece")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    payType === "per_piece"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-ink-700 hover:text-ink-900"
                  }`}
                >
                  Сдельно за единицу
                </button>
              </div>
            </div>

            {payType === "monthly" ? (
              <>
                <div>
                  <label htmlFor="emp-norm" className="label">
                    Норма в месяц <span className="text-ink-600">(шт)</span>
                  </label>
                  <input
                    id="emp-norm"
                    type="number"
                    min="0"
                    value={norm}
                    onChange={(e) => setNorm(e.target.value)}
                    className="input mt-1.5"
                    placeholder="600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-salary" className="label">
                    Оклад <span className="text-ink-600">(сом / мес)</span>
                  </label>
                  <input
                    id="emp-salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="input mt-1.5"
                    placeholder="38000"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="emp-rate" className="label">
                    Ставка <span className="text-rose-300">*</span>{" "}
                    <span className="text-ink-600">(сом / шт)</span>
                  </label>
                  <input
                    id="emp-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={ratePerPiece}
                    onChange={(e) => setRatePerPiece(e.target.value)}
                    className="input mt-1.5"
                    placeholder="55"
                  />
                </div>
                <div>
                  <label htmlFor="emp-norm-piece" className="label">
                    Норма в месяц <span className="text-ink-600">(шт, для целей)</span>
                  </label>
                  <input
                    id="emp-norm-piece"
                    type="number"
                    min="0"
                    value={norm}
                    onChange={(e) => setNorm(e.target.value)}
                    className="input mt-1.5"
                    placeholder="600"
                  />
                </div>
              </>
            )}
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
