import type { Transaction, TxType } from "./types";
import { CATEGORIES } from "./categories";
import { newId } from "./id";

const HEAD = ["Ngày", "Loại", "Danh mục", "Số tiền", "Ghi chú"];
const TYPE_LABEL: Record<TxType, string> = { income: "Thu nhập", expense: "Chi tiêu" };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const esc = (s: string) => (/[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const labelOf = (t: Transaction) => CATEGORIES[t.type].find((c) => c.id === t.category)?.label ?? t.category;

/** CSV mở được trực tiếp bằng Excel (có BOM UTF-8, dấu phân cách ;) */
export function toCsv(tx: Transaction[]): string {
  const rows = [...tx]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, TYPE_LABEL[t.type], labelOf(t), String(t.amount), t.note].map(esc).join(";"));
  return "﻿" + [HEAD.join(";"), ...rows].join("\r\n");
}

function splitRecords(text: string, delim: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) out.push(row);
  return out;
}

function parseDate(s: string): string | null {
  const v = s.trim();
  if (DATE_RE.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function findCategory(type: TxType, raw: string): string {
  const key = raw.trim().toLowerCase();
  const hit = CATEGORIES[type].find((c) => c.label.toLowerCase() === key || c.id === key);
  return hit ? hit.id : type === "income" ? "thu_khac" : "chi_khac";
}

export interface ImportResult { items: Transaction[]; skipped: number }

export function parseCsv(text: string): ImportResult {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const records = splitRecords(clean, delim);
  const body = records[0]?.[0]?.trim().toLowerCase() === "ngày" ? records.slice(1) : records;
  const items: Transaction[] = [];
  let skipped = 0;
  for (const r of body) {
    const date = parseDate(r[0] ?? "");
    const typeRaw = (r[1] ?? "").trim().toLowerCase();
    const type: TxType | null = /^(thu|income)/.test(typeRaw) ? "income" : /^(chi|expense)/.test(typeRaw) ? "expense" : null;
    const amount = parseInt((r[3] ?? "").replace(/[^\d]/g, ""), 10);
    if (!date || !type || !amount || amount < 1) { skipped++; continue; }
    items.push({ id: newId(), type, amount, category: findCategory(type, r[2] ?? ""), date, note: (r[4] ?? "").trim() });
  }
  return { items, skipped };
}

export function parseJson(text: string): ImportResult {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) throw new Error("File không đúng định dạng");
  const items: Transaction[] = [];
  let skipped = 0;
  for (const r of data as Record<string, unknown>[]) {
    const type = r?.type;
    const amount = Number(r?.amount);
    const date = typeof r?.date === "string" ? r.date : "";
    if ((type !== "income" && type !== "expense") || !(amount >= 1) || !DATE_RE.test(date)) { skipped++; continue; }
    items.push({
      id: newId(),
      type,
      amount: Math.round(amount),
      category: typeof r.category === "string" ? r.category : type === "income" ? "thu_khac" : "chi_khac",
      date,
      note: typeof r.note === "string" ? r.note : "",
    });
  }
  return { items, skipped };
}
