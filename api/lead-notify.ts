// Vercel serverless function — отправляет уведомление о новой заявке в Telegram.
// Заявка к этому моменту уже сохранена в Supabase публичным RLS-insert
// из браузера. Эта функция чисто для пуша оповещения владельцу.
//
// Env required:
//   TELEGRAM_BOT_TOKEN  — секрет, от @BotFather
//   TELEGRAM_CHAT_ID    — куда слать (твой личный чат с ботом или группа)

export const config = { maxDuration: 10 };

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

interface LeadNotifyBody {
  name?: string;
  phone?: string;
  email?: string;
  workshopType?: string;
  teamSize?: string;
  tier?: string;
  comment?: string;
  source?: string;
  pageUrl?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMessage(b: LeadNotifyBody): string {
  const lines: string[] = ["🔥 <b>Новая заявка Tigim</b>"];
  if (b.name) lines.push(`👤 <b>Имя:</b> ${escapeHtml(b.name)}`);
  if (b.phone) lines.push(`📞 <b>Телефон:</b> ${escapeHtml(b.phone)}`);
  if (b.email) lines.push(`✉️ <b>Email:</b> ${escapeHtml(b.email)}`);
  if (b.workshopType) lines.push(`🏭 <b>Цех:</b> ${escapeHtml(b.workshopType)}`);
  if (b.teamSize) lines.push(`👥 <b>Команда:</b> ${escapeHtml(b.teamSize)}`);
  if (b.tier) lines.push(`💎 <b>Интересует:</b> ${escapeHtml(b.tier)}`);
  if (b.comment) lines.push(`💬 <b>Комментарий:</b>\n${escapeHtml(b.comment)}`);
  if (b.source) lines.push(`📍 <i>Источник: ${escapeHtml(b.source)}</i>`);
  return lines.join("\n");
}

export async function POST(req: Request): Promise<Response> {
  // Если переменные не настроены — тихо отвечаем OK. Не хотим ронять форму
  // только из-за того что админ не настроил уведомления.
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(
      JSON.stringify({ ok: true, note: "telegram_not_configured" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: LeadNotifyBody;
  try {
    body = (await req.json()) as LeadNotifyBody;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Минимальная валидация против пустых пингов.
  if (!body.name || !body.phone) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_required_fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const text = formatMessage(body);

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!tgRes.ok) {
      const errText = await tgRes.text();
      console.warn("[lead-notify] telegram error:", tgRes.status, errText);
      return new Response(
        JSON.stringify({ ok: false, error: `telegram_${tgRes.status}` }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.warn("[lead-notify] fetch error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "telegram_fetch_failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
