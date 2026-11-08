"use client";

import { useMemo, useRef, useState } from "react";
import type { Transaction } from "@/lib/types";
import { fmt, fmtK, monthKey, monthLabel } from "@/lib/format";

type Kind = "inc" | "exp";
interface Tip { x: number; y: number; month: string; kind: Kind; val: number }

const W = 380;
const H = 200;
const PAD = { t: 10, r: 16, b: 36, l: 52 };

export default function MonthlyChart({ transactions }: { transactions: Transaction[] }) {
  const [hovered, setHovered] = useState<{ i: number; kind: Kind } | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      const key = monthKey(d);
      const sum = (type: Transaction["type"]) =>
        transactions.filter((t) => t.type === type && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      return { key, label: monthLabel(d), inc: sum("income"), exp: sum("expense") };
    });
  }, [transactions]);

  const maxVal = Math.max(...months.map((m) => Math.max(m.inc, m.exp)), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil(maxVal / mag) * mag;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const groupW = plotW / months.length;
  const barW = Math.min(18, groupW * 0.32);
  const gap = Math.max(3, barW * 0.15);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);

  const clear = () => {
    setHovered(null);
    setTip(null);
  };

  function move(e: React.PointerEvent, i: number, kind: Kind, val: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({ i, kind });
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, month: months[i].label, kind, val });
  }

  const opacity = (i: number, kind: Kind) => (hovered && !(hovered.i === i && hovered.kind === kind) ? 0.3 : 1);

  return (
    <section className="card px-4 py-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="card-title">Thu chi theo tháng</h2>
        <div className="flex gap-3.5 text-[11px] text-muted">
          <Legend className="bg-income" label="Thu" />
          <Legend className="bg-expense" label="Chi" />
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" onPointerLeave={clear}>
          {ticks.map((v, i) => {
            const y = PAD.t + plotH - (v / niceMax) * plotH;
            return (
              <g key={i}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--line-light)" />
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize={10} className="font-mono tabular-nums">
                  {fmtK(v)}
                </text>
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} stroke="var(--line)" />

          {months.map((m, i) => {
            const cx = PAD.l + groupW * i + groupW / 2;
            const incH = (m.inc / niceMax) * plotH;
            const expH = (m.exp / niceMax) * plotH;
            const rx = Math.min(4, barW / 2);
            return (
              <g key={m.key}>
                {m.inc > 0 && (
                  <rect
                    x={cx - barW - gap / 2}
                    y={PAD.t + plotH - incH}
                    width={barW}
                    height={Math.max(incH, 1)}
                    rx={rx}
                    fill="var(--income)"
                    opacity={opacity(i, "inc")}
                    className="transition-opacity duration-150"
                    onPointerMove={(e) => move(e, i, "inc", m.inc)}
                  />
                )}
                {m.exp > 0 && (
                  <rect
                    x={cx + gap / 2}
                    y={PAD.t + plotH - expH}
                    width={barW}
                    height={Math.max(expH, 1)}
                    rx={rx}
                    fill="var(--expense)"
                    opacity={opacity(i, "exp")}
                    className="transition-opacity duration-150"
                    onPointerMove={(e) => move(e, i, "exp", m.exp)}
                  />
                )}
                <text x={cx} y={H - PAD.b + 18} textAnchor="middle" fill="var(--muted)" fontSize={11} fontWeight={500}>
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>

        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-pop"
            style={{ left: Math.min(tip.x, (wrapRef.current?.clientWidth ?? 380) - 140), top: Math.max(tip.y - 60, 0) }}
          >
            <div className="mb-0.5 font-semibold">{tip.month}</div>
            <div className={`font-mono font-semibold ${tip.kind === "inc" ? "text-income" : "text-expense"}`}>
              {(tip.kind === "inc" ? "Thu: +" : "Chi: -") + fmt(tip.val)}đ
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-1 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
