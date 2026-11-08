"use client";

import { fmt } from "@/lib/format";
import { groupSum } from "@/lib/stats";
import { useApp } from "../app/AppContext";
import BalanceTrend from "../BalanceTrend";
import BreakdownChart from "../BreakdownChart";
import MonthlyChart from "../MonthlyChart";
import MonthlyTable from "../MonthlyTable";
import { Card } from "../ui";

function RankList({ rows, color }: { rows: { label: string; amount: number }[]; color: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-[13px] text-muted">Chưa có dữ liệu trong kỳ này.</p>;
  const max = rows[0].amount;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]"><span className="truncate font-medium">{r.label}</span><span className="shrink-0 font-mono text-xs text-fg-2">{fmt(r.amount)}đ</span></div>
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-alt"><div className="h-full rounded-[3px]" style={{ width: `${Math.max((r.amount / max) * 100, 3)}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Reports() {
  const { s, period, setPeriod, inView } = useApp();
  const exp = inView.filter((t) => t.type === "expense");
  const payees = groupSum(exp, (t) => t.payee || null).slice(0, 8).map((g) => ({ label: g.key, amount: g.amount }));
  const accounts = groupSum(exp, (t) => t.account).map((g) => ({ label: s.accounts.find((a) => a.id === g.key)?.name ?? g.key, amount: g.amount }));
  const tags = groupSum(exp.flatMap((t) => t.tags.map((g) => ({ ...t, note: g }))), (t) => t.note).slice(0, 8).map((g) => ({ label: "#" + g.key, amount: g.amount }));
  const select = (month: number) => setPeriod({ ...period, month });

  return (
    <div className="flex flex-col gap-4">
      <MonthlyChart transactions={s.tx} year={period.year} selectedMonth={period.month} onSelect={select} />
      <MonthlyTable transactions={s.tx} year={period.year} selectedMonth={period.month} onSelect={select} />
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownChart transactions={inView} type="expense" />
        <BreakdownChart transactions={inView} type="income" />
      </div>
      <BalanceTrend transactions={inView} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Chi nhiều nhất tại" icon="bank" color={1}><RankList rows={payees} color="var(--cat-1)" /></Card>
        <Card title="Chi theo tài khoản" icon="wallet" color={3}><RankList rows={accounts} color="var(--cat-3)" /></Card>
        <Card title="Chi theo nhãn" icon="tag" color={7}><RankList rows={tags} color="var(--cat-7)" /></Card>
      </div>
    </div>
  );
}
