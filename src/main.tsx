import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { initAnalytics } from "./lib/analytics";
import { initSentry, SentryErrorBoundary } from "./lib/sentry";
import "./index.css";

initSentry();
initAnalytics();

function ErrorFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-ink-900">Что-то пошло не так</h1>
        <p className="mt-3 text-sm text-ink-700">
          Произошла непредвиденная ошибка. Мы уже знаем о ней. Попробуй обновить
          страницу. Если не поможет — напиши на{" "}
          <a className="font-semibold text-brand-300" href="mailto:kadyr.b14@gmail.com">
            kadyr.b14@gmail.com
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-brand mt-5"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>
);
