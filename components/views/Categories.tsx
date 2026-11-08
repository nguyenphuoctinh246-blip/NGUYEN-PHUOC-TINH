"use client";

import { useState } from "react";
import type { Category, TxType } from "@/lib/types";
import { CATEGORY_ICONS, catColor, catList, tint } from "@/lib/categories";
import { newId } from "@/lib/id";
import { useApp } from "../app/AppContext";
import Icon from "../Icon";
import { Button, Card, Field, Modal } from "../ui";

const COLORS = Array.from({ length: 12 }, (_, i) => i + 1);

function CategoryModal({ cat, type, onClose }: { cat: Category | null; type: TxType; onClose: () => void }) {
  const { s } = useApp();
  const [label, setLabel] = useState(cat?.label ?? "");
  const [icon, setIcon] = useState(cat?.icon ?? "📦");
  const [color, setColor] = useState(cat?.color ?? ((s.categories.length % 12) + 1));
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = label.trim();
    if (!name) return setErr("Vui lòng nhập tên danh mục");
    if (s.categories.some((c) => c.type === (cat?.type ?? type) && c.id !== cat?.id && c.label.toLowerCase() === name.toLowerCase())) return setErr("Đã có danh mục cùng tên");
    s.saveCategory({ id: cat?.id ?? "cat_" + newId(), label: name, icon: icon.trim() || "📦", type: cat?.type ?? type, color });
    onClose();
  }
  const kind = (cat?.type ?? type) === "income" ? "thu nhập" : "chi tiêu";
  return (
    <Modal title={cat ? `Sửa danh mục ${kind}` : `Thêm danh mục ${kind}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface-alt px-4 py-3">
          <span className="flex size-11 items-center justify-center rounded-xl text-2xl" style={{ background: tint(`var(--cat-${color})`, 20) }}>{icon || "📦"}</span>
          <div className="min-w-0"><div className="truncate text-[15px] font-bold">{label || "Tên danh mục"}</div><div className="text-xs text-muted">Xem trước</div></div>
        </div>
        <Field label="Tên danh mục" htmlFor="c-name"><input id="c-name" value={label} onChange={(e) => { setLabel(e.target.value); setErr(""); }} maxLength={40} placeholder="Ví dụ: Thú cưng" className="input-field" /></Field>
        <div>
          <span className="input-label">Biểu tượng</span>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-11" role="group" aria-label="Chọn biểu tượng">
            {CATEGORY_ICONS.map((i) => (
              <button key={i} type="button" aria-pressed={icon === i} aria-label={`Biểu tượng ${i}`} onClick={() => setIcon(i)}
                className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg border text-lg ${icon === i ? "border-accent bg-accent-soft" : "border-line-light bg-surface hover:bg-surface-alt"}`}>{i}</button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2"><label htmlFor="c-icon" className="text-xs text-muted">Hoặc nhập emoji khác</label><input id="c-icon" value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 4))} className="input-field !w-20 !py-1.5 text-center text-lg" /></div>
        </div>
        <div>
          <span className="input-label">Màu sắc</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn màu">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-pressed={color === c} aria-label={`Màu ${c}`} onClick={() => setColor(c)}
                className={`size-8 cursor-pointer rounded-full border-2 ${color === c ? "border-fg" : "border-transparent"}`} style={{ background: `var(--cat-${c})`, boxShadow: color === c ? "0 0 0 2px var(--surface) inset" : undefined }} />
            ))}
          </div>
        </div>
        {err && <p role="alert" className="text-xs font-medium text-expense">{err}</p>}
        <div className="flex justify-end gap-2 border-t border-line-light pt-3.5"><Button onClick={onClose}>Hủy</Button><Button variant="primary" type="submit">Lưu danh mục</Button></div>
      </form>
    </Modal>
  );
}

function DeleteModal({ cat, count, onClose }: { cat: Category; count: number; onClose: () => void }) {
  const { s } = useApp();
  const others = catList(cat.type).filter((c) => c.id !== cat.id);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const hasBudget = !!s.budgets[cat.id];
  return (
    <Modal title="Xóa danh mục" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[14px]">Xóa danh mục <b>{cat.icon} {cat.label}</b>?</p>
        {count > 0 ? (
          <Field label={`Chuyển ${count} giao dịch đang dùng danh mục này sang`} htmlFor="c-move">
            <select id="c-move" value={target} onChange={(e) => setTarget(e.target.value)} className="input-field">
              {others.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.label}</option>))}
            </select>
          </Field>
        ) : <p className="m-0 text-[13px] text-muted">Chưa có giao dịch nào dùng danh mục này.</p>}
        {hasBudget && <p className="m-0 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">Hạn mức ngân sách của danh mục này cũng sẽ bị xóa.</p>}
        <div className="flex justify-end gap-2 border-t border-line-light pt-3.5">
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="danger" disabled={!target} onClick={() => { s.removeCategory(cat.id, target); onClose(); }}>Xóa danh mục</Button>
        </div>
      </div>
    </Modal>
  );
}

function Column({ type, title, color }: { type: TxType; title: string; color: number }) {
  const { s } = useApp();
  const [edit, setEdit] = useState<{ cat: Category | null } | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const list = catList(type);
  const count = (id: string) => s.tx.filter((t) => t.category === id).length;

  return (
    <Card title={title} icon={type === "income" ? "up" : "down"} color={color} action={<Button variant="primary" className="!px-3 !py-1.5 text-xs" onClick={() => setEdit({ cat: null })}><Icon name="plus" className="size-3.5" />Thêm</Button>}>
      <ul className="-mx-2 flex flex-col">
        {list.map((c) => (
          <li key={c.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-alt">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: tint(catColor(c.id), 18) }}>{c.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{c.label}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted"><span className="size-2 rounded-full" style={{ background: catColor(c.id) }} />{count(c.id)} giao dịch{type === "expense" && s.budgets[c.id] ? " · có ngân sách" : ""}</span>
            </span>
            <button type="button" aria-label={`Sửa ${c.label}`} onClick={() => setEdit({ cat: c })} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-accent-soft hover:text-accent"><Icon name="edit" className="size-4" /></button>
            <button type="button" aria-label={`Xóa ${c.label}`} disabled={list.length <= 1} title={list.length <= 1 ? "Cần giữ ít nhất một danh mục" : "Xóa danh mục"} onClick={() => setDel(c)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted hover:bg-expense-soft hover:text-expense disabled:cursor-not-allowed disabled:opacity-35"><Icon name="trash" className="size-4" /></button>
          </li>
        ))}
      </ul>
      {edit && <CategoryModal cat={edit.cat} type={type} onClose={() => setEdit(null)} />}
      {del && <DeleteModal cat={del} count={count(del.id)} onClose={() => setDel(null)} />}
    </Card>
  );
}

export default function Categories() {
  const { s } = useApp();
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] text-muted">Tạo, đổi tên, đổi biểu tượng và màu cho mọi danh mục. Thay đổi áp dụng ngay cho giao dịch, ngân sách và báo cáo.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Column type="expense" title="Danh mục chi tiêu" color={8} />
        <Column type="income" title="Danh mục thu nhập" color={3} />
      </div>
      <div><Button onClick={s.restoreDefaultCategories}>Khôi phục danh mục mặc định đã xóa</Button></div>
    </div>
  );
}
