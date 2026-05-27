import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "../ui/Logo";
import type { ReactNode } from "react";

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

export default function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-ink-900">
      <header className="border-b border-panel-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="На главную">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> На главную
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-600">Редакция от {updatedAt}</p>

        <div className="legal mt-8 space-y-5 text-[15px] leading-relaxed text-ink-800">
          {children}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-panel-border pt-6 text-xs text-ink-600">
          <Link to="/terms" className="hover:text-ink-900">Условия использования</Link>
          <Link to="/privacy" className="hover:text-ink-900">Политика конфиденциальности</Link>
          <Link to="/offer" className="hover:text-ink-900">Публичная оферта</Link>
          <span className="ml-auto">© {new Date().getFullYear()} Tigim</span>
        </div>
      </main>

      {/* legal-prose styles */}
      <style>{`
        .legal h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #F1F5F9;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }
        .legal h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #E2E8F0;
          margin-top: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .legal p { margin: 0; }
        .legal ul {
          padding-left: 1.25rem;
          list-style: disc;
        }
        .legal ul li { margin: 0.25rem 0; }
        .legal ol {
          padding-left: 1.5rem;
          list-style: decimal;
        }
        .legal ol li { margin: 0.25rem 0; }
        .legal strong { color: #F1F5F9; font-weight: 600; }
        .legal code {
          background: rgba(255,255,255,0.05);
          padding: 0.1em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .legal .placeholder {
          background: rgba(245, 158, 11, 0.1);
          border: 1px dashed rgba(245, 158, 11, 0.4);
          padding: 0.6rem 0.9rem;
          border-radius: 8px;
          color: #FBBF24;
          font-size: 0.85em;
          margin: 0.75rem 0;
        }
      `}</style>
    </div>
  );
}
