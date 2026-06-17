// Sentry-инициализация. Активируется только если задан VITE_SENTRY_DSN.
// Без DSN всё no-op — локальная разработка и preview-деплои не шумят.

import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV =
  (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? import.meta.env.MODE;

let initialized = false;

export function initSentry(): void {
  if (initialized || !DSN) return;
  initialized = true;

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Replay и performance отключены — для free tier хватает базовых ошибок.
    // Если включишь — следи за квотой (5k events/мес).
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1, // 10% — компромисс между видимостью и квотой
    // Прячем PII по умолчанию. Email/имя добавятся через setUser() после логина.
    sendDefaultPii: false,
    // Фильтр шума: ChunkLoadError (юзер обновил страницу во время деплоя)
    // и другие неинтересные ошибки.
    ignoreErrors: [
      "ChunkLoadError",
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
    // Source maps — Sentry CLI отдельно загружает их при build, но без
    // плагина у нас будут line-numbers в minified коде. Это ок для MVP.
  });
}

// Вызвать после успешного логина — Sentry сможет привязать ошибки к юзеру.
// НЕ передаём email чтобы не утекали PII в Sentry без VITE_SENTRY_SEND_PII.
export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function captureSentryError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) {
    // В dev — пусть упадёт в console чтобы разработчик увидел.
    if (import.meta.env.DEV) console.error("[sentry-noop]", error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
