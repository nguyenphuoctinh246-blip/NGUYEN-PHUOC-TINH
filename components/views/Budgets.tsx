"use client";

import { useState } from "react";
import { budgetRows, statusTone } from "@/lib/budget";
import { CATEGORIES, catInfo } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { periodLabel, totals } from "@/lib/period";
import { useApp } from "../app/AppContext";
import { Card, Pill, Progress } from "../ui";

function LimitInput({ cat, value, onSave }: { cat: string; value: number; onSave: (n: number) => void }) {
  const [text, setText] = useState(value ? fmt(value) : "");
  const [prev, setPrev] = useState(value);
  if (value !== prev) { setPrev(value); setText(value ? fmt(value) : ""); }
  return (
    <div className="relative w-full sm:w-[150px]">
      <input aria-label={`Hạn mức mỗi tháng cho ${catInfo(cat).label}`} inputMode="numeric" placeholder="Chưa đặt" value={text}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 11); setText(d ? fmt(parseInt(d, 10)) : ""); }}
        onBlur={() => onSave(parseInt(text.replace(/\D/g, "") || "0", 10))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="input-field !py-1.5 pr-7 text-right font-mono text-[13px]" />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted">đ</span>
    </div>
  );
}

const STATUS: Record<string, { label: string; tone: "income" | "warn" | "expense" | "muted" }> = {
  ok: { label: "Trong mức", tone: "income" }, warn: { label: "Sắp hết", tone: "warn" }, over: { label: "Vượt mức", tone: "expense" }, none: { label: "Chưa đặt", tone: "muted" },
};

export default function Budgets() {
  const { s, period, inView } = useApp();
  const factor = period.month ? 1 : 12;
  const rows = budgetRows(s.budgets, inView, factor);
  const byCat = new Map(rows.map((r) => [r.cat, r]));
  const budgeted = rows.filter((r) => r.limit > 0);
  const limitTotal = budgeted.reduce((a, r) => a + r.limit, 0);
  const spentTotal = budgeted.reduce((a, r) => a + r.spent, 0);
  const left = limitTotal - spentTotal;
  const pct = limitTotal ? (spentTotal / limitTotal) * 100 : 0;
  const tone = pct > 100 ? "expense" : pct >= 80 ? "warn" : "income";
  const inc = totals(inView).inc;
  const monthsShown = period.month ? 1 : 12;

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Ngân sách ${periodLabel(period).toLowerCase()}`}>
        {limitTotal === 0 ? <p className="text-[13px] text-muted">Nhập hạn mức mỗi tháng cho từng danh mục bên dưới để theo dõi mức chi.</p> : (
          <>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Tổng ngân sách</div><div className="font-mono text-xl font-bold">{fmt(limitTotal)}đ</div></div>
              <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Đã chi</div><div className="font-mono text-xl font-bold text-expense">{fmt(spentTotal)}đ</div></div>
              <div><div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{left >= 0 ? "Còn lại" : "Vượt"}</div><div className={`font-mono text-xl font-bold ${left >= 0 ? "text-income" : "text-expense"}`}>{fmt(Math.abs(left))}đ</div></div>
            </div>
            <Progress pct={pct} tone={tone} />
            <p className="mt-1.5 text-xs text-muted">Đã dùng {pct.toFixed(0)}% ngân sách{monthsShown === 12 ? " (hạn mức tháng × 12)" : ""}.</p>
          </>
        )}
      </Card>

      <Card title="Hạn mức theo danh mục">
        <p className="mb-3 text-[13px] text-muted">Nhập hạn mức chi mỗi tháng. Bỏ trống hoặc nhập 0 để không đặt ngân sách cho danh mục đó.</p>
        <ul className="flex flex-col divide-y divide-line-light">
          {CATEGORIES.expense.map((c) => {
            const r = byCat.get(c.id) ?? { cat: c.id, limit: 0, spent: 0, pct: 0, status: "none" as const };
            const st = STATUS[r.status];
            return (
              <li key={c.id} className="grid grid-cols-1 gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_150px]">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold">{c.icon} {c.label}</span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  {r.limit > 0 && <Progress pct={r.pct} tone={statusTone(r.status)} />}
                  <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
                    <span>Đã chi <b className="font-mono font-semibold text-fg">{fmt(r.spent)}đ</b></span>
                    {r.limit > 0 && <span>{r.limit - r.spent >= 0 ? "Còn " : "Vượt "}<b className={`font-mono font-semibold ${r.limit - r.spent >= 0 ? "text-income" : "text-expense"}`}>{fmt(Math.abs(r.limit - r.spent))}đ</b></span>}
                  </div>
                </div>
                <LimitInput cat={c.id} value={s.budgets[c.id] ?? 0} onSave={(n) => s.setBudget(c.id, n)} />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Gợi ý phân bổ thu nhập: quy tắc 50/30/20">
        {inc === 0 ? <p className="text-[13px] text-muted">Chưa có thu nhập trong kỳ này để tính gợi ý.</p> : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Nhu cầu thiết yếu", 0.5, "nhà ở, ăn uống, hóa đơn, đi lại"], ["Mong muốn", 0.3, "giải trí, mua sắm, du lịch"], ["Tiết kiệm & đầu tư", 0.2, "quỹ khẩn cấp, mục tiêu, đầu tư"]].map(([name, r, hint]) => (
              <div key={name as string} className="rounded-xl border border-line-light bg-surface-alt px-4 py-3">
                <div className="text-xs font-semibold text-muted">{name as string} · {Math.round((r as number) * 100)}%</div>
                <div className="mt-1 font-mono text-lg font-bold">{fmt(Math.round(inc * (r as number)))}đ</div>
                <div className="text-[11px] text-muted">{hint as string}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
