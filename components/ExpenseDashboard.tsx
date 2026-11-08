"use client";

import { useTransactions } from "@/hooks/useTransactions";
import SummaryCards from "./SummaryCards";
import BalanceTrend from "./BalanceTrend";
import MonthlyChart from "./MonthlyChart";
import BreakdownChart from "./BreakdownChart";
import TxForm from "./TxForm";
import TxHistory from "./TxHistory";

export default function ExpenseDashboard() {
  const { tx, ready, hasSamples, add, remove, clear } = useTransactions();

  return (
    <>
      <header className="mb-[18px] flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-0.5 text-[22px] leading-[1.2] font-extrabold tracking-[-0.02em]">Quản Lý Chi Tiêu</h1>
          <p className="m-0 text-[13px] text-muted">Theo dõi thu chi cá nhân hàng ngày</p>
        </div>
        {hasSamples && (
          <button
            type="button"
            onClick={clear}
            className="cursor-pointer whitespace-nowrap rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-fg-2 transition-colors hover:bg-surface-alt"
          >
            Xóa mẫu
          </button>
        )}
      </header>

      {!ready ? (
        <Skeleton />
      ) : (
        <>
          {hasSamples && (
            <div className="mb-3.5 rounded-lg border border-line-light bg-accent-soft px-3.5 py-2.5 text-xs leading-snug font-medium text-fg-2">
              📌 Dữ liệu mẫu — thêm giao dịch mới để bắt đầu sử dụng thật.
            </div>
          )}

          <SummaryCards transactions={tx} />
          <BalanceTrend transactions={tx} />

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <MonthlyChart transactions={tx} />
            <BreakdownChart transactions={tx} type="expense" />
          </div>

          <div className="mb-5">
            <BreakdownChart transactions={tx} type="income" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[340px_1fr]">
            <TxForm onAdd={add} />
            <TxHistory transactions={tx} onDelete={remove} />
          </div>
        </>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Đang tải">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[104px]" />
        ))}
      </div>
      <div className="card h-[150px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card h-[260px]" />
        <div className="card h-[260px]" />
      </div>
    </div>
  );
}
