"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

type Theme = "light" | "dark";

export default function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === "dark" || (!set && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={`flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-colors ${onDark ? "border-side-line bg-white/8 text-side-fg hover:bg-white/15" : "border-line bg-surface text-fg-2 hover:bg-surface-alt"}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="size-[18px]" />
    </button>
  );
}
