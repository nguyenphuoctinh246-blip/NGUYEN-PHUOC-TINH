import type { NextConfig } from "next";

// Vercel / Netlify / Node server: chạy mặc định, không cần biến môi trường.
// GitHub Pages / hosting tĩnh: đặt STATIC_EXPORT=1 (và BASE_PATH=/ten-repo nếu cần).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dấu phiên bản hiển thị trong mục Đồng bộ để biết Vercel đã chạy bản mới nhất chưa
  env: {
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
  ...(isStatic && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  ...(basePath && { basePath }),
};

export default nextConfig;
