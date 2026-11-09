"use client";

import { useMemo, useState } from "react";
import { catColor, catInfo, catList, tint } from "@/lib/categories";
import { fmt, fmtDateFull } from "@/lib/format";
import { periodLabel } from "@/lib/period";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Empty, Pill } from "../ui";

type Sort = "new" | "old" | "high" | "low";
const PAGE = 25;

export default function Transactions() {
  const { s, period, inView, openTx, cloud } = useApp();
  const [who, setWho] = useState("all");
  const showAuthor = cloud.people.length > 1;
  const isMember = cloud.workspace?.role === "member";
  /** Tài khoản con chỉ sửa/xóa được giao dịch do chính mình nhập */
  const canEdit = (t: { createdBy?: string }) => !isMember || !t.createdBy || t.createdBy === cloud.user?.id;
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [cat, setCat] = useState("all");
  const [acc, setAcc] = useState("all");
  const [sort, setSort] = useState<Sort>("new");
  const [scope, setScope] = useState<"period" | "all">("period");
  const [limit, setLimit] = useState(PAGE);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const accName = (id: string) => s.accounts.find((a) => a.id === id)?.name ?? id;
  const source = scope === "period" ? inView : s.tx;

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return source
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => cat === "all" || t.category === cat)
      .filter((t) => acc === "all" || t.account === acc)
      .filter((t) => who === "all" || (t.createdBy ?? cloud.user?.id) === who)
      .filter((t) => !k || `${catInfo(t.category).label} ${t.note} ${t.payee} ${t.tags.join(" ")}`.toLowerCase().includes(k))
      .sort((a, b) => sort === "high" ? b.amount - a.amount : sort === "low" ? a.amount - b.amount : sort === "old" ? a.date.localeCompare(b.date) || (a.id > b.id ? 1 : -1) : b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
  }, [source, q, type, cat, acc, sort, who, cloud.user?.id]);

  const inc = rows.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const exp = rows.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const filtersOn = q || type !== "all" || cat !== "all" || acc !== "all" || who !== "all";

  const sel = "input-field !w-auto !py-2 text-[13px]";
  return (
    <div className="flex flex-col gap-4">
      <div className="card px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Tìm giao dịch" placeholder="Tìm theo nơi chi, ghi chú, danh mục, nhãn…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} className="input-field !py-2 !pl-9 text-[13px]" />
          </div>
          <select aria-label="Loại" className={sel} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="all">Thu và chi</option><option value="income">Chỉ thu nhập</option><option value="expense">Chỉ chi tiêu</option>
          </select>
          <select aria-label="Danh mục" className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">Mọi danh mục</option>
            <optgroup label="Chi tiêu">{catList("expense").map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.label}</option>))}</optgroup>
            <optgroup label="Thu nhập">{catList("income").map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.label}</option>))}</optgroup>
          </select>
          {showAuthor && (
            <select aria-label="Người nhập" className={sel} value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="all">Mọi người nhập</option>
              {cloud.people.map((p) => (<option key={p.id} value={p.id}>{p.id === cloud.user?.id ? "Bạn" : p.name}</option>))}
            </select>
          )}
          <select aria-label="Tài khoản" className={sel} value={acc} onChange={(e) => setAcc(e.target.value)}>
            <option value="all">Mọi tài khoản</option>
            {s.accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
          </select>
          <select aria-label="Sắp xếp" className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">Mới nhất</option><option value="old">Cũ nhất</option><option value="high">Số tiền cao → thấp</option><option value="low">Số tiền thấp → cao</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <div className="flex gap-1 rounded-lg bg-surface-alt p-[3px]" role="group" aria-label="Phạm vi">
            <button type="button" aria-pressed={scope === "period"} onClick={() => setScope("period")} className={`cursor-pointer rounded-md border-none px-3 py-1 text-xs font-semibold ${scope === "period" ? "bg-surface shadow-card" : "bg-transparent text-muted"}`}>{periodLabel(period)}</button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")} className={`cursor-pointer rounded-md border-none px-3 py-1 text-xs font-semibold ${scope === "all" ? "bg-surface shadow-card" : "bg-transparent text-muted"}`}>Mọi thời gian</button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="font-sans text-muted">{rows.length} giao dịch</span>
            <span className="text-income">+{fmt(inc)}</span><span className="text-expense">-{fmt(exp)}</span>
            <span className={`font-semibold ${inc - exp >= 0 ? "text-income" : "text-expense"}`}>= {inc - exp >= 0 ? "+" : "-"}{fmt(Math.abs(inc - exp))}</span>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden" aria-label="Danh sách giao dịch">
        <div className="hidden grid-cols-[96px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_130px_44px] gap-3 border-b border-line-light bg-surface-alt px-4 py-2.5 text-[11px] font-semibold tracking-[0.05em] text-muted uppercase md:grid">
          <span>Ngày</span><span>Nơi chi / nguồn thu</span><span>Danh mục</span><span>Tài khoản</span><span className="text-right">Số tiền</span><span />
        </div>
        {rows.length === 0 ? (
          <Empty icon="🔍" title={filtersOn ? "Không có giao dịch phù hợp bộ lọc" : "Chưa có giao dịch"} hint={filtersOn ? "Thử bỏ bớt bộ lọc hoặc chọn Mọi thời gian." : "Bấm Thêm giao dịch để ghi khoản thu chi đầu tiên."}
            action={!filtersOn && <Button variant="primary" onClick={() => openTx(null)}>Thêm giao dịch</Button>} />
        ) : (
          <ul>
            {rows.slice(0, limit).map((t) => {
              const info = catInfo(t.category);
              const inc = t.type === "income";
              return (
                <li key={t.id} className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-line-light px-4 py-3 last:border-b-0 hover:bg-surface-alt md:grid-cols-[96px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_130px_44px]"
                  onClick={() => { if (canEdit(t)) openTx(t); }}>
                  <span className="flex size-9 items-center justify-center rounded-[10px] text-base md:hidden" style={{ background: tint(catColor(t.category)) }}>{info.icon}</span>
                  <span className="hidden text-[13px] text-fg-2 md:block">{fmtDateFull(t.date)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{t.payee || info.label}</span>
                    <span className="block truncate text-[12px] text-muted">
                      <span className="md:hidden">{fmtDateFull(t.date)} · {info.label} · {accName(t.account)}{t.note ? " · " : ""}</span>{t.note}
                    </span>
                    {(t.tags.length > 0 || showAuthor) && <span className="mt-1 flex flex-wrap gap-1">{showAuthor && <Pill tone="income">👤 {cloud.authorName(t.createdBy)}</Pill>}{t.tags.map((g) => (<Pill key={g} tone="muted">#{g}</Pill>))}</span>}
                  </span>
                  <span className="hidden min-w-0 items-center gap-2 text-[13px] md:flex"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ background: tint(catColor(t.category)) }}>{info.icon}</span><span className="truncate">{info.label}</span></span>
                  <span className="hidden truncate text-[13px] text-fg-2 md:block">{accName(t.account)}</span>
                  <span className={`text-right font-mono text-[13px] font-semibold ${inc ? "text-income" : "text-expense"}`}>{(inc ? "+" : "-") + fmt(t.amount)}</span>
                  <span className="hidden justify-end md:flex" onClick={(e) => e.stopPropagation()}>
                    {!canEdit(t) ? null : confirmId === t.id
                      ? <button type="button" onClick={() => { s.removeTx(t.id); setConfirmId(null); }} onPointerLeave={() => setConfirmId(null)} className="animate-pop cursor-pointer rounded-md border-none bg-expense px-2 py-1 text-[11px] font-semibold text-white">Xóa?</button>
                      : <button type="button" aria-label="Xóa giao dịch" onClick={() => setConfirmId(t.id)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-expense-soft hover:text-expense"><Icon name="trash" className="size-4" /></button>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {rows.length > limit && (
          <div className="border-t border-line-light p-3 text-center"><Button onClick={() => setLimit((l) => l + PAGE)}>Xem thêm {Math.min(PAGE, rows.length - limit)} giao dịch</Button></div>
        )}
      </section>
    </div>
  );
}
