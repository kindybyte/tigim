import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padding?: boolean;
}

export default function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
  padding = true,
}: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            {title && <h3 className="section-title text-base">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-600">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`${padding ? "p-5" : ""} ${bodyClassName}`}>{children}</div>
    </div>
  );
}
