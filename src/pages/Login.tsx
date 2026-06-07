import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "../components/ui/Logo";
import DemoModeBanner from "../components/DemoModeBanner";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/app";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!configured) {
      setError(
        "Авторизация не настроена. Используйте кнопку «Зайти как демо-пользователь» ниже, чтобы посмотреть mock-данные.",
      );
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" aria-label="На главную">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <DemoModeBanner />
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">Войти в Tigim</h1>
          <p className="mt-2 text-sm text-ink-600">Система контроля швейного производства</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1.5"
                placeholder="you@example.com"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-pw" className="label">Пароль</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-300 hover:text-brand-200"
                >
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-pw"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Ваш пароль"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-600 hover:bg-panel-muted hover:text-ink-700"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-brand mt-2 w-full justify-center py-3 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Входим…
                </>
              ) : (
                <>
                  Войти <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {!configured && (
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="btn-secondary w-full justify-center"
              >
                Зайти как демо-пользователь
              </button>
            )}

            <p className="pt-4 text-center text-sm text-ink-600">
              Ещё нет аккаунта?{" "}
              <Link to="/signup" className="font-semibold text-brand-300 hover:underline">
                Создать аккаунт
              </Link>
            </p>
          </form>
        </div>

        <p className="text-xs text-ink-600">
          © {new Date().getFullYear()} Tigim — Контроль швейного производства
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 lg:block">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-20 h-[420px] w-[420px] rounded-full bg-teal-500/30 blur-3xl" />
          <div className="absolute bottom-0 -left-24 h-[320px] w-[320px] rounded-full bg-brand-400/30 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 800 800" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="800" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Версия 1.0 — для цехов Кыргызстана
            </span>
            <h2 className="mt-6 max-w-md text-3xl font-bold leading-tight">
              Контроль швейного производства в одном месте.
            </h2>
            <p className="mt-3 max-w-md text-base text-brand-100/85">
              Заказы, склад, брак, сотрудники и финансы — без тетрадей и десятка Excel-файлов.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Все заказы и этапы — в одном окне",
                "Kanban-доска производства",
                "Учёт брака и потерь в деньгах",
                "Финансовая аналитика по заказам",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-200" />
                  <span className="text-brand-50/95">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm font-semibold text-white">14 дней бесплатно</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-50/95">
              Полный доступ ко всем функциям. Без банковской карты — отмена в любой момент.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
