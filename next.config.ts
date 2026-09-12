import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir o dev server por 127.0.0.1 além de localhost (Next 16 bloqueia HMR cross-origin por padrão).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
