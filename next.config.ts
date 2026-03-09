import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/generated/prisma/**/*"],
    "/": ["./src/generated/prisma/**/*"],
  },
  serverExternalPackages: ["@sparticuz/chromium"],
};

export default nextConfig;
