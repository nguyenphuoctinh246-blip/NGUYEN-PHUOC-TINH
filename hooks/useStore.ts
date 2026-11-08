"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Account, Category, Goal, Store, Transaction } from "@/lib/types";
import { DEFAULT_CATEGORIES, setCategories } from "@/lib/categories";
import { DEFAULT_ACCOUNTS } from "@/lib/accounts";
import { loadStore, sampleStore, saveStore } from "@/lib/storage";
import { applyChange } from "@/lib/cloud/apply";
import type { RemoteChange } from "@/lib/cloud/engine";

const EMPTY: Store = { tx: [], accounts: DEFAULT_ACCOUNTS, budgets: {}, goals: [], categories: DEFAULT_CATEGORIES };

/**
 * Toàn bộ dữ liệu ứng dụng, lưu trong localStorage.
 * Nạp sau khi trang hiển thị để HTML của server và trình duyệt khớp nhau.
 */
export function useStore() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  // ref là nguồn sự thật, cập nhật đồng bộ; state chỉ phản chiếu để giao diện vẽ lại.
  // Nhờ vậy engine đồng bộ luôn đọc được dữ liệu mới nhất ngay sau khi thay thế.
  const ref = useRef(store);
  const commit = useCallback((fn: (s: Store) => Store) => {
    const next = fn(ref.current);
    ref.current = next;
    setStore(next);
  }, []);
  // Đồng bộ danh mục cho các hàm tra cứu catInfo/catColor (idempotent, an toàn khi render lại)
  setCategories(store.categories);

  useEffect(() => {
    commit(() => loadStore());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  const hasSamples = store.tx.some((t) => t.isSample) || store.goals.some((g) => g.isSample);

  const dropSamples = (s: Store): Store => ({
    ...s,
    tx: s.tx.filter((t) => !t.isSample),
    goals: s.goals.filter((g) => !g.isSample),
  });

  const addTx = useCallback((t: Transaction) => commit((s) => ({ ...dropSamples(s), tx: [...dropSamples(s).tx, t] })), []);
  const addManyTx = useCallback((items: Transaction[]) => commit((s) => ({ ...dropSamples(s), tx: [...dropSamples(s).tx, ...items] })), []);
  const updateTx = useCallback((t: Transaction) => commit((s) => ({ ...s, tx: s.tx.map((p) => (p.id === t.id ? { ...t, isSample: undefined } : p)) })), []);
  const removeTx = useCallback((id: string) => commit((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== id) })), []);

  const setBudget = useCallback((cat: string, amount: number) => commit((s) => {
    const budgets = { ...s.budgets };
    if (amount > 0) budgets[cat] = amount;
    else delete budgets[cat];
    return { ...s, budgets };
  }), []);

  const saveAccount = useCallback((a: Account) => commit((s) => ({
    ...s,
    accounts: s.accounts.some((x) => x.id === a.id) ? s.accounts.map((x) => (x.id === a.id ? a : x)) : [...s.accounts, a],
  })), []);
  const removeAccount = useCallback((id: string) => commit((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) })), []);

  const saveGoal = useCallback((g: Goal) => commit((s) => ({
    ...s,
    goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? { ...g, isSample: undefined } : x)) : [...s.goals, g],
  })), []);
  const removeGoal = useCallback((id: string) => commit((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })), []);

  const saveCategory = useCallback((c: Category) => commit((s) => ({
    ...s,
    categories: s.categories.some((x) => x.id === c.id) ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c],
  })), []);

  /** Xóa danh mục: chuyển các giao dịch đang dùng sang `moveTo`, bỏ ngân sách của danh mục cũ */
  const removeCategory = useCallback((id: string, moveTo: string) => commit((s) => {
    const budgets = { ...s.budgets };
    delete budgets[id];
    return { ...s, budgets, categories: s.categories.filter((c) => c.id !== id), tx: s.tx.map((t) => (t.category === id ? { ...t, category: moveTo } : t)) };
  }), []);

  /** Thêm lại các danh mục mặc định đã bị xóa, giữ nguyên danh mục hiện có */
  const restoreDefaultCategories = useCallback(() => commit((s) => ({
    ...s,
    categories: [...s.categories, ...DEFAULT_CATEGORIES.filter((d) => !s.categories.some((c) => c.id === d.id))],
  })), []);

  const clearSamples = useCallback(() => commit((s) => dropSamples(s)), []);
  const clearAll = useCallback(() => commit((s) => ({ ...s, tx: [], goals: [] })), []);
  const restoreSamples = useCallback(() => commit(() => sampleStore()), [commit]);

  // Dành cho đồng bộ đám mây
  const getStore = useCallback(() => ref.current, []);
  const replaceAll = useCallback((s: Store) => commit(() => s), [commit]);
  const applyRemote = useCallback((c: RemoteChange) => commit((s) => applyChange(s, c)), [commit]);
  const resetLocal = useCallback(() => commit(() => sampleStore()), [commit]);

  return { ...store, ready, getStore, replaceAll, applyRemote, resetLocal, hasSamples, addTx, addManyTx, updateTx, removeTx, setBudget, saveAccount, removeAccount, saveGoal, removeGoal, saveCategory, removeCategory, restoreDefaultCategories, clearSamples, clearAll, restoreSamples };
}

export type StoreApi = ReturnType<typeof useStore>;
