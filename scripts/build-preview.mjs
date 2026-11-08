// Builds a single self-contained dist/index.html (inline CSS + JS) from the same
// components the Next.js app uses. Handy for quick static hosting / sharing.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

mkdirSync("dist", { recursive: true });

const js = await build({
  entryPoints: ["preview/main.tsx"],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
  alias: { "next/link": resolve("preview/link-shim.tsx"), "@supabase/supabase-js": resolve("preview/supabase-stub.ts") },
});

execFileSync("npx", ["@tailwindcss/cli", "-i", "app/globals.css", "-o", "dist/styles.css", "--minify"], { stdio: "inherit" });

const css = readFileSync("dist/styles.css", "utf8");
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="vi" suppressHydrationWarning>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Quản Lý Chi Tiêu</title>
<meta name="description" content="Theo dõi thu chi cá nhân hàng ngày">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>:root{--font-be-vietnam:'Be Vietnam Pro';--font-jetbrains:'JetBrains Mono'}</style>
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${code}</script>
</body>
</html>`;

writeFileSync("dist/index.html", html);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB");
