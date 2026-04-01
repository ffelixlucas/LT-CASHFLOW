import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ltcashflow/db", "@ltcashflow/validation"],
};

export default nextConfig;
