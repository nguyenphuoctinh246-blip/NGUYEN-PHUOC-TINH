import type { Transaction } from "@/lib/types";
import { fmt } from "@/lib/format";
import { CardTitle } from "./ui";

const W = 900;
const H = 170;
const PAD = { l: 10, r: 10, t: 16, b: 16 };

export default function BalanceTrend({ transactions }: { transactions: Transaction[] }) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  let running = 0;
  const points = sorted.map((t) => (running += t.type === "income" ? t.amount : -t.amount));

  const minB = Math.min(...points);
  const maxB = Math.max(...points);
  const range = maxB - minB || 1;
  const pW = W - PAD.l - PAD.r;
  const pH = H - PAD.t - PAD.b;
  const yOf = (v: number) => PAD.t + pH - ((v - minB) / range) * pH;

  const xy = points.map((b, i) => ({ x: PAD.l + (i / (points.length - 1)) * pW, y: yOf(b) }));
  const line = "M" + xy.map((p) => `${p.x},${p.y}`).join("L");
  const base = PAD.t + pH;
  const area = `${line}L${xy[xy.length - 1].x},${base}L${xy[0].x},${base}Z`;
  const last = xy[xy.length - 1];
  const final = points[points.length - 1];
  const color = final >= 0 ? "var(--income)" : "var(--expense)";

  return (
    <section className="card min-w-0 px-4 py-[18px]">
      <div className="mb-2.5 flex items-center justify-between">
        <CardTitle icon="trend" color={9}>Biến động số dư trong kỳ</CardTitle>
        <span className="font-mono text-[13px] font-semibold" style={{ color }}>
          {(final >= 0 ? "+" : "") + fmt(final)}đ
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Biểu đồ biến động số dư">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {minB < 0 && maxB > 0 && (
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke="var(--line)" strokeDasharray="4,3" />
        )}
        <path d={area} fill="url(#areaGrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
      </svg>
    </section>
  );
}
