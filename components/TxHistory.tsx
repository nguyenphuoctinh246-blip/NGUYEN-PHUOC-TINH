"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { catInfo } from "@/lib/categories";
import { fmt, fmtDate, fmtK } from "@/lib/format";

type Tab = "all" | "expense" | "income";
const TABS: [Tab, string][] = [
  ["all", "Tất cả"],
  ["expense", "Chi tiêu"],
  ["income", "Thu nhập"],
];

export default function TxHistory({
  transactions,
  editingId,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  editingId: string | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => tab === "all" || t.type === tab)
      .filter((t) => !q || `${catInfo(t.category).label} ${t.note}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
  }, [transactions, tab, query]);

  const sum = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  function handleDelete(id: string) {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else setConfirmId(id);
  }

  return (
    <section className="card flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
        <h2 className="card-title">Lịch sử giao dịch</h2>
        <span className="text-[11px] font-medium text-muted">{filtered.length} giao dịch</span>
      </div>

      <div className="flex border-b border-line-light" role="tablist">
        {TABS.map(([key, label]) => {
          const active = tab === key;
          return (
            <button key={key} type="button" role="tab" aria-selected={active} onClick={() => setTab(key)}
              className={`relative cursor-pointer border-none bg-transparent px-4 py-2.5 text-[13px] transition-colors ${
                active
                  ? "font-semibold text-fg after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-[1px] after:bg-accent"
                  : "font-medium text-muted hover:text-fg-2"
              }`}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 border-b border-line-light px-4 py-2.5">
        <input type="search" aria-label="Tìm giao dịch" placeholder="Tìm theo danh mục, ghi chú…" value={query}
          onChange={(e) => setQuery(e.target.value)} className="input-field min-w-0 flex-1 !py-2 text-[13px]" />
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted">Không có giao dịch phù hợp</p>
      ) : (
        <ul className="max-h-[380px] flex-1 overflow-y-auto">
          {filtered.map((t) => {
            const info = catInfo(t.category);
            const isInc = t.type === "income";
            const isEditing = editingId === t.id;
            return (
              <li key={t.id}
                className={`flex items-center gap-2 border-t border-line-light px-4 py-2.5 transition-colors first:border-t-0 hover:bg-surface-alt ${isEditing ? "bg-accent-soft" : ""}`}>
                <span className={`flex size-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px] ${isInc ? "bg-income-soft" : "bg-expense-soft"}`}>
                  {info.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {info.label}{t.note ? ` · ${t.note}` : ""}
                  </div>
                  <div className="mt-px text-[11px] text-muted">{fmtDate(t.date)}</div>
                </div>
                <span title={`${fmt(t.amount)}đ`} className={`shrink-0 font-mono text-[13px] font-semibold ${isInc ? "text-income" : "text-expense"}`}>
                  {(isInc ? "+" : "-") + fmtK(t.amount)}
                </span>
                <button type="button" aria-label="Sửa giao dịch" onClick={() => onEdit(t)}
                  className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted transition-all hover:bg-accent-soft hover:text-accent">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                {confirmId === t.id ? (
                  <button type="button" onClick={() => handleDelete(t.id)} onPointerLeave={() => setConfirmId(null)}
                    className="shrink-0 animate-pop cursor-pointer rounded-md border-none bg-expense px-2.5 py-1 text-[11px] font-semibold text-white">
                    Xóa?
                  </button>
                ) : (
                  <button type="button" aria-label="Xóa giao dịch" onClick={() => handleDelete(t.id)}
                    className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-lg text-muted transition-all hover:bg-expense-soft hover:text-expense">
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-line-light bg-surface-alt px-4 py-2.5 text-[12px]">
        <span className="font-medium text-fg-2">Chênh lệch thu − chi (trong kỳ đang xem)</span>
        <span className={`font-mono font-semibold ${sum >= 0 ? "text-income" : "text-expense"}`}>
          {(sum >= 0 ? "+" : "-") + fmt(Math.abs(sum))}đ
        </span>
      </div>
    </section>
  );
}
