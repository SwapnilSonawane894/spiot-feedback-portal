import type { NextConfig } from "next";

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;

const getNextAuthUrl = () => {
  if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim() !== "") {
    return process.env.NEXTAUTH_URL;
  }
  if (replitDevDomain) {
    return `https://${replitDevDomain}`;
  }
  return "https://771ca17c-b5c4-45b1-9da6-e251ac4b9e9e-00-21v72j2xwgq2z.pike.replit.dev";
};

const getNextAuthSecret = () => {
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim() !== "") {
    return process.env.NEXTAUTH_SECRET;
  }
  return "4M6PmUDdOTgSuDLaE1+9fAxJFnD0Jbxgklph8RqzheA=";
};

process.env.NEXTAUTH_URL = getNextAuthUrl();
process.env.NEXTAUTH_SECRET = getNextAuthSecret();

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
