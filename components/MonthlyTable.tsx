"use client";

import { useMemo } from "react";
import type { Transaction } from "@/lib/types";
import { fmt } from "@/lib/format";
import { monthlyTotals } from "@/lib/period";

export default function MonthlyTable({
  transactions,
  year,
  selectedMonth,
  onSelect,
}: {
  transactions: Transaction[];
  year: number;
  selectedMonth: number;
  onSelect: (month: number) => void;
}) {
  const data = useMemo(() => monthlyTotals(transactions, year), [transactions, year]);
  const total = data.reduce((s, d) => ({ inc: s.inc + d.inc, exp: s.exp + d.exp }), { inc: 0, exp: 0 });
  const th = "px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.04em] text-muted uppercase";
  const td = "px-3 py-2.5 text-right font-mono text-[13px] tabular-nums whitespace-nowrap";
  const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + fmt(Math.abs(n));
  const tone = (n: number) => (n > 0 ? "text-income" : n < 0 ? "text-expense" : "text-muted");

  return (
    <section className="card mb-5 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-[18px] pb-3">
        <h2 className="card-title">Báo cáo từng tháng, năm {year}</h2>
        <button type="button" onClick={() => onSelect(0)} aria-pressed={selectedMonth === 0}
          className="cursor-pointer rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg-2 hover:bg-surface-alt">
          Xem cả năm
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-y border-line-light bg-surface-alt">
              <th scope="col" className={`${th} !text-left`}>Tháng</th>
              <th scope="col" className={th}>Thu</th>
              <th scope="col" className={th}>Chi</th>
              <th scope="col" className={th}>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const m = i + 1;
              const bal = d.inc - d.exp;
              const sel = selectedMonth === m;
              return (
                <tr key={m} onClick={() => onSelect(m)}
                  className={`cursor-pointer border-b border-line-light transition-colors hover:bg-surface-alt ${sel ? "bg-accent-soft" : ""}`}>
                  <th scope="row" className="px-3 py-2.5 text-left text-[13px] font-semibold">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(m); }} aria-pressed={sel}
                      className={`cursor-pointer border-none bg-transparent p-0 font-semibold ${sel ? "text-accent" : "text-fg"}`}>
                      Tháng {m}
                    </button>
                    {d.count === 0 && <span className="ml-2 text-[11px] font-normal text-muted">trống</span>}
                  </th>
                  <td className={`${td} ${d.inc ? "text-income" : "text-muted"}`}>{d.inc ? "+" + fmt(d.inc) : "–"}</td>
                  <td className={`${td} ${d.exp ? "text-expense" : "text-muted"}`}>{d.exp ? "-" + fmt(d.exp) : "–"}</td>
                  <td className={`${td} font-semibold ${tone(bal)}`}>{d.count ? signed(bal) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-alt">
              <th scope="row" className="px-3 py-3 text-left text-[13px] font-bold">Cả năm {year}</th>
              <td className={`${td} font-bold text-income`}>+{fmt(total.inc)}</td>
              <td className={`${td} font-bold text-expense`}>-{fmt(total.exp)}</td>
              <td className={`${td} font-bold ${tone(total.inc - total.exp)}`}>{signed(total.inc - total.exp)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
