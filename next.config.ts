import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Linting isn't set up yet; don't let a missing ESLint install fail the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
