import type { Transaction } from "@/lib/types";
import { fmt } from "@/lib/format";

function delta(cur: number, prev: number): number | null {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
}

export default function SummaryCards({
  transactions,
  prev,
  prevText,
}: {
  transactions: Transaction[];
  prev: { inc: number; exp: number };
  prevText: string;
}) {
  const incomes = transactions.filter((t) => t.type === "income");
  const expenses = transactions.filter((t) => t.type === "expense");
  const inc = incomes.reduce((s, t) => s + t.amount, 0);
  const exp = expenses.reduce((s, t) => s + t.amount, 0);
  const bal = inc - exp;
  const pct = inc > 0 ? Math.round((exp / inc) * 100) : 0;
  const positive = bal >= 0;

  const label = "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted";

  return (
    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="card relative overflow-hidden px-[18px] py-5">
        <div
          className={`absolute top-0 right-0 size-20 rounded-bl-[80px] opacity-60 ${
            positive ? "bg-income-soft" : "bg-expense-soft"
          }`}
        />
        <div className={`${label} mb-2`}>Số dư</div>
        <div
          className={`font-mono text-[28px] leading-[1.1] font-bold ${
            positive ? "text-income" : "text-expense"
          }`}
        >
          {(positive ? "+" : "") + fmt(bal)}
        </div>
        <div className="mt-1.5 text-[11px] text-muted">đã chi {pct}% thu nhập</div>
      </div>

      <StatCard
        title="Tổng thu"
        value={"+" + fmt(inc)}
        count={incomes.length}
        dot="bg-income"
        color="text-income"
        change={delta(inc, prev.inc)}
        goodWhenUp
        prevText={prevText}
      />
      <StatCard
        title="Tổng chi"
        value={"-" + fmt(exp)}
        count={expenses.length}
        dot="bg-expense"
        color="text-expense"
        change={delta(exp, prev.exp)}
        goodWhenUp={false}
        prevText={prevText}
      />
    </section>
  );
}

function StatCard(props: { title: string; value: string; count: number; dot: string; color: string; change: number | null; goodWhenUp: boolean; prevText: string }) {
  const up = (props.change ?? 0) > 0;
  const good = props.change === 0 ? null : up === props.goodWhenUp;
  return (
    <div className="card px-[18px] py-5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${props.dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {props.title}
        </span>
      </div>
      <div className={`font-mono text-[22px] leading-[1.1] font-bold ${props.color}`}>{props.value}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
        <span>{props.count} giao dịch</span>
        {props.change !== null && (
          <span className={`font-semibold ${good === null ? "" : good ? "text-income" : "text-expense"}`}>
            {props.change > 0 ? "▲" : props.change < 0 ? "▼" : "•"} {Math.abs(props.change)}% so với {props.prevText}
          </span>
        )}
      </div>
    </div>
  );
}
