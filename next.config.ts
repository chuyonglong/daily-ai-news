import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.9.31", "127.0.0.1"],
  output: "standalone",
};

export default nextConfig;
