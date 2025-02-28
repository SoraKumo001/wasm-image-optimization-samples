import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // config.module.rules.push({
      //   test: /\.wasm$/,
      //   loader: "next-barrel-loader",
      // });
      config.experiments.syncWebAssembly = true;
    }
    return config;
  },
};

export default nextConfig;
