"use client";

import type { Period } from "@/lib/period";
import { periodLabel } from "@/lib/period";

interface Props {
  period: Period;
  years: number[];
  /** có giao dịch hay không, theo tháng 1..12 của năm đang chọn */
  hasData: boolean[];
  count: number;
  onChange: (p: Period) => void;
}

export default function PeriodPicker({ period, years, hasData, count, onChange }: Props) {
  const idx = years.indexOf(period.year);
  const chip = (active: boolean) =>
    `relative cursor-pointer rounded-lg border px-2 py-2 text-[13px] font-semibold transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-line bg-surface text-fg-2 hover:bg-surface-alt"
    }`;

  return (
    <section className="card z-30 md:sticky md:top-[72px] mb-5 px-4 py-3.5" aria-label="Chọn kỳ báo cáo">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="flex items-center gap-2">
          <label htmlFor="period-year" className="text-xs font-semibold tracking-[0.04em] text-muted uppercase">Năm</label>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Năm trước" disabled={idx >= years.length - 1}
              onClick={() => onChange({ ...period, year: years[idx + 1] })}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-fg-2 hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40">‹</button>
            <select id="period-year" value={period.year} onChange={(e) => onChange({ ...period, year: Number(e.target.value) })}
              className="input-field !w-[96px] !py-2 font-mono font-semibold">
              {years.map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <button type="button" aria-label="Năm sau" disabled={idx <= 0}
              onClick={() => onChange({ ...period, year: years[idx - 1] })}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-fg-2 hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40">›</button>
          </div>
        </div>

        <button type="button" aria-pressed={period.month === 0} onClick={() => onChange({ ...period, month: 0 })} className={`${chip(period.month === 0)} px-4`}>
          Cả năm
        </button>

        <div className="ml-auto text-right">
          <div className="text-sm font-bold">{periodLabel(period)}</div>
          <div className="text-[11px] text-muted">{count} giao dịch</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="group" aria-label="Chọn tháng">
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const active = period.month === m;
          return (
            <button key={m} type="button" aria-pressed={active} onClick={() => onChange({ ...period, month: m })} className={chip(active)}>
              T{m}
              {hasData[i] && !active && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" aria-label="có dữ liệu" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
