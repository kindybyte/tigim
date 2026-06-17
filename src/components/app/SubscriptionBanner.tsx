// Банер о статусе подписки. Показывается на дашборде если trial скоро кончится,
// или подписка истекает, или уже истекла. WhatsApp-кнопка с предзаполненным
// сообщением — основная конверсия в платёж.

import { AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { daysUntil, PLAN_LABEL, PLANS } from "../../lib/plans";

// WhatsApp владельца Tigim. Сюда падают все «хочу оплатить».
const OWNER_WHATSAPP = "996997448778";

function buildPayMessage(companyName: string, plan: string): string {
  return `Здравствуйте! Цех «${companyName}» хочет оплатить тариф ${plan}. Подскажите как лучше провести оплату.`;
}

export default function SubscriptionBanner() {
  const { company } = useAuth();
  if (!company) return null;

  const status = company.subscriptionStatus;
  const targetDate = company.paidUntil ?? company.trialEndsAt;
  const dleft = daysUntil(targetDate);

  // Не показываем если оплачено и до конца ещё далеко.
  if (status === "active" && dleft > 7) return null;
  if (status === "cancelled") return null;

  const isUrgent = dleft <= 3;
  const isExpired = dleft < 0 || status === "expired" || status === "past_due";

  // На какой тариф предлагаем перейти. Если уже на платном — тот же.
  // Иначе предлагаем Pro как самый ходовой.
  const planToPay = company.plan === "trial" ? "pro" : company.plan;
  const planInfo = PLANS[planToPay];

  const waUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(
    buildPayMessage(company.name, planInfo.name),
  )}`;

  let bgClass: string;
  let iconClass: string;
  let title: string;
  let description: string;

  if (isExpired) {
    bgClass = "border-rose-500/40 bg-rose-500/10";
    iconClass = "bg-rose-500/20 text-rose-300";
    title = "Подписка истекла";
    description = `Доступ к данным ограничен. Оплатите тариф ${PLAN_LABEL[planToPay]} чтобы продолжить работу.`;
  } else if (status === "trial") {
    bgClass = isUrgent
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-brand-500/30 bg-brand-500/10";
    iconClass = isUrgent
      ? "bg-amber-500/20 text-amber-300"
      : "bg-brand-500/20 text-brand-300";
    title =
      dleft > 0
        ? `Trial: осталось ${dleft} ${dayWord(dleft)}`
        : "Trial заканчивается сегодня";
    description =
      "После пробного периода данные останутся, но новые заказы добавлять будет нельзя без оплаты.";
  } else {
    // active, скоро закончится
    bgClass = "border-amber-500/40 bg-amber-500/10";
    iconClass = "bg-amber-500/20 text-amber-300";
    title = `Подписка истекает через ${dleft} ${dayWord(dleft)}`;
    description = `Тариф ${PLAN_LABEL[company.plan]}. Продлите чтобы не терять доступ.`;
  }

  return (
    <div className={`mb-6 rounded-2xl border p-4 sm:p-5 ${bgClass}`}>
      <div className="flex flex-wrap items-start gap-4">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>
          {isExpired ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-0.5 text-xs text-ink-700">{description}</p>
          <p className="mt-2 text-[11px] text-ink-600">
            {PLAN_LABEL[planToPay]} — {planInfo.monthlyPrice.toLocaleString("ru-RU")} сом/мес
          </p>
        </div>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand"
        >
          <MessageCircle className="h-4 w-4" /> Оплатить через WhatsApp
        </a>
      </div>
    </div>
  );
}

function dayWord(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}
