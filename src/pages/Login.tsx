import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "../components/ui/Logo";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("vladelec@bishkek-tex.kg");
  const [password, setPassword] = useState("••••••••");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate("/app"), 600);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" aria-label="На главную">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            Войти в Tigim
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Система контроля швейного производства
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-id" className="label">Телефон или email</label>
              <input
                id="login-id"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input mt-1.5"
                placeholder="+996 555 12 34 56 или email"
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-pw" className="label">Пароль</label>
                <a href="#" className="text-xs font-medium text-brand-300 hover:text-brand-300">
                  Забыли пароль?
                </a>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-pw"
                  type={showPassword ? "text" : "password"}
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
                  aria-label={showPassword ? "Скрыть" : "Показать"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" className="h-4 w-4 rounded border-panel-border text-brand-300 focus:ring-brand-500/30" defaultChecked />
              Запомнить меня на этом устройстве
            </label>

            <button type="submit" disabled={loading} className="btn-brand mt-2 w-full justify-center py-3 text-base">
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

            <button
              type="button"
              onClick={() => navigate("/app")}
              className="btn-secondary w-full justify-center"
            >
              Зайти как демо-пользователь
            </button>

            <p className="pt-4 text-center text-sm text-ink-600">
              Ещё нет аккаунта?{" "}
              <a href="#" className="font-semibold text-brand-300 hover:underline">
                Создать аккаунт
              </a>
            </p>
          </form>
        </div>

        <p className="text-xs text-ink-600">© {new Date().getFullYear()} Tigim — Контроль швейного производства</p>
      </div>

      {/* Right — brand panel */}
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
              Заказы, склад, брак, сотрудники и финансы — без тетрадей и десятка
              Excel-файлов.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Все заказы и этапы — в одном окне",
                "Kanban-доска производства",
                "Учёт брака и потерь в деньгах",
                "ИИ-помощник для быстрых ответов",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-200" />
                  <span className="text-brand-50/95">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm leading-relaxed text-brand-50/95">
              «Раньше я не знал, где теряются деньги. С Tigim вижу каждый этап
              производства и брак — сразу. За месяц мы снизили брак почти на
              половину».
            </p>
            <figcaption className="mt-4 flex items-center gap-3 text-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-bold">АТ</span>
              <div>
                <p className="font-semibold">Айбек Турдубеков</p>
                <p className="text-xs text-brand-100/80">Владелец цеха, Бишкек</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
