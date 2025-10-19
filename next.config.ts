import type { NextConfig } from "next";

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: replitDevDomain ? [replitDevDomain] : ["*.repl.co", "*.replit.dev", "*.replit.app"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.repl.co", "*.replit.dev", "*.replit.app"],
    },
  },
};

export default nextConfig;
