"use client";

import { useState } from "react";
import type { Transaction, TxType } from "@/lib/types";
import { catColor, catInfo } from "@/lib/categories";
import { fmt } from "@/lib/format";

const COPY: Record<TxType, { title: string; empty: string; total: string; color: string }> = {
  expense: { title: "Phân bổ chi tiêu", empty: "Chưa có dữ liệu chi tiêu", total: "Tổng chi tiêu", color: "text-expense" },
  income: { title: "Nguồn thu nhập", empty: "Chưa có dữ liệu thu nhập", total: "Tổng thu nhập", color: "text-income" },
};

/** Segmented bar + ranked horizontal bars per category. */
export default function BreakdownChart({ transactions, type }: { transactions: Transaction[]; type: TxType }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const copy = COPY[type];
  const items = transactions.filter((t) => t.type === type);
  const total = items.reduce((s, t) => s + t.amount, 0);

  if (total === 0) {
    return (
      <section className="card min-w-0 px-4 py-[18px]">
        <h2 className="card-title">{copy.title}</h2>
        <p className="py-8 text-center text-[13px] text-muted">{copy.empty}</p>
      </section>
    );
  }

  const byCat = new Map<string, number>();
  items.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
  const sorted = [...byCat.entries()]
    .map(([id, amount]) => ({ id, amount, info: catInfo(id), pct: (amount / total) * 100 }))
    .sort((a, b) => b.amount - a.amount);
  const maxAmt = sorted[0].amount;

  const hoverProps = (id: string) => ({
    onPointerEnter: () => setHovered(id),
    onPointerLeave: () => setHovered(null),
  });

  return (
    <section className="card min-w-0 px-4 py-[18px]">
      <h2 className="card-title mb-3.5">{copy.title}</h2>

      <div className="mb-[18px] flex h-2 gap-0.5 overflow-hidden rounded bg-surface-alt">
        {sorted.map((c) => (
          <div
            key={c.id}
            {...hoverProps(c.id)}
            className="rounded-xs transition-opacity duration-150"
            style={{ flex: c.pct, background: catColor(c.id), opacity: hovered && hovered !== c.id ? 0.25 : 1 }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {sorted.map((c) => {
          const isH = hovered === c.id;
          return (
            <li
              key={c.id}
              {...hoverProps(c.id)}
              className={`transition-opacity duration-150 ${hovered && !isH ? "opacity-35" : ""}`}
            >
              <div className="mb-[3px] flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
                  <span className="text-sm">{c.info.icon}</span>
                  {c.info.label}
                </span>
                <span className={`font-mono text-xs font-medium transition-colors ${isH ? "text-fg" : "text-fg-2"}`}>
                  {fmt(c.amount)}đ · {c.pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-alt">
                <div
                  className="h-full rounded-[3px] transition-[width] duration-400 ease-out"
                  style={{ width: `${Math.max((c.amount / maxAmt) * 100, 3)}%`, background: catColor(c.id) }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 flex items-center justify-between border-t border-line-light pt-3">
        <span className="text-[13px] font-semibold text-fg-2">{copy.total}</span>
        <span className={`font-mono text-sm font-bold ${copy.color}`}>{fmt(total)}đ</span>
      </div>
    </section>
  );
}
