import type { NextConfig } from "next";

// Keep NEXTAUTH_URL and NEXTAUTH_SECRET provided by the environment where the app runs.
// Do not hardcode provider-specific defaults here - supply them in your deployment.

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
