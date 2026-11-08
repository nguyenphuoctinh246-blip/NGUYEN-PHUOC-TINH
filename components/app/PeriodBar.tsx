"use client";

import { nextPeriod, prevPeriod, yearOptions } from "@/lib/period";
import { useApp } from "./AppContext";
import Icon from "../Icon";

const arrow = "flex size-9 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-fg-2 transition-colors hover:bg-surface-alt";

export default function PeriodBar() {
  const { s, period, setPeriod } = useApp();
  const years = yearOptions(s.tx, period.year);
  const now = new Date();
  const isNow = period.year === now.getFullYear() && period.month === now.getMonth() + 1;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn kỳ báo cáo">
      <button type="button" className={arrow} aria-label={period.month ? "Tháng trước" : "Năm trước"} onClick={() => setPeriod(prevPeriod(period))}>
        <Icon name="left" className="size-4" />
      </button>
      <select aria-label="Tháng" value={period.month} onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
        className="input-field !w-auto !py-2 text-[13px] font-semibold">
        <option value={0}>Cả năm</option>
        {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>Tháng {i + 1}</option>))}
      </select>
      <select aria-label="Năm" value={period.year} onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
        className="input-field !w-auto !py-2 font-mono text-[13px] font-semibold">
        {years.map((y) => (<option key={y} value={y}>{y}</option>))}
      </select>
      <button type="button" className={arrow} aria-label={period.month ? "Tháng sau" : "Năm sau"} onClick={() => setPeriod(nextPeriod(period))}>
        <Icon name="right" className="size-4" />
      </button>
      {!isNow && (
        <button type="button" onClick={() => setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 })}
          className="h-9 cursor-pointer rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-accent hover:bg-surface-alt">
          Tháng này
        </button>
      )}
    </div>
  );
}
