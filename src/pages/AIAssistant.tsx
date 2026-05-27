import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertTriangle, Plus, Send, Sparkles } from "lucide-react";

import Avatar from "../components/ui/Avatar";
import { useAuth } from "../lib/auth";

const QUICK_QUESTIONS = [
  "Какие заказы могут опоздать?",
  "Какие материалы заканчиваются?",
  "Где больше всего брака в этом месяце?",
  "Сколько мы заработали в этом месяце?",
  "На каком этапе сейчас больше всего заказов?",
  "Что мне нужно сделать прямо сейчас?",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

interface UsageInfo {
  used: number;
  limit: number | null;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function firstName(full: string | null | undefined): string {
  if (!full) return "коллега";
  return full.trim().split(/\s+/)[0] || "коллега";
}

export default function AIAssistant() {
  const { user, session, configured, companyId } = useAuth();
  const ready = configured && !!session && !!companyId;

  const greeting = useMemo<Message>(() => {
    const name = firstName(user?.user_metadata?.full_name as string | undefined);
    return {
      id: "m-welcome",
      role: "assistant",
      text: `Здравствуйте, ${name}! Я — Tigim AI. Я вижу ваши заказы, склад, брак и финансы за этот месяц. Спросите что угодно простыми словами.`,
      time: nowTime(),
    };
  }, [user?.user_metadata?.full_name]);

  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset to welcome if user changes
    setMessages([greeting]);
    setError(null);
  }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(rawText: string) {
    const text = rawText.trim();
    if (!text || thinking) return;
    if (!ready || !session) {
      setError("AI-помощник доступен после входа в аккаунт и завершения онбординга.");
      return;
    }

    setError(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, time: nowTime() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setThinking(true);

    try {
      const payload = updated
        .filter((m) => m.id !== "m-welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: payload }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
        usage?: UsageInfo & { tokensIn?: number; tokensOut?: number };
      };

      if (!res.ok) {
        if (data.usage) setUsage({ used: data.usage.used, limit: data.usage.limit });
        setError(data.error || `Ошибка ${res.status}.`);
        return;
      }

      if (data.usage) setUsage({ used: data.usage.used, limit: data.usage.limit });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text || "Пустой ответ от AI.",
          time: nowTime(),
        },
      ]);
    } catch {
      setError("Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setThinking(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function reset() {
    setMessages([greeting]);
    setError(null);
  }

  return (
    <div className="animate-fade-in">
      <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="hidden flex-col rounded-2xl border border-panel-border bg-panel shadow-card lg:flex">
          <div className="border-b border-panel-border p-4">
            <button onClick={reset} className="btn-brand w-full justify-center">
              <Plus className="h-4 w-4" /> Новый чат
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 text-xs text-ink-600">
            <p className="font-semibold uppercase tracking-wider text-[11px] text-ink-600">
              Что я умею
            </p>
            <ul className="mt-3 space-y-2">
              <li>• Подсказывать какие заказы могут опоздать</li>
              <li>• Считать остатки и предупреждать о нехватке</li>
              <li>• Анализировать брак — где, почему, сколько</li>
              <li>• Показывать выручку и прибыль за месяц</li>
              <li>• Подсказывать что сделать прямо сейчас</li>
            </ul>
          </div>
          <div className="border-t border-panel-border p-4 text-xs text-ink-600">
            <p className="font-semibold text-ink-900">Tigim AI</p>
            <p className="mt-1">
              Использует данные вашего цеха. Сохранение истории чата появится позже.
            </p>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-panel-border bg-panel shadow-card">
          <header className="flex items-center justify-between border-b border-panel-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-900">Tigim AI</p>
                <p className="text-xs text-ink-600">
                  Задавайте вопросы по заказам, складу, браку и финансам
                </p>
              </div>
            </div>
            {usage && usage.limit !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  usage.used >= usage.limit
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-emerald-500/15 text-emerald-300"
                }`}
                title="Дневной лимит сообщений на пользователя"
              >
                {usage.used} / {usage.limit} сегодня
              </span>
            )}
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {!ready && (
              <div className="rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30">
                AI-помощник работает только после входа и завершения онбординга. Сейчас вы либо
                не авторизованы, либо ещё не создали компанию.
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} userName={user?.user_metadata?.full_name as string | undefined} />
            ))}
            {thinking && <ThinkingBubble />}
            {error && (
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30">
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          {ready && (
            <div className="border-t border-panel-border px-4 pb-3 pt-3 sm:px-6">
              <div className="mb-2 flex items-center gap-2 text-xs text-ink-600">
                <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                Быстрые вопросы
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => void send(q)}
                    disabled={thinking}
                    className="rounded-full border border-panel-border bg-panel px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-brand-500/30 hover:bg-brand-500/15 hover:text-brand-200 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-panel-border p-3 sm:p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-panel-border bg-panel p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                disabled={!ready || thinking}
                placeholder={ready ? "Напишите сообщение…" : "Войдите чтобы спрашивать"}
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-ink-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!ready || thinking || !input.trim()}
                className="btn-brand h-10 w-10 !p-0 disabled:opacity-50"
                aria-label="Отправить"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-ink-600">
              Tigim AI использует данные вашего цеха · ответы могут содержать ошибки, проверяйте критичное
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ message, userName }: { message: Message; userName?: string }) {
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
        <Avatar name={userName || "Вы"} color="#2563EB" size="sm" />
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
        </div>
        <p className="mt-1 text-[11px] text-ink-600">{message.time}</p>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-panel-muted px-4 py-3 text-sm text-ink-600">
        <span className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-600" />
        <span
          className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-600"
          style={{ animationDelay: "120ms" }}
        />
        <span
          className="h-2 w-2 animate-pulse-soft rounded-full bg-ink-600"
          style={{ animationDelay: "240ms" }}
        />
      </div>
    </div>
  );
}
