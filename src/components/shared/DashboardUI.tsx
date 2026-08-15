import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/Icon";

type StatusTone = "brand" | "gold" | "info" | "success" | "danger" | "neutral";

const STATUS_TONES: Record<StatusTone, string> = {
  brand: "border-brand-200 bg-brand-50 text-brand-700",
  gold: "border-moon-100 bg-moon-50 text-moon-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

export function DashboardPageHeader({
  iconName,
  title,
  description,
  meta,
  actions,
  className,
}: {
  iconName: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white text-brand-600 shadow-sm">
          <Icon name={iconName} size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-lg font-extrabold text-brand-950 sm:text-xl">{title}</h1>
            {meta && <span className="text-xs font-medium text-slate-400">{meta}</span>}
          </div>
          {description && <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function DashboardPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-brand-100/80 bg-white shadow-[0_8px_28px_rgba(45,27,105,0.055)]", className)}>
      {children}
    </section>
  );
}

export function DashboardStatusBadge({
  children,
  tone = "neutral",
  live = false,
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  live?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold", STATUS_TONES[tone], className)}>
      {live && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
      {children}
    </span>
  );
}

export function DashboardEmptyState({
  iconName,
  title,
  description,
  className,
}: {
  iconName: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-brand-200 bg-white/75 px-5 py-14 text-center", className)}>
      <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">
        <Icon name={iconName} size={23} />
      </span>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
}

export function DashboardFilterPill({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-[0_5px_14px_rgba(104,73,216,0.2)]"
          : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
