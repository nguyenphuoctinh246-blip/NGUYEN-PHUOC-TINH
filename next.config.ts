import type { NextConfig } from "next";

// Vercel / Netlify / Node server: chạy mặc định, không cần biến môi trường.
// GitHub Pages / hosting tĩnh: đặt STATIC_EXPORT=1 (và BASE_PATH=/ten-repo nếu cần).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStatic && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  ...(basePath && { basePath }),
};

export default nextConfig;
