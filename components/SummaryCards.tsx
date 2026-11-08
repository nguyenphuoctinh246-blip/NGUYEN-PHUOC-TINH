import type { Transaction } from "@/lib/types";
import { fmt } from "@/lib/format";

export default function SummaryCards({ transactions }: { transactions: Transaction[] }) {
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
      />
      <StatCard
        title="Tổng chi"
        value={"-" + fmt(exp)}
        count={expenses.length}
        dot="bg-expense"
        color="text-expense"
      />
    </section>
  );
}

function StatCard(props: { title: string; value: string; count: number; dot: string; color: string }) {
  return (
    <div className="card px-[18px] py-5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${props.dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {props.title}
        </span>
      </div>
      <div className={`font-mono text-[22px] leading-[1.1] font-bold ${props.color}`}>{props.value}</div>
      <div className="mt-1.5 text-[11px] text-muted">{props.count} giao dịch</div>
    </div>
  );
}
