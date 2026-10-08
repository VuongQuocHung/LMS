import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Giữ /api cùng origin để cookie session hoạt động, không phải mở CORS.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";
    return [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
