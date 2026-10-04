import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mengaktifkan API forbidden() / unauthorized() (Next.js 16).
    authInterrupts: true,
  },
};

export default nextConfig;
