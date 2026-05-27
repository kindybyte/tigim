import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  Layers,
  ListChecks,
  PieChart,
  Play,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import Logo from "../components/ui/Logo";
import DemoRequestModal from "../components/DemoRequestModal";
import { track } from "../lib/analytics";

interface DemoModalState {
  open: boolean;
  source: string;
  tier?: string;
}

export default function Landing() {
  const [demo, setDemo] = useState<DemoModalState>({ open: false, source: "" });

  const openDemo = (source: string, tier?: string) => {
    track("cta_clicked", { source, tier });
    setDemo({ open: true, source, tier });
  };
  const closeDemo = () => setDemo((d) => ({ ...d, open: false }));

  return (
    <div className="min-h-screen bg-surface text-ink-900">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-panel-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="На главную" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-700 md:flex">
            <a href="#problem" className="hover:text-ink-900">Проблемы</a>
            <a href="#solution" className="hover:text-ink-900">Решение</a>
            <a href="#how" className="hover:text-ink-900">Как работает</a>
            <a href="#pricing" className="hover:text-ink-900">Тарифы</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="btn-ghost hidden sm:inline-flex"
              onClick={() => track("cta_clicked", { source: "header_login" })}
            >
              Войти
            </Link>
            <button
              type="button"
              onClick={() => openDemo("header_try")}
              className="btn-brand"
            >
              Попробовать
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -right-32 top-12 h-[480px] w-[480px] rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -left-24 top-56 h-[420px] w-[420px] rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute right-1/3 top-80 h-[300px] w-[300px] rounded-full bg-brand-400/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-panel px-3 py-1 text-xs font-semibold text-brand-300 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
                Создано для швейных цехов Кыргызстана и СНГ
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
                Tigim — контроль{" "}
                <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-teal-300 bg-clip-text text-transparent">
                  швейного производства
                </span>{" "}
                в одном месте
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">
                Заказы, сроки, склад, сотрудники, брак и финансы — всё в одной
                системе для швейных цехов. Без тетрадей и десяти Excel-файлов.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openDemo("hero_try_free")}
                  className="btn-brand px-5 py-3 text-base"
                >
                  Попробовать бесплатно
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/app"
                  onClick={() => track("cta_clicked", { source: "hero_view_demo" })}
                  className="btn-secondary px-5 py-3 text-base"
                >
                  <Play className="h-4 w-4" />
                  Посмотреть демо
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-600">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  14 дней бесплатно
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Без банковской карты
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Поддержка на русском
                </span>
              </div>
            </div>

            {/* Hero visual: dashboard mock */}
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Проблема
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Почему цех теряет деньги?
            </h2>
            <p className="mt-3 text-ink-700">
              Большинство швейных цехов сегодня работают «по памяти» — а это всегда
              скрытые потери и сорванные сроки.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Нет точного контроля заказов", d: "Кто что шьёт, на каком этапе и сколько осталось — никто точно не знает.", i: ClipboardList },
              { t: "Сложно понять, где задержка", d: "Заказ опаздывает, а причина становится известна только в день отгрузки.", i: Workflow },
              { t: "Брак считается вручную", d: "Бракованные изделия теряются в потоке, потери никто не считает.", i: ListChecks },
              { t: "Склад ведётся в тетради", d: "Ткань заканчивается внезапно, фурнитуры не хватает, заказ встаёт.", i: Boxes },
              { t: "Себестоимость считается «на глаз»", d: "Цена выставляется по интуиции, маржа размывается.", i: Wallet },
              { t: "Владелец не видит картину", d: "Чтобы понять прибыль за месяц, нужно неделю собирать данные.", i: PieChart },
            ].map((p) => (
              <div key={p.t} className="rounded-2xl border border-panel-border bg-panel p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 text-rose-300">
                  <p.i className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{p.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="solution" className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Решение
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Tigim показывает, что происходит в цехе прямо сейчас
            </h2>
            <p className="mt-3 text-ink-700">
              Один экран — и видно всё: заказы, этапы, людей, склад, брак и деньги.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {([
              { t: "Контроль всех заказов", d: "Статусы, прогресс, дедлайны и ответственные на одном экране.", i: ClipboardList, c: "brand" },
              { t: "Этапы производства", d: "Kanban-доска: раскрой → пошив → ОТК → упаковка → готово.", i: Workflow, c: "info" },
              { t: "Учёт брака", d: "Кто, когда, на каком этапе — и сколько денег это стоило.", i: ListChecks, c: "warning" },
              { t: "Склад материалов", d: "Остатки ткани и фурнитуры в реальном времени с уведомлениями.", i: Boxes, c: "purple" },
              { t: "Зарплаты и сотрудники", d: "Производительность, нормы и зарплата по каждому работнику.", i: Users, c: "success" },
              { t: "Финансовая аналитика", d: "Выручка, себестоимость, маржа по заказу и по месяцу.", i: BarChart3, c: "brand" },
              { t: "Складская дисциплина", d: "Приход, расход, списание материалов с историей операций.", i: Truck, c: "info" },
              { t: "ИИ-помощник", d: "Спросите простыми словами — система ответит.", i: Sparkles, c: "purple" },
            ] as const).map((f) => (
              <FeatureCard key={f.t} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Для кого
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Подходит швейным цехам любого размера
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Швейные цеха", d: "От 5 до 100 сотрудников", i: Factory },
              { t: "Малые фабрики", d: "Несколько бригад и участков", i: Layers },
              { t: "Производители футболок", d: "Холодок, трикотаж, рибана", i: Shirt },
              { t: "Производители худи", d: "Трёхнитка, футер с начёсом", i: Shirt },
              { t: "Производители школьной формы", d: "Сезонные большие партии", i: ShoppingBag },
              { t: "Локальные бренды одежды", d: "Свои коллекции и постоянные клиенты", i: Sparkles },
            ].map((a) => (
              <div key={a.t} className="flex items-center gap-4 rounded-2xl border border-panel-border bg-panel p-5 shadow-card">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
                  <a.i className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-ink-900">{a.t}</p>
                  <p className="text-sm text-ink-600">{a.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Как работает
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Запуск за 1 день — пользование на годы
            </h2>
          </div>

          <ol className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Добавляете заказ",
              "Распределяете этапы",
              "Следите за производством",
              "Фиксируете брак и расходы",
              "Получаете отчёты и аналитику",
            ].map((step, i) => (
              <li key={step} className="relative rounded-2xl border border-panel-border bg-panel p-5 shadow-card">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-900">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* AI */}
      <section className="border-t border-panel-border bg-gradient-to-br from-panel via-panel-hover to-brand-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> ИИ-помощник
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Спрашивайте систему простыми словами
              </h2>
              <p className="mt-3 max-w-md text-base text-brand-100/85">
                Без сложных отчётов. Просто задайте вопрос — ИИ-помощник Tigim
                посмотрит данные и ответит.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  "Какие заказы опаздывают?",
                  "Сколько ткани осталось?",
                  "Где больше всего брака?",
                  "Сколько прибыли за месяц?",
                ].map((q) => (
                  <li key={q} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10">
                      <Sparkles className="h-3 w-3 text-brand-200" />
                    </span>
                    «{q}»
                  </li>
                ))}
              </ul>
            </div>

            <ChatPreview />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
              Тарифы
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Понятные цены без скрытых платежей
            </h2>
            <p className="mt-3 text-ink-700">
              Выберите тариф под размер вашего цеха. Меняйте в любой момент.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Tigim Start",
                price: "2 000",
                desc: "Для маленьких цехов и старта",
                features: [
                  "До 5 активных заказов",
                  "Базовый учёт заказов",
                  "Dashboard",
                  "Поддержка по email",
                ],
                cta: "Начать",
                highlight: false,
              },
              {
                name: "Tigim Pro",
                price: "7 000",
                desc: "Для активных цехов",
                features: [
                  "Неограниченные заказы",
                  "Склад материалов",
                  "Учёт брака",
                  "Сотрудники и зарплаты",
                  "Финансовая аналитика",
                ],
                cta: "Выбрать Pro",
                highlight: true,
              },
              {
                name: "Tigim Factory",
                price: "от 15 000",
                desc: "Для крупных производств",
                features: [
                  "Несколько участков",
                  "Роли сотрудников",
                  "Расширенная аналитика",
                  "ИИ-помощник Pro",
                  "Индивидуальная настройка",
                ],
                cta: "Связаться",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  p.highlight
                    ? "border-brand-500/40 bg-gradient-to-b from-brand-500/10 to-panel shadow-glow"
                    : "border-panel-border bg-panel shadow-card"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 right-6 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold text-white shadow">
                    Популярный
                  </span>
                )}
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="mt-1 text-sm text-ink-600">{p.desc}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-bold tracking-tight text-ink-900">
                    {p.price}
                  </span>
                  <span className="pb-1 text-sm text-ink-600">сом / мес</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openDemo(`pricing_${p.name.toLowerCase().replace(/\s+/g, "_")}`, p.name)}
                  className={`mt-6 ${p.highlight ? "btn-brand" : "btn-secondary"} w-full justify-center`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-panel-border bg-surface py-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-14 text-center text-white shadow-soft sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Начните контролировать производство уже сегодня
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100/85">
            Подходит для швейных цехов Кыргызстана, Казахстана и СНГ. Запуск —
            один день, обучение — один час.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => openDemo("cta_section_get_demo")}
              className="btn bg-panel px-5 py-3 text-base text-ink-900 hover:bg-panel-muted"
            >
              Получить демо
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/app"
              onClick={() => track("cta_clicked", { source: "cta_section_open_app" })}
              className="btn bg-white/10 px-5 py-3 text-base text-white backdrop-blur hover:bg-white/15"
            >
              Зайти в приложение
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-panel-border bg-surface py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
          <div>
            <Link to="/" aria-label="На главную" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-600">
              Контроль швейного производства в одном месте. Кыргызстан → СНГ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
            <a href="#solution" className="text-ink-700 hover:text-ink-900">Возможности</a>
            <a href="#pricing" className="text-ink-700 hover:text-ink-900">Тарифы</a>
            <a href="#how" className="text-ink-700 hover:text-ink-900">Как работает</a>
            <Link to="/login" className="text-ink-700 hover:text-ink-900">Войти</Link>
            <Link to="/terms" className="text-ink-700 hover:text-ink-900">Условия использования</Link>
            <Link to="/privacy" className="text-ink-700 hover:text-ink-900">Конфиденциальность</Link>
            <Link to="/offer" className="text-ink-700 hover:text-ink-900">Публичная оферта</Link>
          </div>
          <p className="text-xs text-ink-600">© {new Date().getFullYear()} Tigim. Все права защищены.</p>
        </div>
      </footer>

      <DemoRequestModal
        open={demo.open}
        onClose={closeDemo}
        source={demo.source}
        tier={demo.tier}
      />
    </div>
  );
}

/* ---------- Helpers ---------- */

function FeatureCard({
  t,
  d,
  i: Icon,
  c,
}: {
  t: string;
  d: string;
  i: React.ComponentType<{ className?: string }>;
  c: "brand" | "info" | "warning" | "purple" | "success";
}) {
  const map: Record<typeof c, string> = {
    brand: "bg-brand-500/15 text-brand-300",
    info: "bg-sky-500/15 text-sky-300",
    warning: "bg-amber-500/15 text-amber-300",
    purple: "bg-violet-500/15 text-violet-300",
    success: "bg-emerald-500/15 text-emerald-300",
  };
  return (
    <div className="group rounded-2xl border border-panel-border bg-panel p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${map[c]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{t}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{d}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-tr from-brand-500/30 via-panel-hover/40 to-teal-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-panel-border bg-panel shadow-soft">
        {/* Browser bar */}
        <div className="flex items-center gap-1.5 border-b border-panel-border bg-panel-muted/80 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 hidden rounded-md bg-panel px-3 py-1 text-[11px] text-ink-600 ring-1 ring-panel-border sm:block">
            tigim.app / dashboard
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-5">
          {/* mini sidebar */}
          <div className="col-span-3 hidden flex-col gap-1.5 sm:flex">
            {["Дашборд","Заказы","Производство","Склад","Брак","Сотрудники","Финансы","ИИ-помощник"].map((l, i) => (
              <div
                key={l}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  i === 0 ? "bg-brand-500/15 font-semibold text-brand-300" : "text-ink-600"
                }`}
              >
                <span className={`h-2 w-2 rounded ${i === 0 ? "bg-brand-500" : "bg-ink-700"}`} />
                {l}
              </div>
            ))}
          </div>

          {/* content */}
          <div className="col-span-12 sm:col-span-9">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { l: "Активные заказы", v: "12", t: "+2" },
                { l: "Прибыль за месяц", v: "980К", t: "+18%" },
                { l: "Брак", v: "1.4%", t: "−0.6" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-panel-border bg-panel p-2.5">
                  <p className="text-[10px] text-ink-600">{s.l}</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">{s.v}</p>
                  <p className="text-[10px] font-semibold text-emerald-300">{s.t}</p>
                </div>
              ))}
            </div>

            {/* fake chart */}
            <div className="mt-3 rounded-lg border border-panel-border bg-panel p-3">
              <p className="text-[10px] font-semibold text-ink-900">Выручка по месяцам</p>
              <svg viewBox="0 0 280 80" className="mt-1 h-20 w-full">
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 L40,52 L80,55 L120,40 L160,35 L200,22 L240,18 L280,12 L280,80 L0,80 Z"
                  fill="url(#g1)"
                />
                <path
                  d="M0,60 L40,52 L80,55 L120,40 L160,35 L200,22 L240,18 L280,12"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* table */}
            <div className="mt-3 overflow-hidden rounded-lg border border-panel-border">
              <div className="grid grid-cols-5 gap-2 bg-panel-muted px-3 py-2 text-[10px] font-semibold uppercase text-ink-600">
                <div className="col-span-2">Заказ</div>
                <div>Этап</div>
                <div>Срок</div>
                <div className="text-right">Прогресс</div>
              </div>
              {[
                { id: "#1045", n: "Футболки холодок", s: "Пошив", d: "28 мая", p: 62 },
                { id: "#1046", n: "Худи oversize", s: "Раскрой", d: "30 мая", p: 28 },
                { id: "#1047", n: "Школьная форма", s: "ОТК", d: "2 июня", p: 86 },
              ].map((r) => (
                <div key={r.id} className="grid grid-cols-5 items-center gap-2 border-t border-panel-border px-3 py-2 text-[11px]">
                  <div className="col-span-2">
                    <p className="font-semibold text-ink-900">{r.id}</p>
                    <p className="text-[10px] text-ink-600">{r.n}</p>
                  </div>
                  <div>
                    <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand-300">{r.s}</span>
                  </div>
                  <div className="text-ink-700">{r.d}</div>
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-panel-muted">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${r.p}%` }} />
                    </div>
                    <span className="tabular-nums text-ink-600">{r.p}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-brand-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-panel text-ink-900 shadow-soft">
        <div className="flex items-center gap-2 border-b border-panel-border bg-panel-muted/80 px-4 py-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Помощник Tigim</p>
            <p className="text-[11px] text-ink-600">Онлайн • отвечает мгновенно</p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-sm text-white">
            Какие заказы могут опоздать?
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-panel-muted px-3 py-2.5 text-sm text-ink-900">
            Сегодня 2 заказа в зоне риска:
            <div className="mt-2 grid gap-1.5">
              <div className="flex items-center justify-between rounded-lg bg-panel px-2.5 py-1.5 text-xs">
                <span className="font-semibold">#1045 Футболки</span>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">+2 дня</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-panel px-2.5 py-1.5 text-xs">
                <span className="font-semibold">#1050 Платья</span>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">риск</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              Рекомендация: добавить 2 швеи на #1045 или перенести часть на вечернюю смену.
            </p>
          </div>
        </div>

        <div className="border-t border-panel-border bg-panel px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-panel-border bg-panel px-3 py-2 text-sm text-ink-600">
            Спросите что-нибудь…
            <span className="ml-auto rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">↑</span>
          </div>
        </div>
      </div>
    </div>
  );
}
