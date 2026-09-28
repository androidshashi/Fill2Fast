import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The extension at the repo root has its own lockfile; keep this app self-contained.
  turbopack: { root: __dirname },
};

export default nextConfig;
