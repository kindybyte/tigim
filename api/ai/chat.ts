// Tigim AI assistant — Vercel serverless function (Node runtime, Web-standard handler).
//
// Flow:
//   1. Verify Supabase JWT from Authorization header.
//   2. Resolve the user's company + plan.
//   3. Check today's per-user rate limit (table ai_usage).
//   4. Read a fresh company summary (orders / materials / defects / finance).
//   5. Call Anthropic Messages API with the summary as system context.
//   6. Increment usage counter; return text + remaining quota.
//
// Env required:
//   ANTHROPIC_API_KEY       — secret, NEVER expose to browser
//   ANTHROPIC_MODEL         — optional, defaults to claude-haiku-4-5-20251001
//   SUPABASE_URL            — server-side mirror of VITE_SUPABASE_URL
//   SUPABASE_ANON_KEY       — server-side mirror of VITE_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY — service role; bypasses RLS for company lookup + usage write

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const PLAN_LIMITS: Record<string, number> = {
  trial: 20,
  start: 20,
  pro: 100,
  factory: Number.MAX_SAFE_INTEGER,
};

const DONE_STATUSES = new Set(["Готово", "Отгружено"]);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CompanySummary {
  ordersTotal: number;
  ordersActive: number;
  ordersOverdue: number;
  ordersAtRisk: {
    number: string;
    product: string;
    client: string;
    deadline: string | null;
    status: string;
    progress: number;
    daysLeft: number;
  }[];
  stageBreakdown: Record<string, number>;
  materialsLow: { name: string; stock: number; minStock: number; unit: string }[];
  defectsMonth: { qty: number; loss: number; topReason: string | null; topStage: string | null };
  financeMonth: { revenue: number; profit: number };
  employees: number;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return json({ error: "Метод не поддерживается." }, 405);
    }

    if (!ANTHROPIC_API_KEY) {
      return json(
        { error: "AI-помощник пока не подключён. Администратор не настроил ANTHROPIC_API_KEY." },
        503,
      );
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Сервер не настроен (Supabase env vars)." }, 503);
    }

    // ---- Auth ----
    const auth = req.headers.get("authorization");
    if (!auth?.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Не авторизованы." }, 401);
    }
    const token = auth.slice(7);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Сессия истекла. Войдите снова." }, 401);
    }
    const userId = userData.user.id;
    const userName = (userData.user.user_metadata?.full_name as string | undefined) || null;

    // ---- Admin client (bypasses RLS) ----
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ---- Company ----
    const memberRes = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (memberRes.error || !memberRes.data) {
      return json({ error: "Компания не найдена. Пройдите онбординг." }, 400);
    }
    const companyId = memberRes.data.company_id as string;

    const companyRes = await supabase
      .from("companies")
      .select("name, plan")
      .eq("id", companyId)
      .single();
    if (companyRes.error || !companyRes.data) {
      return json({ error: "Не удалось загрузить компанию." }, 500);
    }
    const companyName = companyRes.data.name as string;
    const plan = (companyRes.data.plan as string) || "trial";
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;

    // ---- Rate limit ----
    const today = new Date().toISOString().slice(0, 10);
    const usageRes = await supabase
      .from("ai_usage")
      .select("messages, tokens_in, tokens_out")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    const usageToday = usageRes.data ?? { messages: 0, tokens_in: 0, tokens_out: 0 };
    if (usageToday.messages >= limit) {
      return json(
        {
          error: `Дневной лимит сообщений (${limit}) исчерпан. Сбросится завтра — или обновите тариф.`,
          usage: { used: usageToday.messages, limit },
        },
        429,
      );
    }

    // ---- Parse body ----
    let body: { messages?: ChatMessage[] } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Некорректный JSON в теле запроса." }, 400);
    }
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages: ChatMessage[] = incoming
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
      .slice(-10);
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return json({ error: "Нужно отправить хотя бы одно сообщение от пользователя." }, 400);
    }

    // ---- Build context + prompt ----
    const summary = await buildCompanySummary(supabase, companyId);
    const systemPrompt = buildSystemPrompt(companyName, plan, userName, summary);

    // ---- Call Anthropic ----
    let aiResp: Response;
    try {
      aiResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });
    } catch {
      return json({ error: "Не удалось связаться с AI-сервисом." }, 502);
    }

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => "");
      console.error("[ai] anthropic error", aiResp.status, errText.slice(0, 500));
      return json({ error: `AI-сервис вернул ошибку (${aiResp.status}).` }, 502);
    }

    const aiData = (await aiResp.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text =
      aiData.content?.find((c) => c.type === "text")?.text?.trim() ||
      "Не получилось сформулировать ответ. Попробуйте задать вопрос иначе.";
    const tokensIn = aiData.usage?.input_tokens ?? 0;
    const tokensOut = aiData.usage?.output_tokens ?? 0;

    // ---- Update usage ----
    await supabase.from("ai_usage").upsert(
      {
        user_id: userId,
        company_id: companyId,
        date: today,
        messages: usageToday.messages + 1,
        tokens_in: usageToday.tokens_in + tokensIn,
        tokens_out: usageToday.tokens_out + tokensOut,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    return json({
      text,
      usage: {
        used: usageToday.messages + 1,
        limit: limit >= Number.MAX_SAFE_INTEGER ? null : limit,
        tokensIn,
        tokensOut,
      },
    });
  } catch (e) {
    console.error("[ai] unhandled", e);
    return json({ error: "Внутренняя ошибка сервера." }, 500);
  }
}

async function buildCompanySummary(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanySummary> {
  const [ordersRes, materialsRes, defectsRes, employeesRes] = await Promise.all([
    supabase
      .from("orders")
      .select("number, product, client, qty, unit_price, unit_cost, status, progress, deadline, created_at")
      .eq("company_id", companyId),
    supabase
      .from("materials")
      .select("name, stock, min_stock, unit, type")
      .eq("company_id", companyId),
    supabase
      .from("defects")
      .select("qty, loss, reason, stage, date")
      .eq("company_id", companyId),
    supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId)
      .neq("status", "fired"),
  ]);

  const orders = (ordersRes.data ?? []) as Array<{
    number: string; product: string; client: string; qty: number;
    unit_price: number | string; unit_cost: number | string;
    status: string; progress: number; deadline: string | null; created_at: string;
  }>;
  const materials = (materialsRes.data ?? []) as Array<{
    name: string; stock: number | string; min_stock: number | string; unit: string; type: string;
  }>;
  const defects = (defectsRes.data ?? []) as Array<{
    qty: number; loss: number | string; reason: string | null; stage: string | null; date: string;
  }>;
  const employees = (employeesRes.data ?? []) as Array<{ id: string }>;

  const toNum = (v: number | string | null | undefined) =>
    v == null ? 0 : typeof v === "string" ? parseFloat(v) : v;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const daysUntil = (iso: string | null) =>
    !iso ? 99 : Math.round((new Date(iso).getTime() - Date.now()) / 86400000);

  const active = orders.filter((o) => !DONE_STATUSES.has(o.status));
  const overdue = active.filter((o) => daysUntil(o.deadline) < 0);

  const stageBreakdown: Record<string, number> = {};
  active.forEach((o) => {
    stageBreakdown[o.status] = (stageBreakdown[o.status] || 0) + 1;
  });

  const ordersAtRisk = active
    .map((o) => ({
      number: o.number,
      product: o.product,
      client: o.client,
      deadline: o.deadline,
      status: o.status,
      progress: o.progress,
      daysLeft: daysUntil(o.deadline),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const materialsLow = materials
    .filter((m) => toNum(m.stock) <= toNum(m.min_stock))
    .map((m) => ({
      name: m.name,
      stock: toNum(m.stock),
      minStock: toNum(m.min_stock),
      unit: m.unit,
    }))
    .slice(0, 10);

  const defectsThisMonth = defects.filter((d) => new Date(d.date) >= monthStart);
  const defectsMonthQty = defectsThisMonth.reduce((s, d) => s + (d.qty || 0), 0);
  const defectsMonthLoss = defectsThisMonth.reduce((s, d) => s + toNum(d.loss), 0);

  const reasonCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  defectsThisMonth.forEach((d) => {
    if (d.reason) reasonCounts[d.reason] = (reasonCounts[d.reason] || 0) + (d.qty || 0);
    if (d.stage) stageCounts[d.stage] = (stageCounts[d.stage] || 0) + (d.qty || 0);
  });

  const monthOrders = orders.filter((o) => new Date(o.created_at) >= monthStart);
  const monthRevenue = monthOrders.reduce(
    (s, o) => s + o.qty * toNum(o.unit_price),
    0,
  );
  const monthProfitGross = monthOrders.reduce(
    (s, o) => s + o.qty * (toNum(o.unit_price) - toNum(o.unit_cost)),
    0,
  );

  return {
    ordersTotal: orders.length,
    ordersActive: active.length,
    ordersOverdue: overdue.length,
    ordersAtRisk,
    stageBreakdown,
    materialsLow,
    defectsMonth: {
      qty: defectsMonthQty,
      loss: defectsMonthLoss,
      topReason: topKey(reasonCounts),
      topStage: topKey(stageCounts),
    },
    financeMonth: {
      revenue: Math.round(monthRevenue),
      profit: Math.round(monthProfitGross - defectsMonthLoss),
    },
    employees: employees.length,
  };
}

function topKey(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function buildSystemPrompt(
  companyName: string,
  plan: string,
  userName: string | null,
  s: CompanySummary,
): string {
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const greetName = userName ? `Имя пользователя: ${userName}.` : "";
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const atRiskBlock =
    s.ordersAtRisk.length === 0
      ? "  • нет активных заказов с дедлайном"
      : s.ordersAtRisk
          .map(
            (o) =>
              `  • #${o.number} «${o.product}» (${o.client}), этап «${o.status}», прогресс ${o.progress}%, дедлайн ${o.deadline || "—"} (${
                o.daysLeft >= 0
                  ? `${o.daysLeft} дн осталось`
                  : `просрочено на ${Math.abs(o.daysLeft)} дн`
              })`,
          )
          .join("\n");

  const stageBlock =
    Object.keys(s.stageBreakdown).length === 0
      ? "  • нет активных заказов"
      : Object.entries(s.stageBreakdown)
          .map(([stage, count]) => `  • ${stage}: ${count}`)
          .join("\n");

  const lowStockBlock =
    s.materialsLow.length === 0
      ? "  • все материалы в норме"
      : s.materialsLow
          .map((m) => `  • ${m.name}: ${fmt(m.stock)} ${m.unit} (минимум ${fmt(m.minStock)} ${m.unit})`)
          .join("\n");

  return `Ты — Tigim AI, помощник в SaaS-приложении для управления швейными цехами (Кыргызстан и СНГ).

Дата: ${today}. Компания: «${companyName}». Тариф: ${plan}. ${greetName}

Отвечай по-русски, кратко и по делу. Используй сомы (KGS) для денег. Если данных для точного ответа нет — честно скажи «пока нет данных», не выдумывай цифры. Не упоминай OpenAI, ChatGPT, Anthropic, Claude или другие AI-бренды — ты Tigim AI.

=== ТЕКУЩЕЕ СОСТОЯНИЕ ЦЕХА ===

ЗАКАЗЫ:
  • Всего: ${s.ordersTotal}
  • Активных (не отгружены): ${s.ordersActive}
  • Просроченных: ${s.ordersOverdue}

Активные заказы по этапам:
${stageBlock}

Топ-5 заказов по приоритету срока:
${atRiskBlock}

СКЛАД (материалы ниже минимума):
${lowStockBlock}

БРАК ЗА ТЕКУЩИЙ МЕСЯЦ:
  • Всего бракованных изделий: ${s.defectsMonth.qty}
  • Финансовые потери: ${fmt(s.defectsMonth.loss)} сом
  • Главная причина: ${s.defectsMonth.topReason || "—"}
  • Чаще всего на этапе: ${s.defectsMonth.topStage || "—"}

ФИНАНСЫ (текущий месяц):
  • Выручка: ${fmt(s.financeMonth.revenue)} сом
  • Прибыль (после вычета брака): ${fmt(s.financeMonth.profit)} сом

КОМАНДА:
  • Активных сотрудников: ${s.employees}

=== ПРАВИЛА ОТВЕТОВ ===

1. Отвечай конкретно — называй номера заказов, имена материалов, цифры из контекста.
2. Если запрашивают список — оформляй маркированным списком.
3. Если видишь риск (просрочки, низкий остаток, рост брака) — предлагай конкретное действие.
4. Длина: 2–6 предложений для простых вопросов, до 10 для аналитики.
5. Не повторяй данные из контекста целиком, отвечай только на вопрос.`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
