import "@zenthor-assist/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  devIndicators: {
    position: "top-right",
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
