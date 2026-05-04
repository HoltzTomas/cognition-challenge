import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["unpermissible-zachery-promycelial.ngrok-free.dev"],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
