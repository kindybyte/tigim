import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { createEmployee } from "../lib/employees";
import type { EmployeeRole, StageName } from "../types";

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
}

const ROLES: EmployeeRole[] = [
  "Швея",
  "Закройщик",
  "ОТК",
  "Упаковщик",
  "Мастер цеха",
  "Менеджер",
];

const STAGES: StageName[] = [
  "Раскрой",
  "Печать/вышивка",
  "Пошив",
  "ОТК",
  "Упаковка",
  "Готово",
];

// Sensible defaults per role — autopopulates stage when role changes
const DEFAULT_STAGE: Record<EmployeeRole, StageName> = {
  "Закройщик": "Раскрой",
  "Швея": "Пошив",
  "ОТК": "ОТК",
  "Упаковщик": "Упаковка",
  "Мастер цеха": "Пошив",
  "Менеджер": "Пошив",
};

export default function EmployeeFormModal({
  open,
  onClose,
  onCreated,
  companyId,
}: EmployeeFormModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<EmployeeRole>("Швея");
  const [stage, setStage] = useState<StageName>("Пошив");
  const [norm, setNorm] = useState("");
  const [salary, setSalary] = useState("");
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
      setNorm("");
      setSalary("");
      setError(null);
    }
  }, [open]);

  // Auto-set stage when role changes
  useEffect(() => {
    setStage(DEFAULT_STAGE[role]);
  }, [role]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createEmployee(companyId, {
        name: name.trim(),
        role,
        stage,
        norm: parseInt(norm) || 0,
        salary: parseFloat(salary) || 0,
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

        <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-xl font-bold text-ink-900">Добавить сотрудника</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Сотрудник появится в списке и будет доступен в выпадающих списках
            заказов и брака.
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
              <label htmlFor="emp-role" className="label">Должность</label>
              <select
                id="emp-role"
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="input mt-1.5"
              >
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="emp-stage" className="label">Этап</label>
              <select
                id="emp-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as StageName)}
                className="input mt-1.5"
              >
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

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
                Зарплата <span className="text-ink-600">(сом)</span>
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
