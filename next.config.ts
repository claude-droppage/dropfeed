import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.0.108',
    'localhost',
  ],
  images: {
    // Kreacje hostowane na Cloudflare R2 (publiczny bucket pub-*.r2.dev).
    // next/image optymalizuje je w locie (resize do rozmiaru wyświetlania + webp).
    remotePatterns: [{ protocol: 'https', hostname: '**.r2.dev' }],
  },
};

export default nextConfig;
