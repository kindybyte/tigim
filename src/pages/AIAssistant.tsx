import { useEffect, useRef, useState } from "react";
import { Plus, Send, Sparkles } from "lucide-react";

import Avatar from "../components/ui/Avatar";
import { formatSom } from "../data/mockData";

interface MiniCard {
  label: string;
  value: string;
  tone?: "brand" | "warning" | "danger" | "success";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  cards?: MiniCard[];
}

const QUICK_QUESTIONS = [
  "Какие заказы могут опоздать?",
  "Сколько ткани нужно на заказ #1045?",
  "Где больше всего брака?",
  "Кто из сотрудников отстаёт?",
  "Сколько мы заработали за этот месяц?",
  "Какие материалы скоро закончатся?",
  "Какой заказ самый прибыльный?",
];

const HISTORY = [
  { id: "c1", title: "Заказы на этой неделе", time: "Сегодня" },
  { id: "c2", title: "Анализ брака за май", time: "Вчера" },
  { id: "c3", title: "Остатки ткани «Холодок»", time: "23 мая" },
  { id: "c4", title: "Производительность бригад", time: "21 мая" },
];

const INITIAL: Message[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Здравствуйте, Айбек! Я — Помощник Tigim. Могу подсказать по заказам, срокам, складу, браку и финансам. Спросите простыми словами.",
    time: "10:42",
  },
];

function answerFor(question: string): Message {
  const q = question.toLowerCase();
  const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  if (q.includes("опозд") || q.includes("заказ") && q.includes("риск")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "Заказ #1045 «Футболка Холодок» может опоздать на 2 дня. Сейчас выполнено 62%, дедлайн 28 мая. Основная задержка на этапе пошива. Рекомендация: добавить 2 швеи на этот заказ или перенести часть работы на вечернюю смену.\n\nЗаказ #1050 «Платье летнее» уже в зоне риска — поставщик задержал ткань. Жду подтверждения.",
      cards: [
        { label: "Заказ #1045", value: "+2 дня", tone: "danger" },
        { label: "Прогресс", value: "62%", tone: "warning" },
        { label: "Заказ #1050", value: "Проблема", tone: "danger" },
      ],
    };
  }
  if (q.includes("ткан") && q.includes("1045")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "На заказ #1045 (1000 футболок «Холодок») нужно примерно 215 кг ткани «Холодок 180». На складе сейчас 120 кг — этого хватит на ~558 шт. Нужно докупить около 95 кг.",
      cards: [
        { label: "Нужно", value: "215 кг", tone: "brand" },
        { label: "На складе", value: "120 кг", tone: "warning" },
        { label: "Дозаказать", value: "95 кг", tone: "danger" },
      ],
    };
  }
  if (q.includes("брак")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "Больше всего брака на этапе «Пошив» — 24 шт за май. Основная причина: «Неровный шов» (15 шт), чаще у швеи Жылдыз К. (16 шт суммарно). Потери: ~17 920 сом.\n\nРекомендация: провести краткий разбор брака с бригадой, проверить настройку машинок.",
      cards: [
        { label: "Этап", value: "Пошив", tone: "warning" },
        { label: "Брак", value: "24 шт", tone: "danger" },
        { label: "Потери", value: formatSom(17920), tone: "danger" },
      ],
    };
  }
  if (q.includes("сотруд") && (q.includes("отста") || q.includes("норму"))) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "Отстают от нормы: Жылдыз К. (80% нормы, высокий процент брака — 3.4%). Швея Айгерим Б. в отпуске. Остальные перевыполняют или у нормы.",
      cards: [
        { label: "Жылдыз К.", value: "80%", tone: "warning" },
        { label: "% брака", value: "3.4%", tone: "danger" },
      ],
    };
  }
  if (q.includes("заработ") || q.includes("прибыл") && q.includes("месяц")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "За май 2026: выручка — 2.39 млн сом, себестоимость — 1.57 млн сом, прибыль — 810 тыс. сом. Это +22% к апрелю.",
      cards: [
        { label: "Выручка", value: "2.39 млн", tone: "brand" },
        { label: "Прибыль", value: "810 тыс.", tone: "success" },
        { label: "К апрелю", value: "+22%", tone: "success" },
      ],
    };
  }
  if (q.includes("материал") && (q.includes("закон") || q.includes("остат"))) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "Скоро закончатся: «Футер 3-нитка» (18 кг, мин. 40), «Рибана» (40 кг, мин. 60), «Нить швейная №40» (35 рул, мин. 50). Рекомендую разместить заказ в ближайшие 2 дня.",
      cards: [
        { label: "Футер 3-нитка", value: "18 кг", tone: "danger" },
        { label: "Рибана", value: "40 кг", tone: "warning" },
        { label: "Нить №40", value: "35 рул", tone: "warning" },
      ],
    };
  }
  if (q.includes("прибыльн")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      time: now,
      text: "Самый прибыльный заказ — #1047 «Школьная форма» (Школа №62): прибыль 238 000 сом, маржа 35%. Рекомендую держать связь с этим клиентом — возможен повтор.",
      cards: [
        { label: "#1047", value: formatSom(238000), tone: "success" },
        { label: "Маржа", value: "35%", tone: "success" },
      ],
    };
  }
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    time: now,
    text: "Принято. На реальной версии я подключусь к вашим данным и точно отвечу. Пока могу показать ответы на типовые вопросы — попробуйте кнопки ниже.",
  };
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text: t, time: now }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, answerFor(t)]);
      setThinking(false);
    }, 700);
  }

  return (
    <div className="animate-fade-in">
      <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* History panel */}
        <aside className="hidden flex-col rounded-2xl border border-panel-border bg-panel shadow-card lg:flex">
          <div className="border-b border-panel-border p-4">
            <button onClick={() => setMessages(INITIAL)} className="btn-brand w-full justify-center">
              <Plus className="h-4 w-4" /> Новый чат
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-600">История</p>
            <ul className="space-y-0.5">
              {HISTORY.map((h, i) => (
                <li key={h.id}>
                  <button className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition ${i === 0 ? "bg-brand-500/15 text-brand-300" : "hover:bg-panel-muted text-ink-700"}`}>
                    <span className="text-sm font-medium leading-tight">{h.title}</span>
                    <span className="mt-0.5 text-[11px] text-ink-600">{h.time}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-panel-border p-4 text-xs text-ink-600">
            <p className="font-semibold text-ink-900">Помощник Tigim</p>
            <p className="mt-1">Mock-режим. Скоро подключим живой AI API.</p>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-panel-border bg-panel shadow-card">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-panel-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">Помощник Tigim</p>
                <p className="text-xs text-ink-600">Задавайте вопросы по заказам, срокам, складу, браку и финансам</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              Онлайн
            </span>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {thinking && (
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-panel-muted px-4 py-3 text-sm text-ink-600">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-slate-400" style={{ animationDelay: "120ms" }} />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-slate-400" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          <div className="border-t border-panel-border px-4 pb-3 pt-3 sm:px-6">
            <div className="mb-2 flex items-center gap-2 text-xs text-ink-600">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              Быстрые вопросы
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-panel-border bg-panel px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-brand-500/30 hover:bg-brand-500/15 hover:text-brand-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-panel-border p-3 sm:p-4"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-panel-border bg-panel p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Напишите сообщение…"
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-ink-600"
              />
              <button type="submit" className="btn-brand h-10 w-10 !p-0" aria-label="Отправить">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-ink-600">
              Tigim AI работает в mock-режиме · ответы основаны на демо-данных
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm leading-relaxed text-white whitespace-pre-line">
            {message.text}
          </div>
          <p className="mt-1 text-right text-[11px] text-ink-600">{message.time}</p>
        </div>
        <Avatar name="Айбек Турдубеков" color="#2563EB" size="sm" />
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="max-w-[88%]">
        <div className="rounded-2xl rounded-tl-sm bg-panel-muted px-4 py-3 text-sm leading-relaxed text-ink-900 whitespace-pre-line">
          {message.text}
          {message.cards && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {message.cards.map((c, i) => (
                <MiniStatCard key={i} {...c} />
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] text-ink-600">{message.time}</p>
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, tone = "brand" }: MiniCard) {
  const map = {
    brand: "bg-brand-500/15 text-brand-300 ring-brand-500/30",
    warning: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    danger: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  };
  return (
    <div className={`rounded-xl px-3 py-2 ring-1 ${map[tone]}`}>
      <p className="text-[11px] font-medium opacity-80">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
