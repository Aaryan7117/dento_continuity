import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sherpa-onnx-node is a native binding loaded at runtime only where a model exists.
  serverExternalPackages: ["@prisma/client", "pg", "sherpa-onnx-node"],
};

export default nextConfig;
