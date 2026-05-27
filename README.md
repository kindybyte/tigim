<div align="center">

# Tigim

**Контроль швейного производства в одном месте.**

SaaS для швейных цехов Кыргызстана и СНГ. Заказы, этапы производства, склад тканей и фурнитуры, брак, сотрудники, зарплаты, дедлайны и прибыль — в одной системе вместо тетрадей и десяти Excel-файлов.

</div>

---

## ✨ Возможности

- **Дашборд** — общая картина цеха: активные заказы, прибыль, брак, остатки, заказы под риском
- **Заказы** — таблица с фильтрами, страница каждого заказа с этапами, размерной сеткой и финансами
- **Производство** — kanban-доска (Новый → Раскрой → Пошив → ОТК → Упаковка → Готово) с цветовыми статусами
- **Склад** — учёт тканей, фурнитуры и упаковки с порогами «низкого остатка»
- **Брак** — фиксация, причины, потери в деньгах, графики по неделям и сотрудникам
- **Сотрудники** — производительность, нормы, зарплаты, процент брака
- **Финансы** — выручка, себестоимость, маржинальность, экспорт отчётов
- **ИИ-помощник** — чат, который отвечает простым языком («какие заказы могут опоздать?», «где больше всего брака?»)
- **Отчёты** — по периодам, заказам, сотрудникам, складу, финансам (Excel/PDF)
- **Настройки** — компания, пользователи, роли, уведомления, интеграции

## 🎨 Дизайн

- Тёмная B2B SaaS-эстетика (deep navy `#0A1628` + bright blue `#2563EB` + cyan accents)
- Все экраны на русском, адаптивная вёрстка для desktop и mobile
- Кастомные SVG-графики (без recharts), `lucide-react` для иконок

## 🛠 Стек

| Слой | Технология |
|---|---|
| UI | React 18 + TypeScript |
| Сборка | Vite 5 |
| Стили | Tailwind CSS 3 |
| Роутинг | react-router-dom 6 |
| Иконки | lucide-react |
| Данные (сейчас) | mock в `src/data/mockData.ts` |
| Данные (план) | Supabase (Postgres + Auth + Storage + Realtime) |
| Хостинг (план) | Vercel |

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Дев-сервер на http://localhost:5173
npm run dev

# Production-сборка в ./dist
npm run build

# Локальный preview production-сборки
npm run preview
```

Требуется **Node.js 18+** (рекомендуется 20).

## 📁 Структура проекта

```
Tigim/
├── public/                      # статические ассеты (favicon)
├── src/
│   ├── App.tsx                  # роутер и корневой layout
│   ├── main.tsx                 # точка входа
│   ├── index.css                # Tailwind + базовые компоненты (btn, card, input)
│   ├── types.ts                 # доменные типы (Order, Material, Defect, ...)
│   ├── data/
│   │   └── mockData.ts          # mock-данные швейного цеха
│   ├── components/
│   │   ├── app/                 # AppLayout, Sidebar, Topbar
│   │   ├── ui/                  # Card, Badge, StatCard, Avatar, ProgressBar, EmptyState, Logo, PageHeader
│   │   └── charts/              # LineChart, BarChart, DonutChart (custom SVG)
│   └── pages/                   # 13 страниц приложения
│       ├── Landing.tsx          # публичный лендинг
│       ├── Login.tsx
│       ├── Dashboard.tsx
│       ├── Orders.tsx
│       ├── OrderDetails.tsx
│       ├── Production.tsx       # kanban
│       ├── Warehouse.tsx
│       ├── Defects.tsx
│       ├── Employees.tsx
│       ├── Finance.tsx
│       ├── AIAssistant.tsx      # mock chat
│       ├── Reports.tsx
│       └── Settings.tsx
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig.json
```

## 🗺 Роуты

| Path | Страница |
|---|---|
| `/` | Лендинг |
| `/login` | Авторизация |
| `/app` | Дашборд |
| `/app/orders` | Заказы |
| `/app/orders/:id` | Детали заказа |
| `/app/production` | Канбан производства |
| `/app/warehouse` | Склад |
| `/app/defects` | Брак |
| `/app/employees` | Сотрудники |
| `/app/finance` | Финансы |
| `/app/ai` | ИИ-помощник |
| `/app/reports` | Отчёты |
| `/app/settings` | Настройки |

## 🎯 Дизайн-токены

Основные цвета в `tailwind.config.js`:

| Токен | Hex | Назначение |
|---|---|---|
| `surface` | `#0A1628` | Фон приложения |
| `panel` | `#16243A` | Карточки |
| `panel-hover` | `#1B2B43` | Hover на карточках |
| `panel-border` | `#22324C` | Бордеры, разделители |
| `brand-600` | `#2563EB` | Primary кнопки, логотип |
| `brand-500` | `#3B82F6` | Акценты, focus ring |
| `teal-500` | `#06B6D4` | Вторичный акцент |
| `ink-900` | `#F1F5F9` | Основной текст |
| `ink-600` | `#94A3B8` | Подписи, muted |

## 🛣 Что дальше

Roadmap из 33 шагов от текущего frontend-MVP до production-запуска с подписками для рынка СНГ:

- **A. Полировка**: README, SEO/OG, формы лида, аналитика
- **B. Деплой**: Vercel + custom domain
- **C. Бэкенд**: Supabase (Postgres, Auth, RLS, Storage)
- **D. Реальные данные**: Orders/Production/Warehouse/Defects/Employees CRUD
- **E. AI**: Claude API через Vercel Function + tool calling
- **F. Подписки**: тарифы Start (2 000 сом) / Pro (7 000) / Factory (от 15 000), биллинг через FreedomPay/Stripe
- **G. Готовность**: легал, мониторинг, support, soft launch на пилотных цехах
- **H. После запуска**: Telegram-бот, WhatsApp, мультиязычность, PWA

## 📄 Лицензия

Proprietary — все права защищены. Код проекта не предназначен для копирования и распространения.

---

<div align="center">
<sub>Сделано для швейных цехов Кыргызстана, Казахстана и СНГ.</sub>
</div>
