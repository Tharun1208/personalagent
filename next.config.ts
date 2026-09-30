import type { NextConfig } from "next";
import os from "os";

// Collect all local network IPv4 addresses so Next.js dev server
// accepts cross-origin requests from any device on the same network.
function getLocalIPs(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

const localIPs = getLocalIPs();

// Build allowed origins: localhost variants + every LAN IP on common ports
const allowedOrigins: string[] = [
  "localhost",
  "127.0.0.1",
  ...localIPs,
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Allow the dev server to accept requests coming from any local IP
  // (needed when accessing from physical Android device / emulator / tunnel)
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
