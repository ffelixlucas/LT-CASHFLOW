import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ltcashflow/db", "@ltcashflow/validation"],
};

export default nextConfig;
