/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./generated/prisma/**/*",
      "./node_modules/.prisma/**/*",
      "./node_modules/@prisma/client/**/*",
      "./prisma/schema.prisma",
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
};

export default config;
