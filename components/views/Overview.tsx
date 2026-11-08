"use client";

import { accountBalance } from "@/lib/accounts";
import { budgetRows, statusTone } from "@/lib/budget";
import { catInfo } from "@/lib/categories";
import { fmt, fmtDate, fmtK, pctChange } from "@/lib/format";
import { prevLabel, totals } from "@/lib/period";
import { insights } from "@/lib/stats";
import { useApp } from "../app/AppContext";
import BalanceTrend from "../BalanceTrend";
import BreakdownChart from "../BreakdownChart";
import MonthlyChart from "../MonthlyChart";
import { Button, Card, Empty, Pill, Progress } from "../ui";

function Delta({ value, goodWhenUp, label }: { value: number | null; goodWhenUp: boolean; label: string }) {
  if (value === null) return <span className="text-[11px] text-muted">Chưa có dữ liệu {label}</span>;
  const good = value === 0 ? null : value > 0 === goodWhenUp;
  return (
    <span className={`text-[11px] font-semibold ${good === null ? "text-muted" : good ? "text-income" : "text-expense"}`}>
      {value > 0 ? "▲" : value < 0 ? "▼" : "•"} {Math.abs(value)}% so với {label}
    </span>
  );
}

function Kpi({ label, value, tone, children }: { label: string; value: string; tone?: string; children?: React.ReactNode }) {
  return (
    <div className="card min-w-0 px-4 py-4">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{label}</div>
      <div className={`mt-1.5 font-mono text-[17px] leading-tight font-bold whitespace-nowrap sm:text-[22px] ${tone ?? ""}`}>{value}</div>
      <div className="mt-1.5 min-h-4">{children}</div>
    </div>
  );
}

export default function Overview() {
  const { s, period, setPeriod, inView, prev, go, openTx } = useApp();
  const t = totals(inView);
  const ins = insights(inView, period);
  const netWorth = s.accounts.reduce((a, x) => a + accountBalance(x, s.tx), 0);
  const pl = prevLabel(period);
  const budgets = budgetRows(s.budgets, inView, period.month ? 1 : 12).filter((r) => r.status !== "none").slice(0, 5);
  const over = budgetRows(s.budgets, inView, period.month ? 1 : 12).filter((r) => r.status === "over");
  const recent = [...inView].sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1)).slice(0, 6);
  const latest = s.tx.reduce<string | null>((m, x) => (!m || x.date > m ? x.date : m), null);

  return (
    <div className="flex flex-col gap-4">
      {inView.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-fg-2">
          <span>Kỳ này chưa có giao dịch.</span>
          <span className="flex gap-2">
            {latest && <Button className="!py-1.5 text-xs" onClick={() => setPeriod({ year: +latest.slice(0, 4), month: +latest.slice(5, 7) })}>Tới tháng gần nhất có dữ liệu</Button>}
            <Button variant="primary" className="!py-1.5 text-xs" onClick={() => openTx(null)}>Thêm giao dịch</Button>
          </span>
        </div>
      )}

      {over.length > 0 && (
        <button type="button" onClick={() => go("ngan-sach")} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-light bg-expense-soft px-4 py-3 text-left text-[13px] font-medium text-expense">
          ⚠️ {over.length} danh mục đã vượt ngân sách: {over.map((r) => catInfo(r.cat).label).join(", ")}. Bấm để xem chi tiết.
        </button>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chỉ số chính">
        <Kpi label="Tổng tài sản" value={fmt(netWorth) + "đ"} tone={netWorth < 0 ? "text-expense" : ""}>
          <span className="text-[11px] text-muted">{s.accounts.length} tài khoản</span>
        </Kpi>
        <Kpi label="Thu nhập" value={"+" + fmt(t.inc)} tone="text-income"><Delta value={pctChange(t.inc, prev.inc)} goodWhenUp label={pl} /></Kpi>
        <Kpi label="Chi tiêu" value={"-" + fmt(t.exp)} tone="text-expense"><Delta value={pctChange(t.exp, prev.exp)} goodWhenUp={false} label={pl} /></Kpi>
        <Kpi label="Tiết kiệm trong kỳ" value={(t.bal >= 0 ? "+" : "-") + fmt(Math.abs(t.bal))} tone={t.bal >= 0 ? "text-income" : "text-expense"}>
          <span className="text-[11px] text-muted">{ins.savingsRate === null ? "Chưa có thu nhập" : `Tỷ lệ tiết kiệm ${ins.savingsRate}%`}</span>
        </Kpi>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MonthlyChart transactions={s.tx} year={period.year} selectedMonth={period.month} onSelect={(month) => setPeriod({ ...period, month })} />
        <Card title="Ngân sách" action={<Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => go("ngan-sach")}>Xem tất cả</Button>}>
          {budgets.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Chưa đặt hạn mức cho danh mục nào.</p> : (
            <ul className="flex flex-col gap-3.5">
              {budgets.map((r) => (
                <li key={r.cat}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium">{catInfo(r.cat).icon} {catInfo(r.cat).label}</span>
                    <span className="shrink-0 font-mono text-xs text-fg-2">{fmtK(r.spent)} / {fmtK(r.limit)}</span>
                  </div>
                  <Progress pct={r.pct} tone={statusTone(r.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownChart transactions={inView} type="expense" />
        <Card title="Điểm nhấn của kỳ">
          {inView.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Chưa có dữ liệu để phân tích.</p> : (
            <dl className="flex flex-col divide-y divide-line-light text-[13px]">
              <Row k="Tỷ lệ tiết kiệm" v={ins.savingsRate === null ? "–" : `${ins.savingsRate}%`} pill={ins.savingsRate === null ? undefined : ins.savingsRate >= 20 ? <Pill tone="income">Tốt</Pill> : ins.savingsRate >= 0 ? <Pill tone="warn">Cần cải thiện</Pill> : <Pill tone="expense">Chi vượt thu</Pill>} />
              <Row k="Chi tiêu trung bình mỗi ngày" v={fmt(Math.round(ins.avgDaily)) + "đ"} />
              {ins.forecast !== null && <Row k="Dự báo chi cả tháng này" v={fmt(Math.round(ins.forecast)) + "đ"} />}
              {ins.topCategory && <Row k="Chi nhiều nhất" v={`${ins.topCategory.icon} ${ins.topCategory.label}`} sub={`${fmt(ins.topCategory.amount)}đ · ${ins.topCategory.pct.toFixed(0)}% tổng chi`} />}
              {ins.biggest && <Row k="Khoản chi lớn nhất" v={fmt(ins.biggest.amount) + "đ"} sub={`${ins.biggest.payee || catInfo(ins.biggest.category).label} · ${fmtDate(ins.biggest.date)}`} />}
            </dl>
          )}
        </Card>
      </div>

      <BalanceTrend transactions={inView} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Giao dịch gần đây" action={<Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => go("giao-dich")}>Xem tất cả</Button>}>
          {recent.length === 0 ? <Empty icon="🧾" title="Chưa có giao dịch trong kỳ này" /> : (
            <ul className="-mx-2 flex flex-col">
              {recent.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => openTx(x)} className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-2 py-2.5 text-left hover:bg-surface-alt">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] text-base ${x.type === "income" ? "bg-income-soft" : "bg-expense-soft"}`}>{catInfo(x.category).icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{x.payee || catInfo(x.category).label}</span>
                      <span className="block truncate text-[11px] text-muted">{fmtDate(x.date)} · {catInfo(x.category).label}{x.note ? ` · ${x.note}` : ""}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-[13px] font-semibold ${x.type === "income" ? "text-income" : "text-expense"}`}>{(x.type === "income" ? "+" : "-") + fmt(x.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Mục tiêu tiết kiệm" action={<Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => go("muc-tieu")}>Xem tất cả</Button>}>
          {s.goals.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Chưa có mục tiêu nào.</p> : (
            <ul className="flex flex-col gap-4">
              {s.goals.slice(0, 3).map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex justify-between gap-2 text-[13px]"><span className="truncate font-medium">{g.name}</span><span className="shrink-0 font-mono text-xs text-fg-2">{Math.round((g.saved / g.target) * 100)}%</span></div>
                  <Progress pct={(g.saved / g.target) * 100} tone="income" />
                  <div className="mt-1 text-[11px] text-muted">{fmtK(g.saved)} / {fmtK(g.target)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v, sub, pill }: { k: string; v: string; sub?: string; pill?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-fg-2">{k}</dt>
      <dd className="m-0 text-right"><span className="font-mono font-semibold">{v}</span> {pill}{sub && <div className="text-[11px] text-muted">{sub}</div>}</dd>
    </div>
  );
}
