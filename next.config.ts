import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === "production" ? "/Claw3D" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/Claw3D/" : "",
};

export default nextConfig;
