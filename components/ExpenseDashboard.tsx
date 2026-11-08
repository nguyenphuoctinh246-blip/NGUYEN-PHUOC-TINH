"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { useTransactions } from "@/hooks/useTransactions";
import { inPeriod, monthlyTotals, prevLabel, prevPeriod, totals, yearsOf, type Period } from "@/lib/period";
import PeriodPicker from "./PeriodPicker";
import SummaryCards from "./SummaryCards";
import BalanceTrend from "./BalanceTrend";
import MonthlyChart from "./MonthlyChart";
import MonthlyTable from "./MonthlyTable";
import BreakdownChart from "./BreakdownChart";
import TxForm from "./TxForm";
import TxHistory from "./TxHistory";
import DataTools from "./DataTools";

const periodOf = (date: string): Period => ({ year: parseInt(date.slice(0, 4), 10), month: parseInt(date.slice(5, 7), 10) });

export default function ExpenseDashboard() {
  const { tx, ready, hasSamples, add, update, remove, addMany, clear } = useTransactions();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [period, setPeriod] = useState<Period>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const years = useMemo(() => yearsOf(tx, [new Date().getFullYear(), period.year]), [tx, period.year]);
  const hasData = useMemo(() => monthlyTotals(tx, period.year).map((m) => m.count > 0), [tx, period.year]);
  const inView = useMemo(() => tx.filter((t) => inPeriod(t, period)), [tx, period]);
  const prev = useMemo(() => totals(tx.filter((t) => inPeriod(t, prevPeriod(period)))), [tx, period]);

  const latest = useMemo(() => tx.reduce<string | null>((m, t) => (!m || t.date > m ? t.date : m), null), [tx]);

  function startEdit(t: Transaction) {
    setEditing(t);
    document.getElementById("form-giao-dich")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <>
      {!ready ? (
        <Skeleton />
      ) : (
        <>
          {hasSamples && (
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-light bg-accent-soft px-3.5 py-2.5 text-xs leading-snug font-medium text-fg-2">
              <span>📌 Dữ liệu mẫu. Thêm giao dịch mới để bắt đầu dùng thật.</span>
              <button type="button" onClick={clear}
                className="cursor-pointer whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-2 hover:bg-surface-alt">
                Xóa dữ liệu mẫu
              </button>
            </div>
          )}

          <PeriodPicker period={period} years={years} hasData={hasData} count={inView.length} onChange={setPeriod} />

          {inView.length === 0 && latest && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-fg-2">
              <span>Kỳ này chưa có giao dịch.</span>
              <button type="button" onClick={() => setPeriod(periodOf(latest))}
                className="cursor-pointer rounded-md border border-line bg-surface-alt px-3 py-1.5 text-xs font-semibold hover:bg-line-light">
                Chuyển đến tháng gần nhất có dữ liệu
              </button>
            </div>
          )}

          <SummaryCards transactions={inView} prev={prev} prevText={prevLabel(period)} />

          <MonthlyChart transactions={tx} year={period.year} selectedMonth={period.month}
            onSelect={(month) => setPeriod((p) => ({ ...p, month }))} />

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <BreakdownChart transactions={inView} type="expense" />
            <BreakdownChart transactions={inView} type="income" />
          </div>

          <BalanceTrend transactions={inView} />

          <MonthlyTable transactions={tx} year={period.year} selectedMonth={period.month}
            onSelect={(month) => setPeriod((p) => ({ ...p, month }))} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[340px_1fr]">
            <TxForm
              key={editing?.id ?? "new"}
              editing={editing}
              onAdd={(t) => { add(t); setPeriod(periodOf(t.date)); }}
              onUpdate={(t) => { update(t); setEditing(null); setPeriod(periodOf(t.date)); }}
              onCancel={() => setEditing(null)}
            />
            <TxHistory
              transactions={inView}
              editingId={editing?.id ?? null}
              onEdit={startEdit}
              onDelete={(id) => { remove(id); if (editing?.id === id) setEditing(null); }}
            />
          </div>

          <DataTools transactions={tx} hasSamples={hasSamples} onImport={addMany} onClear={() => { clear(); setEditing(null); }} />
        </>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="card h-[120px]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (<div key={i} className="card h-[104px]" />))}
      </div>
      <div className="card h-[300px]" />
    </div>
  );
}
