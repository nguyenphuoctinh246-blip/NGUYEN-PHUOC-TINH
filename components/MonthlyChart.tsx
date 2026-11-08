"use client";

import { useMemo, useRef, useState } from "react";
import type { Transaction } from "@/lib/types";
import { fmt, fmtK } from "@/lib/format";
import { monthlyTotals } from "@/lib/period";

type Kind = "inc" | "exp";
interface Tip { x: number; y: number; month: number; kind: Kind; val: number }

const W = 720;
const H = 270;
const PAD = { t: 12, r: 16, b: 34, l: 54 };

export default function MonthlyChart({
  transactions,
  year,
  selectedMonth,
  onSelect,
}: {
  transactions: Transaction[];
  year: number;
  /** 0 = cả năm */
  selectedMonth: number;
  onSelect: (month: number) => void;
}) {
  const [hover, setHover] = useState<{ m: number; kind: Kind } | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => monthlyTotals(transactions, year), [transactions, year]);
  const maxVal = Math.max(...data.map((m) => Math.max(m.inc, m.exp)), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil(maxVal / mag) * mag;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const groupW = plotW / 12;
  const barW = Math.min(16, groupW * 0.32);
  const gap = 3;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);
  const hasAny = data.some((m) => m.inc || m.exp);

  function move(e: React.PointerEvent, m: number, kind: Kind, val: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ m, kind });
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, month: m, kind, val });
  }
  const clear = () => { setHover(null); setTip(null); };
  const dim = (m: number, kind: Kind) => (hover && !(hover.m === m && hover.kind === kind) ? 0.35 : 1);

  return (
    <section className="card min-w-0 px-4 py-[18px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title">Thu chi theo tháng, năm {year}</h2>
        <div className="flex gap-3.5 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-1 w-2.5 rounded-sm bg-income" />Thu</span>
          <span className="flex items-center gap-1"><span className="inline-block h-1 w-2.5 rounded-sm bg-expense" />Chi</span>
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" onPointerLeave={clear} role="img" aria-label={`Biểu đồ thu chi 12 tháng năm ${year}`}>
          {ticks.map((v, i) => {
            const y = PAD.t + plotH - (v / niceMax) * plotH;
            return (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--line-light)" />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize={11} className="font-mono tabular-nums">{fmtK(v)}</text>
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="var(--line)" />

          {data.map((d, i) => {
            const m = i + 1;
            const x0 = PAD.l + groupW * i;
            const cx = x0 + groupW / 2;
            const incH = (d.inc / niceMax) * plotH;
            const expH = (d.exp / niceMax) * plotH;
            const rx = Math.min(3, barW / 2);
            const selected = selectedMonth === m;
            return (
              <g key={m}>
                {selected && <rect x={x0 + 2} y={PAD.t} width={groupW - 4} height={plotH + 24} rx={6} fill="var(--accent-soft)" />}
                {d.inc > 0 && (
                  <rect x={cx - barW - gap / 2} y={PAD.t + plotH - incH} width={barW} height={Math.max(incH, 1)} rx={rx}
                    fill="var(--income)" opacity={dim(m, "inc")} className="transition-opacity duration-150"
                    onPointerMove={(e) => move(e, m, "inc", d.inc)} />
                )}
                {d.exp > 0 && (
                  <rect x={cx + gap / 2} y={PAD.t + plotH - expH} width={barW} height={Math.max(expH, 1)} rx={rx}
                    fill="var(--expense)" opacity={dim(m, "exp")} className="transition-opacity duration-150"
                    onPointerMove={(e) => move(e, m, "exp", d.exp)} />
                )}
                <text x={cx} y={H - 12} textAnchor="middle" fontSize={12} fontWeight={selected ? 700 : 500}
                  fill={selected ? "var(--accent)" : "var(--muted)"}>T{m}</text>
                {/* vùng bấm chọn tháng */}
                <rect x={x0} y={PAD.t} width={groupW} height={plotH + 28} fill="transparent" className="cursor-pointer"
                  role="button" tabIndex={0} aria-label={`Xem tháng ${m}`}
                  onClick={() => onSelect(m)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m); } }}
                  onPointerMove={(e) => { if (!d.inc && !d.exp) clear(); else if (!hover || hover.m !== m) move(e, m, d.inc >= d.exp ? "inc" : "exp", d.inc >= d.exp ? d.inc : d.exp); }} />
              </g>
            );
          })}
        </svg>

        {!hasAny && (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-[13px] text-muted">Năm {year} chưa có giao dịch</p>
        )}

        {tip && (
          <div className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-pop"
            style={{ left: Math.min(Math.max(tip.x - 50, 0), (wrapRef.current?.clientWidth ?? 600) - 150), top: Math.max(tip.y - 64, 0) }}>
            <div className="mb-0.5 font-semibold">Tháng {tip.month}/{year}</div>
            <div className={`font-mono font-semibold ${tip.kind === "inc" ? "text-income" : "text-expense"}`}>
              {(tip.kind === "inc" ? "Thu: +" : "Chi: -") + fmt(tip.val)}đ
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted">Bấm vào một tháng để xem báo cáo chi tiết của tháng đó.</p>
    </section>
  );
}
