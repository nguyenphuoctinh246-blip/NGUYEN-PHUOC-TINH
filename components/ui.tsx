"use client";

import { useEffect, useRef } from "react";
import Icon, { type IconName } from "./Icon";

/** Ô biểu tượng nền nhạt cùng tông màu (color = số 1..12 của biến --cat-N) */
export function Chip({ icon, color, size = "md" }: { icon: IconName; color: number; size?: "sm" | "md" }) {
  const c = `var(--cat-${color})`;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-[10px] ${size === "sm" ? "size-7" : "size-9"}`} style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>
      <Icon name={icon} className={size === "sm" ? "size-4" : "size-[18px]"} />
    </span>
  );
}

/** Tiêu đề thẻ kèm ô biểu tượng màu */
export function CardTitle({ icon, color, children }: { icon: IconName; color: number; children: React.ReactNode }) {
  return (
    <h2 className="card-title flex items-center gap-2.5">
      <Chip icon={icon} color={color} size="sm" />
      {children}
    </h2>
  );
}

export function Card({ title, icon, color = 1, action, children, className = "" }: { title?: string; icon?: IconName; color?: number; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card min-w-0 px-4 py-[18px] ${className}`}>
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-2">
          {title && (icon ? <CardTitle icon={icon} color={color}>{title}</CardTitle> : <h2 className="card-title">{title}</h2>)}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Progress({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "income" | "expense" | "warn" | "brand" }) {
  const bg = { accent: "bg-accent", income: "bg-income", expense: "bg-expense", warn: "bg-warn", brand: "bg-gradient-to-r from-brand-from to-income" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${bg}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </div>
  );
}

export function Pill({ tone, children }: { tone: "income" | "expense" | "warn" | "muted"; children: React.ReactNode }) {
  const c = { income: "bg-income-soft text-income", expense: "bg-expense-soft text-expense", warn: "bg-warn-soft text-warn", muted: "bg-surface-alt text-fg-2" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>;
}

export function Button({ variant = "secondary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-accent text-white border-transparent hover:opacity-90",
    secondary: "bg-surface text-fg border-line hover:bg-surface-alt",
    danger: "bg-expense text-white border-transparent hover:opacity-90",
    ghost: "bg-transparent text-fg-2 border-transparent hover:bg-surface-alt",
  }[variant];
  return <button type="button" {...p} className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="input-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Hộp thoại: đóng bằng Esc, bấm nền hoặc nút ×; focus vào trường đầu tiên khi mở */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92vh] w-full animate-pop flex-col overflow-hidden rounded-t-2xl border border-line-light bg-surface shadow-pop sm:rounded-2xl ${wide ? "sm:max-w-xl" : "sm:max-w-md"}`}>
        <div className="flex items-center justify-between border-b border-line-light px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-surface-alt">
            <Icon name="x" className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, title, hint, action }: { icon: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-muted">{hint}</p>}
      {action}
    </div>
  );
}
